import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateTestRequest {
  chapterId: string;
  title?: string;
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId, title, numQuestions = 10, difficulty = 'medium', questionTypes = ['mcq', 'short_answer'] } = await req.json() as GenerateTestRequest;
    
    if (!chapterId) {
      return new Response(JSON.stringify({ error: 'Chapter ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for API keys - priority: Hugging Face > Gemini > Lovable
    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!HUGGINGFACE_API_KEY && !GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('No AI provider configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Fetch chapter details with subject info
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('*, subjects(id, name, board, class_level)')
      .eq('id', chapterId)
      .single();

    if (chapterError || !chapter) {
      return new Response(JSON.stringify({ error: 'Chapter not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch training documents for this chapter
    const { data: trainingDocs } = await supabase
      .from('ai_training_documents')
      .select('title, content, parsed_content')
      .eq('is_active', true)
      .eq('training_status', 'completed')
      .or(`chapter_id.eq.${chapterId},and(chapter_id.is.null,class_level.eq.${chapter.subjects.class_level})`)
      .limit(5);

    // Fetch chapter documents
    const { data: chapterDocs } = await supabase
      .from('chapter_documents')
      .select('file_name, file_url')
      .eq('chapter_id', chapterId)
      .limit(3);

    // Build content from available sources
    let content = `**Chapter:** ${chapter.name}\n**Subject:** ${chapter.subjects.name}\n**Class:** ${chapter.subjects.class_level}\n\n`;
    
    if (chapter.syllabus_content) {
      content += `**Syllabus:**\n${chapter.syllabus_content}\n\n`;
    }

    if (chapter.description) {
      content += `**Description:**\n${chapter.description}\n\n`;
    }

    if (trainingDocs && trainingDocs.length > 0) {
      content += `**Training Materials:**\n`;
      trainingDocs.forEach(doc => {
        const docContent = doc.parsed_content || doc.content || '';
        content += `\n${doc.title}:\n${docContent.substring(0, 2000)}\n`;
      });
    }

    if (chapterDocs && chapterDocs.length > 0) {
      content += `\n**Available Resources:** ${chapterDocs.map(d => d.file_name).join(', ')}\n`;
    }

    // Check if there's enough content
    if (content.length < 200) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient content available for this chapter. Please upload training materials first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const testTitle = title || `${chapter.name} - Practice Test`;

    const prompt = `You are an expert test generator for Indian education boards (${chapter.subjects.board.toUpperCase()}).

Generate exactly ${numQuestions} high-quality exam questions for Class ${chapter.subjects.class_level} students based on the content below.

**Content:**
${content.substring(0, 4000)}

**Requirements:**
- Difficulty: ${difficulty}
- Question types: ${questionTypes.join(', ')}
- Subject: ${chapter.subjects.name}
- Chapter: ${chapter.name}
- Make questions exam-ready and aligned with ${chapter.subjects.board.toUpperCase()} standards
- For MCQ: provide exactly 4 options (A, B, C, D)
- Include clear explanations for each answer

**Output Format (STRICTLY JSON):**
{
  "questions": [
    {
      "question_text": "Question here",
      "question_type": "mcq" | "true_false" | "short_answer",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "The answer",
      "explanation": "Why this is correct",
      "points": 1-5
    }
  ]
}

Return ONLY the JSON, no other text.`;

    let questionsData: any;
    let providerUsed = '';

    // Try Hugging Face first
    if (HUGGINGFACE_API_KEY) {
      try {
        providerUsed = 'Hugging Face';
        const hfResponse = await fetch(
          'https://router.huggingface.co/novita/v3/openai/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.1-8b-instruct',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 2048,
              temperature: 0.7,
            }),
          }
        );

        if (hfResponse.ok) {
          const hfData = await hfResponse.json();
          const responseText = hfData.choices?.[0]?.message?.content || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            questionsData = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (error) {
        console.error('Hugging Face failed:', error);
      }
    }

    // Try Gemini if HF failed
    if (!questionsData && GEMINI_API_KEY) {
      try {
        providerUsed = 'Gemini';
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
            }),
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            questionsData = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (error) {
        console.error('Gemini failed:', error);
      }
    }

    // Try Lovable as last resort
    if (!questionsData && LOVABLE_API_KEY) {
      try {
        providerUsed = 'Lovable';
        const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (lovableResponse.ok) {
          const lovableData = await lovableResponse.json();
          const responseText = lovableData.choices?.[0]?.message?.content || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            questionsData = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (error) {
        console.error('Lovable failed:', error);
      }
    }

    if (!questionsData || !questionsData.questions) {
      throw new Error('Failed to generate questions from AI');
    }

    // Save quiz to database if user is authenticated
    if (userId) {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: testTitle,
          description: `AI-generated test for ${chapter.name} using ${providerUsed}`,
          chapter_id: chapterId,
          created_by: userId,
          is_published: true,
          time_limit_minutes: Math.ceil(numQuestions * 2),
        })
        .select()
        .single();

      if (!quizError && quiz && questionsData.questions) {
        const questionsToInsert = questionsData.questions.map((q: any, index: number) => ({
          quiz_id: quiz.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || null,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          points: q.points || 1,
          order_index: index + 1,
        }));

        await supabase.from('quiz_questions').insert(questionsToInsert);
        
        questionsData.quizId = quiz.id;
        questionsData.saved = true;
        questionsData.provider = providerUsed;
      }
    }

    return new Response(JSON.stringify(questionsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-test function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
