import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";
import AIChatButton from "@/components/AIChatButton";
import { 
  Brain, 
  Target, 
  Trophy, 
  BookOpen, 
  Users, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Play,
  Star
} from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Get personalized study recommendations and instant doubt resolution with our 24/7 AI mentor.",
      color: "#8B5CF6"
    },
    {
      icon: Target,
      title: "Smart Progress Tracking",
      description: "Visual progress indicators with emoji reactions that motivate you to achieve milestones.",
      color: "#10B981"
    },
    {
      icon: Trophy,
      title: "Gamified Experience",
      description: "Earn XP, unlock badges, and climb leaderboards as you learn. Learning has never been this fun!",
      color: "#F59E0B"
    },
    {
      icon: BookOpen,
      title: "Comprehensive Tests",
      description: "MCQs, descriptive questions, and timed exams with instant analytics and detailed reports.",
      color: "#EC4899"
    },
    {
      icon: Users,
      title: "Expert Teachers",
      description: "Learn from experienced educators who provide personalized feedback on your assignments.",
      color: "#3B82F6"
    },
    {
      icon: Sparkles,
      title: "Smart Study Planner",
      description: "AI-generated study timetables customized to your pace and learning goals.",
      color: "#14B8A6"
    }
  ];

  const stats = [
    { value: "10K+", label: "Active Students" },
    { value: "500+", label: "Practice Tests" },
    { value: "98%", label: "Success Rate" },
    { value: "24/7", label: "AI Support" }
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Class 12 Student",
      content: "EduMentor's AI helped me understand complex physics concepts. My scores improved by 40%!",
      rating: 5
    },
    {
      name: "Rahul Kumar",
      role: "JEE Aspirant",
      content: "The gamification keeps me motivated. I've maintained a 60-day streak and loving every moment!",
      rating: 5
    },
    {
      name: "Sneha Patel",
      role: "NEET Aspirant",
      content: "Best platform for exam prep. The progress tracking with emojis makes learning fun!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              AI-Powered Learning Platform
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              Learn Smarter,
              <br />
              <span className="gradient-text">Achieve More</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
              Your personal AI mentor that adapts to your learning style, tracks your progress with fun reactions, and helps you ace every exam.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Button variant="hero" size="xl" asChild>
                <Link to="/signup">
                  Start Learning Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/dashboard">
                  <Play className="w-5 h-5" />
                  View Demo
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
              {stats.map((stat, index) => (
                <div key={index} className="glass-card rounded-2xl p-6 hover-lift">
                  <p className="text-3xl md:text-4xl font-bold gradient-text mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Everything You Need to <span className="gradient-text">Excel</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make your learning journey effective and enjoyable
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <FeatureCard {...feature} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and transform your learning experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Sign Up", description: "Create your free account and set your learning goals" },
              { step: "02", title: "Learn & Practice", description: "Access courses, take tests, and chat with AI mentor" },
              { step: "03", title: "Track & Achieve", description: "Monitor progress, earn badges, and celebrate wins" }
            ].map((item, index) => (
              <div 
                key={index} 
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <span className="text-2xl font-bold text-primary-foreground">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Students <span className="gradient-text">Love Us</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of students who are already achieving their dreams
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="glass-card rounded-2xl p-6 hover-lift animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto glass-card rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 gradient-bg opacity-5" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Ready to Start Your <span className="gradient-text">Journey</span>?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of students who are learning smarter and achieving their goals with EduMentor.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/signup">
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Free forever plan
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  No credit card required
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold gradient-text">EduMentor</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 EduMentor. All rights reserved. Made with ❤️ for students.
            </p>
          </div>
        </div>
      </footer>

      {/* AI Chat Button */}
      <AIChatButton />
    </div>
  );
};

export default Index;
