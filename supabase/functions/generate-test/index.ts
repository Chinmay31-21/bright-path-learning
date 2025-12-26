import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateTestRequest {
  content: string;
  title: string;
  subject?: string;
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes?: string[];
  chapterId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, subject, numQuestions = 10, difficulty = 'medium', questionTypes = ['mcq'], chapterId } = await req.json() as GenerateTestRequest;
    
    if (!content || !title) {
      return new Response(JSON.stringify({ error: 'Content and title are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('No API key configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const prompt = `You are an expert test generator for Indian education boards (CBSE, ICSE, State Boards). 
    
Based on the following content, generate exactly ${numQuestions} questions for a test titled "${title}".

**Content to base questions on:**
${content}

**Requirements:**
- Difficulty level: ${difficulty}
- Question types to include: ${questionTypes.join(', ')}
- Subject: ${subject || 'General'}
- Make questions exam-ready and aligned with Indian education standards
- For MCQ: provide exactly 4 options (A, B, C, D)
- Include clear explanations for each answer
- Vary question difficulty if "mixed" is selected

**Output Format (STRICTLY JSON):**
Return a JSON array with this exact structure:
{
  "questions": [
    {
      "question_text": "The question text here",
      "question_type": "mcq" | "true_false" | "short_answer",
      "options": ["Option A", "Option B", "Option C", "Option D"] (only for mcq),
      "correct_answer": "The correct answer text",
      "explanation": "Detailed explanation of why this is correct",
      "points": 1-5 based on difficulty
    }
  ]
}

Only return the JSON, no additional text.`;

    let questionsData: any;

    if (GEMINI_API_KEY) {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response as JSON');
      }
      questionsData = JSON.parse(jsonMatch[0]);
    } else {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || '';
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response as JSON');
      }
      questionsData = JSON.parse(jsonMatch[0]);
    }

    // If chapterId is provided, save the quiz to database
    if (chapterId && userId) {
      // Create the quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title,
          description: `AI-generated test based on: ${content.substring(0, 100)}...`,
          chapter_id: chapterId,
          created_by: userId,
          is_published: true,
          time_limit_minutes: Math.ceil(numQuestions * 2), // 2 minutes per question
        })
        .select()
        .single();

      if (quizError) {
        console.error('Error creating quiz:', quizError);
      } else if (quiz && questionsData.questions) {
        // Insert questions
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

        const { error: questionsError } = await supabase
          .from('quiz_questions')
          .insert(questionsToInsert);

        if (questionsError) {
          console.error('Error inserting questions:', questionsError);
        } else {
          questionsData.quizId = quiz.id;
          questionsData.saved = true;
        }
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
