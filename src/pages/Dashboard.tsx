import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import SubjectCard from "@/components/SubjectCard";
import TestCard from "@/components/TestCard";
import XPBadge from "@/components/XPBadge";
import AIChatButton from "@/components/AIChatButton";
import AITestGenerator from "@/components/AITestGenerator";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BookOpen, 
  Clock, 
  Target, 
  TrendingUp,
  Calculator,
  FlaskConical,
  Globe,
  Palette,
  Code,
  ChevronRight,
  Play,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ProgressRing from "@/components/ProgressRing";

const iconMap: Record<string, any> = {
  Calculator, FlaskConical, Globe, Palette, Code, BookOpen
};

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, subjects, quizAttempts, getIncompleteAttempts, isLoading } = useStudentProgress();
  
  const incompleteAttempts = getIncompleteAttempts();
  const recentTests = quizAttempts?.slice(0, 3) || [];

  const statCards = [
    { title: "Tests Completed", value: stats.testsCompleted, icon: Target, color: "#8B5CF6", trend: { value: 12, isPositive: true } },
    { title: "Study Hours", value: `${stats.studyHours}h`, icon: Clock, color: "#10B981", trend: { value: 8, isPositive: true } },
    { title: "Avg. Score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "#F59E0B", trend: { value: 5, isPositive: true } },
    { title: "Courses Active", value: stats.coursesActive, icon: BookOpen, color: "#EC4899" },
  ];

  const subjectData = subjects?.map((s: any) => ({
    name: s.name,
    icon: iconMap[s.icon] || BookOpen,
    progress: s.progressPercentage,
    color: "#8B5CF6",
    testsCompleted: s.completedChapters,
    totalTests: s.totalChapters,
  })) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Welcome Header */}
          <div className="mb-8 animate-fade-in flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Welcome back, <span className="gradient-text">{user?.email?.split('@')[0] || 'Student'}</span> 👋
              </h1>
              <p className="text-muted-foreground">
                Ready to continue your learning journey? Let's make today count!
              </p>
            </div>
            <AITestGenerator />
          </div>

          {/* Resume Tests Banner */}
          {incompleteAttempts.length > 0 && (
            <div className="mb-8 glass-card rounded-2xl p-6 border-l-4 border-warning animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                    <Play className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Resume Your Test</h3>
                    <p className="text-sm text-muted-foreground">
                      You have {incompleteAttempts.length} incomplete test{incompleteAttempts.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/tests">Resume Now</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <StatCard {...stat} />
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overall Progress */}
              <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <ProgressRing progress={stats.overallProgress} size={160} strokeWidth={10} />
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-foreground mb-2">Overall Progress</h2>
                    <p className="text-muted-foreground mb-4">
                      {stats.overallProgress >= 70 ? "Excellent work! Keep pushing!" : "You're making progress. Keep it up!"}
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <span className="bg-success/10 text-success text-sm font-medium px-3 py-1 rounded-full">
                        {subjects?.length || 0} subjects
                      </span>
                      <span className="bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full">
                        {stats.testsCompleted} tests completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject Progress */}
              <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Subject Progress</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/courses">View All<ChevronRight className="w-4 h-4" /></Link>
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectData.slice(0, 6).map((subject, index) => (
                    <div key={index} className="animate-fade-in" style={{ animationDelay: `${(index + 4) * 50}ms` }}>
                      <SubjectCard {...subject} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
                <XPBadge xp={stats.testsCompleted * 100 + stats.studyHours * 10} level={Math.floor(stats.testsCompleted / 5) + 1} streak={12} />
              </div>

              {/* Recent Tests */}
              <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
                <h2 className="text-xl font-semibold text-foreground mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  {recentTests.length > 0 ? recentTests.map((attempt: any, index) => (
                    <TestCard 
                      key={index}
                      title={attempt.quizzes?.title || 'Test'}
                      subject={attempt.quizzes?.chapters?.subjects?.name || 'Subject'}
                      duration={attempt.quizzes?.time_limit_minutes || 30}
                      questions={attempt.max_score}
                      difficulty="Medium"
                      isCompleted={!!attempt.completed_at}
                      score={attempt.completed_at ? Math.round((attempt.score / attempt.max_score) * 100) : undefined}
                    />
                  )) : (
                    <p className="text-muted-foreground text-center py-8">No tests taken yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AIChatButton />
    </div>
  );
};

export default Dashboard;
