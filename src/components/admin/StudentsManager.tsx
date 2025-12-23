import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, TrendingUp, Award } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface QuizAttempt {
  id: string;
  user_id: string;
  score: number;
  max_score: number;
}

interface Progress {
  id: string;
  user_id: string;
  progress_percentage: number;
  time_spent_seconds: number;
}

const StudentsManager = () => {
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    }
  });

  const { data: attempts } = useQuery({
    queryKey: ['all-quiz-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('id, user_id, score, max_score');
      if (error) throw error;
      return data as QuizAttempt[];
    }
  });

  const { data: progress } = useQuery({
    queryKey: ['all-student-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_progress')
        .select('id, user_id, progress_percentage, time_spent_seconds');
      if (error) throw error;
      return data as Progress[];
    }
  });

  const getStudentStats = (userId: string) => {
    const userAttempts = attempts?.filter(a => a.user_id === userId) || [];
    const userProgress = progress?.filter(p => p.user_id === userId) || [];
    
    const totalQuizzes = userAttempts.length;
    const avgScore = totalQuizzes > 0 
      ? Math.round(userAttempts.reduce((acc, a) => acc + (a.score / a.max_score) * 100, 0) / totalQuizzes)
      : 0;
    
    const chaptersCompleted = userProgress.filter(p => p.progress_percentage === 100).length;
    const totalTimeSpent = userProgress.reduce((acc, p) => acc + p.time_spent_seconds, 0);
    
    return { totalQuizzes, avgScore, chaptersCompleted, totalTimeSpent };
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const totalStudents = profiles?.length || 0;
  const activeStudents = profiles?.filter(p => {
    const stats = getStudentStats(p.user_id);
    return stats.totalQuizzes > 0 || stats.chaptersCompleted > 0;
  }).length || 0;
  const totalQuizzesAttempted = attempts?.length || 0;
  const avgOverallScore = attempts && attempts.length > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (a.score / a.max_score) * 100, 0) / attempts.length)
    : 0;

  if (loadingProfiles) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Students</h2>
        <p className="text-muted-foreground">View student progress and performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{totalStudents}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <span className="text-2xl font-bold">{activeStudents}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quiz Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-warning" />
              <span className="text-2xl font-bold">{totalQuizzesAttempted}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Quiz Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <span className="text-2xl font-bold">{avgOverallScore}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      {profiles && profiles.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Quizzes Taken</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Chapters Completed</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => {
                const stats = getStudentStats(profile.user_id);
                return (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {(profile.full_name || 'S')[0].toUpperCase()}
                          </span>
                        </div>
                        {profile.full_name || 'Student'}
                      </div>
                    </TableCell>
                    <TableCell>{stats.totalQuizzes}</TableCell>
                    <TableCell>
                      <span className={stats.avgScore >= 70 ? 'text-success' : stats.avgScore >= 50 ? 'text-warning' : 'text-destructive'}>
                        {stats.avgScore}%
                      </span>
                    </TableCell>
                    <TableCell>{stats.chaptersCompleted}</TableCell>
                    <TableCell>{formatTime(stats.totalTimeSpent)}</TableCell>
                    <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No students yet</h3>
          <p className="text-muted-foreground">Students will appear here once they sign up</p>
        </div>
      )}
    </div>
  );
};

export default StudentsManager;
