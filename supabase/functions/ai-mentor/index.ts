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
    
    // Try GEMINI_API_KEY first, fallback to LOVABLE_API_KEY
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const useGeminiDirect = !!GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('No API key configured. Please set GEMINI_API_KEY or LOVABLE_API_KEY.');
    }

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

    // Fetch syllabus content
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
    console.log('Using Gemini Direct:', useGeminiDirect);

    const systemPrompt = `You are an AI Mentor for students studying under Indian education boards (CBSE, ICSE, State Boards). Your role is to:
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

4. **Keep responses clean and organized**:
   - Use clear paragraph breaks
   - Highlight important points
   - End with a brief summary if the topic is complex
   - Use emojis sparingly and only for encouragement 😊

IMPORTANT: Use the knowledge base and syllabus content provided below to give accurate, curriculum-aligned answers.

${trainingContext}
${syllabusContext}

Always maintain a positive, patient, and helpful tone.`;

    let responseText: string;

    if (useGeminiDirect) {
      // Use Google Gemini API directly
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              ...messages.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
              }))
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', geminiResponse.status, errorText);
        throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
        "I'm sorry, I couldn't generate a response. Please try again.";
    } else {
      // Fallback to Lovable AI Gateway
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
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
      responseText = data.choices?.[0]?.message?.content || 
        "I'm sorry, I couldn't generate a response. Please try again.";
    }

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ response: responseText }), {
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
