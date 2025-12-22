import { Zap, Award, Flame, Target, Star } from "lucide-react";

interface XPBadgeProps {
  xp: number;
  level: number;
  streak: number;
}

const XPBadge = ({ xp, level, streak }: XPBadgeProps) => {
  const badges = [
    { name: "Consistency Star", icon: Star, earned: streak >= 7, color: "#F59E0B" },
    { name: "Math Master", icon: Target, earned: xp >= 500, color: "#8B5CF6" },
    { name: "Quick Learner", icon: Zap, earned: level >= 3, color: "#10B981" },
  ];

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Your Progress</h3>
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
          <Flame className="w-4 h-4 text-warning" />
          <span className="text-sm font-semibold text-foreground">{streak} Day Streak!</span>
        </div>
      </div>

      {/* XP and Level */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center shadow-glow">
            <Zap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{xp.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total XP</p>
          </div>
        </div>

        <div className="w-px h-12 bg-border" />

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
            <Award className="w-7 h-7 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">Level {level}</p>
            <p className="text-sm text-muted-foreground">Current Rank</p>
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress to Level {level + 1}</span>
          <span className="text-foreground font-medium">{xp % 1000}/1000 XP</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full gradient-bg rounded-full transition-all duration-500"
            style={{ width: `${(xp % 1000) / 10}%` }}
          />
        </div>
      </div>

      {/* Badges */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Badges Earned</h4>
        <div className="flex gap-3 flex-wrap">
          {badges.map((badge) => (
            <div
              key={badge.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
                badge.earned 
                  ? 'border-transparent bg-gradient-to-r from-primary/10 to-accent/10 shadow-md' 
                  : 'border-border bg-secondary/50 opacity-50'
              }`}
            >
              <badge.icon 
                className="w-5 h-5" 
                style={{ color: badge.earned ? badge.color : undefined }}
              />
              <span className={`text-sm font-medium ${badge.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                {badge.name}
              </span>
              {badge.earned && (
                <span className="text-xs">✨</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default XPBadge;
