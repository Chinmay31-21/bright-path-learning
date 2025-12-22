import Navbar from "@/components/Navbar";
import AIChatButton from "@/components/AIChatButton";
import { Button } from "@/components/ui/button";
import { 
  Calculator, 
  FlaskConical, 
  Globe, 
  Palette, 
  Code,
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  ArrowRight
} from "lucide-react";
import { useState } from "react";

interface Course {
  id: string;
  title: string;
  subject: string;
  icon: typeof Calculator;
  color: string;
  description: string;
  lessons: number;
  duration: string;
  students: number;
  rating: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  progress?: number;
}

const Courses = () => {
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Courses" },
    { id: "mathematics", label: "Mathematics" },
    { id: "science", label: "Science" },
    { id: "languages", label: "Languages" },
    { id: "technology", label: "Technology" },
  ];

  const courses: Course[] = [
    {
      id: "1",
      title: "Complete Mathematics Masterclass",
      subject: "Mathematics",
      icon: Calculator,
      color: "#8B5CF6",
      description: "Master algebra, geometry, calculus, and statistics with comprehensive lessons and practice problems.",
      lessons: 48,
      duration: "24 hours",
      students: 2340,
      rating: 4.9,
      level: "Intermediate",
      progress: 75
    },
    {
      id: "2",
      title: "Physics Fundamentals",
      subject: "Science",
      icon: FlaskConical,
      color: "#10B981",
      description: "From mechanics to electromagnetism, build a strong foundation in physics concepts.",
      lessons: 36,
      duration: "18 hours",
      students: 1890,
      rating: 4.8,
      level: "Beginner",
      progress: 62
    },
    {
      id: "3",
      title: "Organic Chemistry Deep Dive",
      subject: "Science",
      icon: FlaskConical,
      color: "#F59E0B",
      description: "Understand reactions, mechanisms, and molecular structures in organic chemistry.",
      lessons: 42,
      duration: "21 hours",
      students: 1456,
      rating: 4.7,
      level: "Advanced",
      progress: 45
    },
    {
      id: "4",
      title: "Biology: Life Sciences",
      subject: "Science",
      icon: Globe,
      color: "#EC4899",
      description: "Explore cells, genetics, evolution, and human biology in this comprehensive course.",
      lessons: 38,
      duration: "19 hours",
      students: 2100,
      rating: 4.9,
      level: "Intermediate",
      progress: 88
    },
    {
      id: "5",
      title: "English Language & Literature",
      subject: "Languages",
      icon: Palette,
      color: "#3B82F6",
      description: "Improve grammar, vocabulary, and literature analysis skills for academic excellence.",
      lessons: 30,
      duration: "15 hours",
      students: 3200,
      rating: 4.8,
      level: "Beginner",
      progress: 92
    },
    {
      id: "6",
      title: "Programming with Python",
      subject: "Technology",
      icon: Code,
      color: "#14B8A6",
      description: "Learn programming fundamentals, data structures, and algorithms with Python.",
      lessons: 52,
      duration: "26 hours",
      students: 4500,
      rating: 4.9,
      level: "Beginner",
      progress: 35
    },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-success/10 text-success";
      case "Intermediate": return "bg-warning/10 text-warning";
      case "Advanced": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filteredCourses = courses.filter(course => {
    if (activeCategory === "all") return true;
    if (activeCategory === "mathematics") return course.subject === "Mathematics";
    if (activeCategory === "science") return course.subject === "Science";
    if (activeCategory === "languages") return course.subject === "Languages";
    if (activeCategory === "technology") return course.subject === "Technology";
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Explore <span className="gradient-text">Courses</span>
            </h1>
            <p className="text-muted-foreground">
              Learn from expert-crafted courses designed to help you succeed
            </p>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "gradient" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="whitespace-nowrap"
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Courses Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => (
              <div 
                key={course.id}
                className="glass-card rounded-2xl overflow-hidden hover-lift group animate-fade-in"
                style={{ animationDelay: `${(index + 2) * 100}ms` }}
              >
                {/* Course Header */}
                <div 
                  className="h-32 relative flex items-center justify-center"
                  style={{ backgroundColor: `${course.color}15` }}
                >
                  <course.icon 
                    className="w-16 h-16 transition-transform duration-300 group-hover:scale-110" 
                    style={{ color: course.color }} 
                  />
                  <span className={`absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full ${getLevelColor(course.level)}`}>
                    {course.level}
                  </span>
                </div>

                {/* Course Content */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span>{course.lessons} lessons</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{course.students.toLocaleString()} students</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-warning text-warning" />
                      <span className="text-foreground font-medium">{course.rating}</span>
                    </div>
                  </div>

                  {/* Progress or Start Button */}
                  {course.progress !== undefined ? (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground font-medium">{course.progress}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-4">
                        <div 
                          className="h-full gradient-bg rounded-full transition-all duration-500"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <Button variant="gradient" className="w-full group/btn">
                        Continue Learning
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full group/btn">
                      <Play className="w-4 h-4" />
                      Start Course
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <AIChatButton />
    </div>
  );
};

export default Courses;
