import Navbar from "@/components/Navbar";
import TestCard from "@/components/TestCard";
import AIChatButton from "@/components/AIChatButton";
import { Button } from "@/components/ui/button";
import { Search, Filter, BookOpen, Clock, Target, Trophy } from "lucide-react";
import { useState } from "react";

const Tests = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filters = [
    { id: "all", label: "All Tests" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
    { id: "recommended", label: "Recommended" },
  ];

  const tests = [
    { title: "Algebra Mock Test", subject: "Mathematics", duration: 45, questions: 30, difficulty: "Medium" as const, isCompleted: false },
    { title: "Newton's Laws Quiz", subject: "Physics", duration: 30, questions: 20, difficulty: "Easy" as const, isCompleted: false },
    { title: "Organic Chemistry", subject: "Chemistry", duration: 60, questions: 40, difficulty: "Hard" as const, isCompleted: false },
    { title: "Trigonometry Quiz", subject: "Mathematics", duration: 30, questions: 25, difficulty: "Medium" as const, isCompleted: true, score: 84 },
    { title: "Kinematics Test", subject: "Physics", duration: 45, questions: 35, difficulty: "Hard" as const, isCompleted: true, score: 72 },
    { title: "Cell Biology", subject: "Biology", duration: 40, questions: 30, difficulty: "Medium" as const, isCompleted: true, score: 91 },
    { title: "Grammar & Vocabulary", subject: "English", duration: 25, questions: 50, difficulty: "Easy" as const, isCompleted: false },
    { title: "Data Structures", subject: "Computer Science", duration: 50, questions: 25, difficulty: "Hard" as const, isCompleted: false },
    { title: "Thermodynamics", subject: "Physics", duration: 45, questions: 30, difficulty: "Hard" as const, isCompleted: true, score: 68 },
  ];

  const filteredTests = tests.filter(test => {
    if (activeFilter === "upcoming") return !test.isCompleted;
    if (activeFilter === "completed") return test.isCompleted;
    if (activeFilter === "recommended") return !test.isCompleted && test.difficulty !== "Hard";
    return true;
  }).filter(test => 
    test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { icon: BookOpen, value: tests.length, label: "Total Tests" },
    { icon: Target, value: tests.filter(t => t.isCompleted).length, label: "Completed" },
    { icon: Clock, value: tests.filter(t => !t.isCompleted).length, label: "Pending" },
    { icon: Trophy, value: "78%", label: "Avg. Score" },
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
              Practice tests, mock exams, and quizzes to boost your preparation
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
