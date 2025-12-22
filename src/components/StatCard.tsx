import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
}

const StatCard = ({ title, value, icon: Icon, trend, color }: StatCardProps) => {
  return (
    <div className="glass-card rounded-2xl p-6 hover-lift">
      <div className="flex items-center justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        {trend && (
          <span 
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              trend.isPositive 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
};

export default StatCard;
