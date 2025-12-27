import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    
    // Try GEMINI_API_KEY first, then fall back to LOVABLE_API_KEY for backward compatibility
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured. Please set it in Supabase Edge Function Secrets.');
    }
    
    const useGeminiDirect = !!GEMINI_API_KEY;

    // Initialize Supabase client to fetch training documents
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch active training documents for context
    let trainingContext = '';
    try {
      let query = supabase
        .from('ai_training_documents')
        .select('title, content, document_type, board, class_level, file_name, parsed_content')
        .eq('is_active', true)
        .eq('training_status', 'completed')
        .limit(20);

      // If context is provided, filter by board/class
      if (context?.board) {
        query = query.or(`board.eq.${context.board},board.is.null`);
      }
      if (context?.class_level) {
        query = query.or(`class_level.eq.${context.class_level},class_level.is.null`);
      }

      const { data: trainingDocs } = await query;
      
      if (trainingDocs && trainingDocs.length > 0) {
        trainingContext = '\n\n--- KNOWLEDGE BASE ---\n';
        trainingDocs.forEach(doc => {
          const docContent = doc.parsed_content || doc.content;
          trainingContext += `\n[${doc.document_type?.toUpperCase() || 'INFO'}] ${doc.title}`;
          if (doc.file_name) {
            trainingContext += ` (Source: ${doc.file_name})`;
          }
          trainingContext += `:\n${docContent}\n`;
        });
        trainingContext += '\n--- END KNOWLEDGE BASE ---\n';
      }
    } catch (error) {
      console.error('Error fetching training documents:', error);
    }

    // Fetch chapter documents content for context
    let chapterDocsContext = '';
    try {
      const { data: chapterDocs } = await supabase
        .from('chapter_documents')
        .select(`
          id, file_name, file_url, file_type,
          chapters!inner(id, name, chapter_number, syllabus_content,
            subjects!inner(id, name, class_level, board)
          )
        `)
        .limit(30);

      if (chapterDocs && chapterDocs.length > 0) {
        chapterDocsContext = '\n\n--- CHAPTER MATERIALS ---\n';
        chapterDocs.forEach((doc: any) => {
          chapterDocsContext += `\n[Document] ${doc.file_name} - Chapter: ${doc.chapters?.name} (${doc.chapters?.subjects?.name})`;
          chapterDocsContext += `\nFile URL: ${doc.file_url}\n`;
        });
        chapterDocsContext += '\n--- END CHAPTER MATERIALS ---\n';
      }
    } catch (error) {
      console.error('Error fetching chapter documents:', error);
    }

    // Also fetch syllabus content if available
    let syllabusContext = '';
    try {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('name, syllabus_content, description')
        .not('syllabus_content', 'is', null)
        .limit(10);

      if (chapters && chapters.length > 0) {
        syllabusContext = '\n\n--- SYLLABUS CONTENT ---\n';
        chapters.forEach((ch: any) => {
          if (ch.syllabus_content) {
            syllabusContext += `\n${ch.name}: ${ch.syllabus_content}\n`;
          }
        });
        syllabusContext += '\n--- END SYLLABUS ---\n';
      }
    } catch (error) {
      console.error('Error fetching syllabus:', error);
    }

    console.log('Processing AI mentor request with', messages.length, 'messages');
    console.log('Training context length:', trainingContext.length);
    console.log('Syllabus context length:', syllabusContext.length);

    const systemMessage = {
      role: 'system',
      content: `You are an AI Mentor for students studying under Indian education boards (CBSE, ICSE, State Boards). Your role is to:
- Help students understand difficult concepts in a simple, friendly way
- Provide step-by-step solutions to problems
- Give exam tips, study strategies, and motivation
- Explain topics across subjects like Math, Science, English, Hindi, Physics, Chemistry, Biology, Accountancy, Economics, and more
- Be encouraging and supportive, especially when students struggle
- Use examples and analogies to make learning easier

**RESPONSE FORMATTING RULES (VERY IMPORTANT):**

1. **Mathematical Formulas**: Always use LaTeX notation for math:
   - Inline math: Use $...$ for formulas within text, e.g., $E = mc^2$
   - Display math: Use $$...$$ for important formulas on their own line:
     $$R_{cm} = \\frac{1}{M} \\sum_{i=1}^{n} m_i r_i$$

2. **Structure your answers clearly**:
   - Use **bold** for key terms and concepts
   - Use bullet points (•) for lists
   - Number steps when explaining procedures
   - Use proper headings with ## for sections

3. **For Physics/Math/Chemistry**:
   - Always write formulas in proper LaTeX
   - Explain each variable/symbol
   - Show step-by-step derivations
   - Example format:
     
     **Formula:**
     $$X_{cm} = \\frac{m_1 x_1 + m_2 x_2 + \\cdots + m_n x_n}{m_1 + m_2 + \\cdots + m_n}$$
     
     **Where:**
     • $R_{cm}$ is the position vector of the center of mass
     • $M$ is the total mass of the system ($M = \\sum m_i$)
     • $r_i$ is the position vector of the $i$-th particle

4. **Keep responses clean and organized**:
   - Use clear paragraph breaks
   - Highlight important points
   - End with a brief summary if the topic is complex
   - Use emojis sparingly and only for encouragement 😊

IMPORTANT: Use the knowledge base and syllabus content provided below to give accurate, curriculum-aligned answers. If the question relates to specific topics in the knowledge base, prioritize that information.

${trainingContext}
${syllabusContext}

Always maintain a positive, patient, and helpful tone. If a student is struggling, encourage them and break down the problem into smaller steps. Reference specific formulas, rules, or concepts from the knowledge base when relevant.`
    };

    let generatedText: string;

    if (useGeminiDirect) {
      // Use Google Gemini API directly
      console.log('Using Google Gemini API directly');
      
      // Convert messages to Gemini format
      const geminiContents = [];
      
      // Add system instruction as first user message context
      geminiContents.push({
        role: 'user',
        parts: [{ text: systemMessage.content + '\n\nNow respond to the following conversation:' }]
      });
      geminiContents.push({
        role: 'model',
        parts: [{ text: 'I understand. I will act as an AI Mentor for Indian education board students, following all the formatting rules and using the knowledge base provided. How can I help you today?' }]
      });
      
      // Add conversation messages
      for (const msg of messages) {
        geminiContents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ],
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', geminiResponse.status, errorText);
        if (geminiResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      console.log('Gemini response received successfully');
      
      generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
        "I'm sorry, I couldn't generate a response. Please try again.";
    } else {
      // Use Lovable AI Gateway (backward compatibility)
      console.log('Using Lovable AI Gateway');
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [systemMessage, ...messages],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Please try again later.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`Lovable AI error: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI response received successfully');
      
      generatedText = data.choices?.[0]?.message?.content || 
        "I'm sorry, I couldn't generate a response. Please try again.";
    }

    return new Response(JSON.stringify({ response: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-mentor function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});