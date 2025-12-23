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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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
        .select('title, content, document_type, board, class_level')
        .eq('is_active', true)
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
          trainingContext += `\n[${doc.document_type?.toUpperCase() || 'INFO'}] ${doc.title}:\n${doc.content}\n`;
        });
        trainingContext += '\n--- END KNOWLEDGE BASE ---\n';
      }
    } catch (error) {
      console.error('Error fetching training documents:', error);
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
        chapters.forEach(ch => {
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
- Keep responses clear and concise
- Use emojis occasionally to be friendly 😊

IMPORTANT: Use the knowledge base and syllabus content provided below to give accurate, curriculum-aligned answers. If the question relates to specific topics in the knowledge base, prioritize that information.

${trainingContext}
${syllabusContext}

Always maintain a positive, patient, and helpful tone. If a student is struggling, encourage them and break down the problem into smaller steps. Reference specific formulas, rules, or concepts from the knowledge base when relevant.`
    };

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
    
    const generatedText = data.choices?.[0]?.message?.content || 
      "I'm sorry, I couldn't generate a response. Please try again.";

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
