import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('Processing AI mentor request with', messages.length, 'messages');

    // Convert messages to Gemini format
    const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // System instruction
    const systemInstruction = `You are an AI Mentor for students. Your role is to:
- Help students understand difficult concepts in a simple, friendly way
- Provide step-by-step solutions to problems
- Give exam tips, study strategies, and motivation
- Explain topics across subjects like Math, Science, English, and more
- Be encouraging and supportive, especially when students struggle
- Use examples and analogies to make learning easier
- Keep responses clear and concise
- Use emojis occasionally to be friendly 😊

Always maintain a positive, patient, and helpful tone. If a student is struggling, encourage them and break down the problem into smaller steps.`;

    let response;
    let attempt = 0;
    let success = false;
    let lastError = "";

    // --- RETRY LOOP START ---
    while (attempt < MAX_RETRIES && !success) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1000ms, 2000ms, 4000ms
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.log(`Rate limit hit previously. Retrying attempt ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: geminiMessages,
              systemInstruction: {
                parts: [{ text: systemInstruction }]
              },
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        // If 429, throw specifically to trigger retry logic
        if (response.status === 429) {
          throw new Error(`429 Too Many Requests`);
        }

        // If 5xx (Server Error), we might also want to retry, otherwise throw
        if (!response.ok) {
           const errorText = await response.text();
           // Don't retry client errors (400, 401, etc), just throw
           throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        // If we get here, the request was successful
        success = true;

      } catch (error: any) {
        lastError = error.message;
        
        // If it's NOT a 429 or 5xx error, break loop immediately (e.g. Invalid API Key shouldn't be retried)
        if (!lastError.includes("429") && !lastError.includes("500") && !lastError.includes("503")) {
          console.error("Non-retriable error:", lastError);
          break;
        }
        
        attempt++;
      }
    }
    // --- RETRY LOOP END ---

    if (!success || !response) {
      throw new Error(`Failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`);
    }

    const data = await response.json();
    console.log('Gemini response received successfully');
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
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