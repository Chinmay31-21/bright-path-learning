import Navbar from "@/components/Navbar";
import TestCard from "@/components/TestCard";
import AIChatButton from "@/components/AIChatButton";
import AITestGenerator from "@/components/student/AITestGenerator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, BookOpen, Clock, Target, Trophy, Brain } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Tests = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const filters = [
    { id: "all", label: "All Tests" },
    { id: "available", label: "Available" },
    { id: "completed", label: "Completed" },
  ];

  // Fetch available quizzes
  const { data: quizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ['student-quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          chapters(id, name, chapter_number, subjects(id, name, board, class_level)),
          quiz_questions(id)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's quiz attempts
  const { data: attempts } = useQuery({
    queryKey: ['quiz-attempts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, max_score, completed_at')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredQuizzes = quizzes?.filter(quiz => {
    const isCompleted = attempts?.some(a => a.quiz_id === quiz.id && a.completed_at);
    
    if (activeFilter === "available") return !isCompleted;
    if (activeFilter === "completed") return isCompleted;
    return true;
  }).filter(quiz => 
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quiz.chapters?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quiz.chapters?.subjects?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { icon: BookOpen, value: quizzes?.length || 0, label: "Total Tests" },
    { icon: Target, value: attempts?.filter(a => a.completed_at).length || 0, label: "Completed" },
    { icon: Clock, value: (quizzes?.length || 0) - (attempts?.filter(a => a.completed_at).length || 0), label: "Pending" },
    { icon: Trophy, value: attempts && attempts.length > 0 
      ? `${Math.round(attempts.reduce((acc, a) => acc + (a.score / a.max_score) * 100, 0) / attempts.length)}%`
      : "0%", 
      label: "Avg. Score" 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Tests & <span className="gradient-text">Exams</span>
            </h1>
            <p className="text-muted-foreground">
              Practice tests, mock exams, and AI-generated quizzes to boost your preparation
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="glass-card rounded-2xl p-5 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs for Generator and Tests */}
          <Tabs defaultValue="tests" className="space-y-6">
            <TabsList className="glass-card">
              <TabsTrigger value="tests">
                <BookOpen className="w-4 h-4 mr-2" />
                My Tests
              </TabsTrigger>
              <TabsTrigger value="generate">
                <Brain className="w-4 h-4 mr-2" />
                Generate AI Test
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate">
              <AITestGenerator />
            </TabsContent>

            <TabsContent value="tests" className="space-y-6">
              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search tests by name or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                  {filters.map((filter) => (
                    <Button
                      key={filter.id}
                      variant={activeFilter === filter.id ? "default" : "outline"}
                      onClick={() => setActiveFilter(filter.id)}
                      className="whitespace-nowrap"
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tests Grid */}
              {quizzesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredQuizzes && filteredQuizzes.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredQuizzes.map((quiz, index) => {
                    const attempt = attempts?.find(a => a.quiz_id === quiz.id && a.completed_at);
                    return (
                      <TestCard
                        key={quiz.id}
                        title={quiz.title}
                        subject={quiz.chapters?.subjects?.name || 'Unknown'}
                        duration={quiz.time_limit_minutes || 30}
                        questions={quiz.quiz_questions?.length || 0}
                        difficulty="Medium" // Could add this field to DB
                        isCompleted={!!attempt}
                        score={attempt ? Math.round((attempt.score / attempt.max_score) * 100) : undefined}
                        delay={index * 100}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 glass-card rounded-xl">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">No Tests Available</p>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery 
                      ? "No tests match your search. Try a different keyword." 
                      : "Generate AI tests from the 'Generate AI Test' tab to get started!"}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <AIChatButton />
    </div>
  );
};

export default Tests;
                  key={filter.id}
                  variant={activeFilter === filter.id ? "gradient" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id)}
                  className="whitespace-nowrap"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tests Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTests.map((test, index) => (
              <div 
                key={index}
                className="animate-fade-in"
                style={{ animationDelay: `${(index + 3) * 50}ms` }}
              >
                <TestCard {...test} />
              </div>
            ))}
          </div>

          {filteredTests.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No tests found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </main>

      <AIChatButton />
    </div>
  );
};

export default Tests;
