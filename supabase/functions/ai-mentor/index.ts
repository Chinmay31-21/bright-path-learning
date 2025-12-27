import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Provider priority: Hugging Face (free) -> Gemini -> Lovable (fallback)
type AIProvider = 'huggingface' | 'gemini' | 'lovable';

interface ProviderConfig {
  name: AIProvider;
  apiKey: string;
  available: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    
    // Check available API keys - priority order: Hugging Face > Gemini > Lovable
    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const providers: ProviderConfig[] = [
      { name: 'huggingface', apiKey: HUGGINGFACE_API_KEY || '', available: !!HUGGINGFACE_API_KEY },
      { name: 'gemini', apiKey: GEMINI_API_KEY || '', available: !!GEMINI_API_KEY },
      { name: 'lovable', apiKey: LOVABLE_API_KEY || '', available: !!LOVABLE_API_KEY },
    ];
    
    const availableProviders = providers.filter(p => p.available);
    
    if (availableProviders.length === 0) {
      throw new Error('No AI provider configured. Please set HUGGINGFACE_API_KEY (recommended - free), GEMINI_API_KEY, or LOVABLE_API_KEY in Supabase Edge Function Secrets.');
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
        .limit(10); // Reduced limit for Hugging Face context limits

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
          const docContent = (doc.parsed_content || doc.content || '').slice(0, 500); // Truncate for context limits
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

    // Fetch syllabus content if available
    let syllabusContext = '';
    try {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('name, syllabus_content, description')
        .not('syllabus_content', 'is', null)
        .limit(5);

      if (chapters && chapters.length > 0) {
        syllabusContext = '\n\n--- SYLLABUS CONTENT ---\n';
        chapters.forEach((ch: any) => {
          if (ch.syllabus_content) {
            syllabusContext += `\n${ch.name}: ${ch.syllabus_content.slice(0, 200)}\n`;
          }
        });
        syllabusContext += '\n--- END SYLLABUS ---\n';
      }
    } catch (error) {
      console.error('Error fetching syllabus:', error);
    }

    console.log('Processing AI mentor request with', messages.length, 'messages');
    console.log('Available providers:', availableProviders.map(p => p.name).join(', '));

    const systemPrompt = `You are an AI Mentor for students studying under Indian education boards (CBSE, ICSE, State Boards). Your role is to:
- Help students understand difficult concepts in a simple, friendly way
- Provide step-by-step solutions to problems
- Give exam tips, study strategies, and motivation
- Explain topics across subjects like Math, Science, English, Hindi, Physics, Chemistry, Biology, Accountancy, Economics, and more
- Be encouraging and supportive, especially when students struggle
- Use examples and analogies to make learning easier

**RESPONSE FORMATTING RULES:**
1. Use **bold** for key terms
2. Use bullet points for lists
3. For math formulas, use LaTeX: $E = mc^2$ or $$\\frac{a}{b}$$
4. Number steps when explaining procedures
5. Keep responses organized and clear

${trainingContext}
${syllabusContext}

Always maintain a positive, patient, and helpful tone.`;

    // Try providers in order until one succeeds
    let generatedText: string | null = null;
    let lastError: Error | null = null;

    for (const provider of availableProviders) {
      try {
        console.log(`Trying provider: ${provider.name}`);
        generatedText = await callProvider(provider, systemPrompt, messages);
        console.log(`${provider.name} response received successfully`);
        break;
      } catch (error) {
        console.error(`${provider.name} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue; // Try next provider
      }
    }

    if (!generatedText) {
      if (lastError?.message.includes('rate limit')) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw lastError || new Error('All AI providers failed');
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

async function callProvider(
  provider: ProviderConfig, 
  systemPrompt: string, 
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  switch (provider.name) {
    case 'huggingface':
      return callHuggingFace(provider.apiKey, systemPrompt, messages);
    case 'gemini':
      return callGemini(provider.apiKey, systemPrompt, messages);
    case 'lovable':
      return callLovable(provider.apiKey, systemPrompt, messages);
    default:
      throw new Error(`Unknown provider: ${provider.name}`);
  }
}

// Hugging Face Inference API (FREE)
async function callHuggingFace(
  apiKey: string, 
  systemPrompt: string, 
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  // Use Mistral-7B-Instruct - great free model for education
  const model = 'mistralai/Mistral-7B-Instruct-v0.3';
  
  // Build conversation in Mistral instruction format
  let prompt = `<s>[INST] ${systemPrompt}\n\n`;
  
  // Add conversation history
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user') {
      if (i > 0) prompt += '[INST] ';
      prompt += `${msg.content} [/INST]`;
    } else {
      prompt += ` ${msg.content}</s>`;
      if (i < messages.length - 1) prompt += '<s>';
    }
  }
  
  // If last message was user, model should respond
  if (messages[messages.length - 1]?.role !== 'assistant') {
    // Response will be generated
  }

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false,
        },
        options: {
          wait_for_model: true,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Hugging Face API error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('Hugging Face rate limit exceeded');
    }
    if (response.status === 503) {
      // Model loading, retry
      throw new Error('Model is loading, please try again');
    }
    throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Handle different response formats
  let text = '';
  if (Array.isArray(data)) {
    text = data[0]?.generated_text || '';
  } else if (data.generated_text) {
    text = data.generated_text;
  } else if (typeof data === 'string') {
    text = data;
  }
  
  // Clean up the response
  text = text.trim();
  if (!text) {
    throw new Error('Empty response from Hugging Face');
  }
  
  return text;
}

// Google Gemini API
async function callGemini(
  apiKey: string, 
  systemPrompt: string, 
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const geminiContents = [];
  
  geminiContents.push({
    role: 'user',
    parts: [{ text: systemPrompt + '\n\nNow respond to the following conversation:' }]
  });
  geminiContents.push({
    role: 'model',
    parts: [{ text: 'I understand. I will act as an AI Mentor. How can I help you today?' }]
  });
  
  for (const msg of messages) {
    geminiContents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) throw new Error('Gemini rate limit exceeded');
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
}

// Lovable AI Gateway (fallback)
async function callLovable(
  apiKey: string, 
  systemPrompt: string, 
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Lovable rate limit exceeded');
    if (response.status === 402) throw new Error('Lovable AI credits exhausted');
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
}
