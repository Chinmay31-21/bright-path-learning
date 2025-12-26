import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StudentProgress {
  id: string;
  user_id: string;
  chapter_id: string;
  progress_percentage: number;
  time_spent_seconds: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  answers: any;
  started_at: string;
  completed_at: string | null;
}

export const useStudentProgress = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all progress for current user
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['student-progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('student_progress')
        .select(`
          *,
          chapters:chapter_id (
            id, name, chapter_number,
            subjects:subject_id (id, name, icon)
          )
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch quiz attempts
  const { data: quizAttempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['quiz-attempts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes:quiz_id (
            id, title, time_limit_minutes,
            chapters:chapter_id (
              id, name,
              subjects:subject_id (id, name)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch subjects with chapter counts
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects-with-progress', user?.id],
    queryFn: async () => {
      const { data: allSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          *,
          chapters (id)
        `);
      
      if (subjectsError) throw subjectsError;

      if (!user) {
        return allSubjects?.map(s => ({
          ...s,
          totalChapters: s.chapters?.length || 0,
          completedChapters: 0,
          progressPercentage: 0,
        }));
      }

      // Get completed chapters for user
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('chapter_id, progress_percentage')
        .eq('user_id', user.id)
        .gte('progress_percentage', 100);

      const completedChapterIds = new Set(progressData?.map(p => p.chapter_id) || []);

      return allSubjects?.map(subject => {
        const totalChapters = subject.chapters?.length || 0;
        const completedChapters = subject.chapters?.filter((ch: any) => completedChapterIds.has(ch.id)).length || 0;
        return {
          ...subject,
          totalChapters,
          completedChapters,
          progressPercentage: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0,
        };
      });
    },
    enabled: true,
  });

  // Update progress mutation
  const updateProgress = useMutation({
    mutationFn: async ({ chapterId, progressPercentage, timeSpent }: { 
      chapterId: string; 
      progressPercentage: number;
      timeSpent?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('student_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('student_progress')
          .update({
            progress_percentage: Math.max(existing.progress_percentage, progressPercentage),
            time_spent_seconds: (existing.time_spent_seconds || 0) + (timeSpent || 0),
            completed_at: progressPercentage >= 100 ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('student_progress')
          .insert({
            user_id: user.id,
            chapter_id: chapterId,
            progress_percentage: progressPercentage,
            time_spent_seconds: timeSpent || 0,
            completed_at: progressPercentage >= 100 ? new Date().toISOString() : null,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-progress'] });
      queryClient.invalidateQueries({ queryKey: ['subjects-with-progress'] });
    },
  });

  // Save quiz attempt
  const saveQuizAttempt = useMutation({
    mutationFn: async ({ 
      quizId, 
      score, 
      maxScore, 
      answers,
      completed = false 
    }: { 
      quizId: string; 
      score: number;
      maxScore: number;
      answers: any;
      completed?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check for existing incomplete attempt
      const { data: existing } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('quiz_id', quizId)
        .is('completed_at', null)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('quiz_attempts')
          .update({
            score,
            max_score: maxScore,
            answers,
            completed_at: completed ? new Date().toISOString() : null,
          })
          .eq('id', existing.id);
        
        if (error) throw error;
        return existing.id;
      } else {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .insert({
            user_id: user.id,
            quiz_id: quizId,
            score,
            max_score: maxScore,
            answers,
            completed_at: completed ? new Date().toISOString() : null,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] });
    },
  });

  // Get incomplete attempts (for resume feature)
  const getIncompleteAttempts = () => {
    return quizAttempts?.filter(attempt => !attempt.completed_at) || [];
  };

  // Calculate stats
  const stats = {
    testsCompleted: quizAttempts?.filter(a => a.completed_at).length || 0,
    studyHours: Math.round((progress?.reduce((acc, p) => acc + (p.time_spent_seconds || 0), 0) || 0) / 3600),
    avgScore: quizAttempts?.filter(a => a.completed_at).length 
      ? Math.round(
          quizAttempts
            .filter(a => a.completed_at)
            .reduce((acc, a) => acc + (a.score / a.max_score) * 100, 0) / 
          quizAttempts.filter(a => a.completed_at).length
        )
      : 0,
    coursesActive: subjects?.filter(s => s.progressPercentage > 0 && s.progressPercentage < 100).length || 0,
    overallProgress: subjects?.length 
      ? Math.round(subjects.reduce((acc, s) => acc + s.progressPercentage, 0) / subjects.length)
      : 0,
  };

  return {
    progress,
    quizAttempts,
    subjects,
    stats,
    isLoading: progressLoading || attemptsLoading || subjectsLoading,
    updateProgress,
    saveQuizAttempt,
    getIncompleteAttempts,
  };
};
