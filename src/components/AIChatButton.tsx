import { MessageCircle, X, Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

const AIChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const initialMessage: Message = {
    role: "assistant",
    content: "Hi there! 👋 I'm your AI Mentor powered by Gemini. I can help you with:\n\n• **Explaining concepts** in simple terms\n• **Solving problems** step-by-step\n• **Exam tips** & motivation\n• **Study planning** advice\n\nHow can I help you today?"
  };

  // Load chat history when user opens chat
  useEffect(() => {
    if (isOpen && user) {
      loadChatHistory();
    }
  }, [isOpen, user]);

  const loadChatHistory = async () => {
    if (!user) {
      setMessages([initialMessage]);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content
        })));
      } else {
        setMessages([initialMessage]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([initialMessage]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveChatMessage = async (role: "user" | "assistant", content: string) => {
    if (!user) return;

    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role,
        content
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;

    try {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id);
      
      setMessages([initialMessage]);
      toast({ title: 'Chat history cleared' });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast({ title: 'Error clearing history', variant: 'destructive' });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    // Save user message
    await saveChatMessage("user", userMessage);

    try {
      const { data, error } = await supabase.functions.invoke('ai-mentor', {
        body: { 
          messages: newMessages.filter(m => m.role !== 'assistant' || m.content !== initialMessage.content).map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage = data.response;
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: assistantMessage 
      }]);

      // Save assistant message
      await saveChatMessage("assistant", assistantMessage);
    } catch (error) {
      console.error('Error calling AI mentor:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-2xl gradient-bg shadow-glow flex items-center justify-center transition-all duration-300 hover:scale-105 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <MessageCircle className="w-7 h-7 text-primary-foreground" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-success-foreground" />
        </span>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-48px)] h-[650px] max-h-[calc(100vh-120px)] glass-card rounded-2xl overflow-hidden flex flex-col transition-all duration-300 shadow-xl ${
          isOpen 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="gradient-bg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground">AI Mentor</h3>
              <p className="text-xs text-primary-foreground/80">Always here to help</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={clearChatHistory}
                className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                title="Clear chat history"
              >
                <Trash2 className="w-4 h-4 text-primary-foreground" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
            >
              <X className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingHistory ? (
            <div className="flex justify-center items-center h-full">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm ${
                    message.role === 'user'
                      ? 'gradient-bg text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-foreground rounded-bl-md'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-0.5">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                            ) : (
                              <code className="block bg-muted p-2 rounded text-xs overflow-x-auto">{children}</code>
                            );
                          },
                          pre: ({ children }) => <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2">{children}</pre>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          {!user && (
            <p className="text-xs text-muted-foreground mb-2 text-center">
              Sign in to save your chat history
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              variant="gradient"
              size="icon"
              className="shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChatButton;