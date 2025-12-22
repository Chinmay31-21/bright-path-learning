import { LucideIcon } from "lucide-react";
import ProgressRing from "./ProgressRing";

interface SubjectCardProps {
  name: string;
  icon: LucideIcon;
  progress: number;
  color: string;
  testsCompleted: number;
  totalTests: number;
}

const SubjectCard = ({ 
  name, 
  icon: Icon, 
  progress, 
  color, 
  testsCompleted, 
  totalTests 
}: SubjectCardProps) => {
  return (
    <div className="glass-card rounded-2xl p-6 hover-lift cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
          {testsCompleted}/{totalTests} Tests
        </span>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-4">{name}</h3>
      
      <div className="flex justify-center">
        <ProgressRing progress={progress} size={100} strokeWidth={6} />
      </div>
    </div>
  );
};

export default SubjectCard;
