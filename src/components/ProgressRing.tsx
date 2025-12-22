import { useEffect, useState } from "react";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showEmoji?: boolean;
}

const ProgressRing = ({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  showEmoji = true 
}: ProgressRingProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const getProgressColor = () => {
    if (progress <= 40) return "hsl(0 84% 60%)"; // Red
    if (progress <= 70) return "hsl(38 92% 50%)"; // Amber
    if (progress <= 90) return "hsl(160 84% 39%)"; // Green
    return "hsl(239 84% 67%)"; // Purple for milestone
  };

  const getEmoji = () => {
    if (progress <= 40) return "😟";
    if (progress <= 70) return "💪";
    if (progress <= 90) return "😊";
    return "🏆";
  };

  const getMessage = () => {
    if (progress <= 40) return "Needs Improvement";
    if (progress <= 70) return "Getting Better!";
    if (progress <= 90) return "Good Progress!";
    return "Milestone Achieved!";
  };

  const isCelebrating = progress > 90;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getProgressColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: isCelebrating ? `drop-shadow(0 0 10px ${getProgressColor()})` : undefined
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showEmoji && (
            <span className={`text-3xl ${isCelebrating ? 'animate-celebrate' : 'animate-bounce-gentle'}`}>
              {getEmoji()}
            </span>
          )}
          <span className="text-2xl font-bold text-foreground mt-1">
            {Math.round(animatedProgress)}%
          </span>
        </div>
      </div>
      
      <span 
        className="text-sm font-medium text-center"
        style={{ color: getProgressColor() }}
      >
        {getMessage()}
      </span>
    </div>
  );
};

export default ProgressRing;
