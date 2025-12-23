import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Calendar,
  TrendingUp,
  BookOpen,
  Trophy,
  Flame,
  Star
} from 'lucide-react';
import AIChatButton from '@/components/AIChatButton';

interface Subject {
  id: string;
  name: string;
  class_level: number;
}

interface Chapter {
  id: string;
  name: string;
}

interface Milestone {
  id: string;
  user_id: string;
  subject_id: string | null;
  chapter_id: string | null;
  milestone_title: string;
  milestone_description: string | null;
  target_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: number;
  created_at: string;
  completed_at: string | null;
  subjects?: Subject;
  chapters?: Chapter;
}

const Roadmap = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    milestone_title: '',
    milestone_description: '',
    subject_id: '',
    chapter_id: '',
    target_date: '',
    priority: '1'
  });

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('class_level')
        .order('name');
      if (error) throw error;
      return data as Subject[];
    }
  });

  // Fetch chapters
  const { data: chapters } = useQuery({
    queryKey: ['chapters', formData.subject_id],
    queryFn: async () => {
      if (!formData.subject_id) return [];
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('subject_id', formData.subject_id)
        .order('chapter_number');
      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!formData.subject_id
  });

  // Fetch milestones
  const { data: milestones, isLoading } = useQuery({
    queryKey: ['student-roadmap', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('student_roadmap')
        .select(`
          *,
          subjects(id, name, class_level),
          chapters(id, name)
        `)
        .eq('user_id', user.id)
        .order('priority', { ascending: true })
        .order('target_date', { ascending: true });
      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!user?.id
  });

  // Fetch progress stats
  const { data: progressStats } = useQuery({
    queryKey: ['student-progress-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      
      const totalChapters = data.length;
      const completedChapters = data.filter(p => p.progress_percentage === 100).length;
      const avgProgress = totalChapters > 0 
        ? Math.round(data.reduce((acc, p) => acc + (p.progress_percentage || 0), 0) / totalChapters)
        : 0;
      const totalTime = data.reduce((acc, p) => acc + (p.time_spent_seconds || 0), 0);
      
      return { totalChapters, completedChapters, avgProgress, totalTime };
    },
    enabled: !!user?.id
  });

  // Create milestone mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('student_roadmap').insert({
        user_id: user!.id,
        milestone_title: data.milestone_title,
        milestone_description: data.milestone_description || null,
        subject_id: data.subject_id || null,
        chapter_id: data.chapter_id || null,
        target_date: data.target_date || null,
        priority: parseInt(data.priority),
        status: 'pending'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-roadmap'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Milestone added to your roadmap!' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('student_roadmap')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-roadmap'] });
      toast({ title: 'Progress updated!' });
    }
  });

  const resetForm = () => {
    setFormData({
      milestone_title: '',
      milestone_description: '',
      subject_id: '',
      chapter_id: '',
      target_date: '',
      priority: '1'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const completedCount = milestones?.filter(m => m.status === 'completed').length || 0;
  const inProgressCount = milestones?.filter(m => m.status === 'in_progress').length || 0;
  const pendingCount = milestones?.filter(m => m.status === 'pending').length || 0;
  const totalMilestones = milestones?.length || 0;
  const progressPercent = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to view your roadmap</h1>
          <Button onClick={() => window.location.href = '/auth'}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Your Learning Roadmap</h1>
            <p className="text-muted-foreground">Track your progress and achieve your learning goals</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="w-4 h-4 mr-2" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Learning Milestone</DialogTitle>
                <DialogDescription>
                  Set a goal for your learning journey
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Milestone Title *</Label>
                  <Input
                    value={formData.milestone_title}
                    onChange={(e) => setFormData({ ...formData, milestone_title: e.target.value })}
                    placeholder="e.g., Complete Algebra Chapter"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.milestone_description}
                    onChange={(e) => setFormData({ ...formData, milestone_description: e.target.value })}
                    placeholder="What do you want to achieve?"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select
                      value={formData.subject_id}
                      onValueChange={(value) => setFormData({ ...formData, subject_id: value, chapter_id: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} (Class {subject.class_level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Chapter</Label>
                    <Select
                      value={formData.chapter_id}
                      onValueChange={(value) => setFormData({ ...formData, chapter_id: value })}
                      disabled={!formData.subject_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select chapter" />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters?.map((chapter) => (
                          <SelectItem key={chapter.id} value={chapter.id}>
                            {chapter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Date</Label>
                    <Input
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">🔴 High Priority</SelectItem>
                        <SelectItem value="2">🟡 Medium Priority</SelectItem>
                        <SelectItem value="3">🟢 Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    Add Milestone
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedCount}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inProgressCount}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Target className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{progressPercent}%</p>
                  <p className="text-xs text-muted-foreground">Overall</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" />
              Learning Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Roadmap Completion</span>
                  <span className="text-sm text-muted-foreground">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-lg font-bold">{progressStats?.totalChapters || 0}</p>
                  <p className="text-xs text-muted-foreground">Chapters Started</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{progressStats?.completedChapters || 0}</p>
                  <p className="text-xs text-muted-foreground">Chapters Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{progressStats?.avgProgress || 0}%</p>
                  <p className="text-xs text-muted-foreground">Avg. Chapter Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{formatTime(progressStats?.totalTime || 0)}</p>
                  <p className="text-xs text-muted-foreground">Time Studied</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestones List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Milestones</CardTitle>
            <CardDescription>Track and update your learning goals</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : milestones?.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No milestones yet</h3>
                <p className="text-muted-foreground mb-4">Start setting learning goals to track your progress</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Milestone
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {milestones?.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50"
                  >
                    <div className={`p-2 rounded-lg ${getStatusColor(milestone.status)}`}>
                      {getStatusIcon(milestone.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold">{milestone.milestone_title}</h4>
                          {milestone.milestone_description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {milestone.milestone_description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {milestone.priority === 1 && (
                            <Badge variant="destructive">High</Badge>
                          )}
                          {milestone.priority === 2 && (
                            <Badge variant="outline" className="border-warning text-warning">Medium</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        {milestone.subjects && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <BookOpen className="w-3 h-3" />
                            {milestone.subjects.name}
                          </span>
                        )}
                        {milestone.chapters && (
                          <span className="text-xs text-muted-foreground">
                            • {milestone.chapters.name}
                          </span>
                        )}
                        {milestone.target_date && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(milestone.target_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Status Update Buttons */}
                      <div className="flex gap-2 mt-3">
                        {milestone.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: milestone.id, status: 'in_progress' })}
                          >
                            Start
                          </Button>
                        )}
                        {milestone.status === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="gradient"
                            onClick={() => updateStatusMutation.mutate({ id: milestone.id, status: 'completed' })}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {milestone.status === 'completed' && milestone.completed_at && (
                          <span className="text-xs text-success">
                            ✓ Completed {new Date(milestone.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AIChatButton />
    </div>
  );
};

export default Roadmap;
