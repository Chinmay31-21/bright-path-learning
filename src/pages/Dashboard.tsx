import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import SubjectCard from "@/components/SubjectCard";
import TestCard from "@/components/TestCard";
import XPBadge from "@/components/XPBadge";
import AIChatButton from "@/components/AIChatButton";
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
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ProgressRing from "@/components/ProgressRing";

const Dashboard = () => {
  const stats = [
    { title: "Tests Completed", value: 24, icon: Target, color: "#8B5CF6", trend: { value: 12, isPositive: true } },
    { title: "Study Hours", value: "48h", icon: Clock, color: "#10B981", trend: { value: 8, isPositive: true } },
    { title: "Avg. Score", value: "78%", icon: TrendingUp, color: "#F59E0B", trend: { value: 5, isPositive: true } },
    { title: "Courses Active", value: 5, icon: BookOpen, color: "#EC4899" },
  ];

  const subjects = [
    { name: "Mathematics", icon: Calculator, progress: 75, color: "#8B5CF6", testsCompleted: 8, totalTests: 12 },
    { name: "Physics", icon: FlaskConical, progress: 62, color: "#10B981", testsCompleted: 5, totalTests: 10 },
    { name: "Chemistry", icon: FlaskConical, progress: 45, color: "#F59E0B", testsCompleted: 4, totalTests: 10 },
    { name: "Biology", icon: Globe, progress: 88, color: "#EC4899", testsCompleted: 7, totalTests: 8 },
    { name: "English", icon: Palette, progress: 92, color: "#3B82F6", testsCompleted: 9, totalTests: 10 },
    { name: "Computer Science", icon: Code, progress: 35, color: "#14B8A6", testsCompleted: 3, totalTests: 8 },
  ];

  const upcomingTests = [
    { title: "Algebra Mock Test", subject: "Mathematics", duration: 45, questions: 30, difficulty: "Medium" as const },
    { title: "Newton's Laws", subject: "Physics", duration: 30, questions: 20, difficulty: "Easy" as const },
    { title: "Organic Chemistry", subject: "Chemistry", duration: 60, questions: 40, difficulty: "Hard" as const },
  ];

  const recentTests = [
    { title: "Trigonometry Quiz", subject: "Mathematics", duration: 30, questions: 25, difficulty: "Medium" as const, isCompleted: true, score: 84 },
    { title: "Kinematics Test", subject: "Physics", duration: 45, questions: 35, difficulty: "Hard" as const, isCompleted: true, score: 72 },
  ];

  // Calculate overall progress
  const overallProgress = Math.round(subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Welcome Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Welcome back, <span className="gradient-text">Student</span> 👋
            </h1>
            <p className="text-muted-foreground">
              Ready to continue your learning journey? Let's make today count!
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <StatCard {...stat} />
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Progress & Subjects */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overall Progress */}
              <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <ProgressRing progress={overallProgress} size={160} strokeWidth={10} />
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-foreground mb-2">Overall Progress</h2>
                    <p className="text-muted-foreground mb-4">
                      You're doing great! Keep up the momentum to reach your goals.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <span className="bg-success/10 text-success text-sm font-medium px-3 py-1 rounded-full">
                        5 subjects active
                      </span>
                      <span className="bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full">
                        24 tests completed
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
                    <Link to="/courses">
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject, index) => (
                    <div 
                      key={index}
                      className="animate-fade-in"
                      style={{ animationDelay: `${(index + 4) * 50}ms` }}
                    >
                      <SubjectCard {...subject} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Tests */}
              <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Upcoming Tests</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/tests">
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingTests.map((test, index) => (
                    <TestCard key={index} {...test} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - XP & Recent Activity */}
            <div className="space-y-8">
              {/* XP Badge */}
              <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
                <XPBadge xp={2450} level={5} streak={12} />
              </div>

              {/* Recent Tests */}
              <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
                <h2 className="text-xl font-semibold text-foreground mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  {recentTests.map((test, index) => (
                    <TestCard key={index} {...test} />
                  ))}
                </div>
              </div>

              {/* Study Reminder */}
              <div className="glass-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '450ms' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Study Reminder</h3>
                    <p className="text-sm text-muted-foreground">Next session in 2 hours</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  You have a Chemistry revision scheduled. Don't miss it!
                </p>
                <Button variant="outline" className="w-full">
                  View Schedule
                </Button>
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
