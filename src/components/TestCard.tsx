import { Clock, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestCardProps {
  title: string;
  subject: string;
  duration: number;
  questions: number;
  difficulty: "Easy" | "Medium" | "Hard";
  isCompleted?: boolean;
  score?: number;
}

const TestCard = ({ 
  title, 
  subject, 
  duration, 
  questions, 
  difficulty,
  isCompleted = false,
  score
}: TestCardProps) => {
  const getDifficultyColor = () => {
    switch (difficulty) {
      case "Easy": return "bg-success/10 text-success";
      case "Medium": return "bg-warning/10 text-warning";
      case "Hard": return "bg-destructive/10 text-destructive";
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 hover-lift group">
      <div className="flex items-start justify-between mb-4">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getDifficultyColor()}`}>
          {difficulty}
        </span>
        {isCompleted && score !== undefined && (
          <span className="text-sm font-bold text-success">
            Score: {score}%
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{subject}</p>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{duration} min</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          <span>{questions} Questions</span>
        </div>
      </div>

      <Button 
        variant={isCompleted ? "outline" : "gradient"} 
        className="w-full group/btn"
      >
        {isCompleted ? "Review" : "Start Test"}
        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
      </Button>
    </div>
  );
};

export default TestCard;
