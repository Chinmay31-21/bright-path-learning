import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Loader2, ClipboardList, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import QuizQuestionsEditor from './QuizQuestionsEditor';

type EducationBoard = 'cbse' | 'icse' | 'state';

interface Subject {
  id: string;
  name: string;
  board: EducationBoard;
  class_level: number;
}

interface Chapter {
  id: string;
  name: string;
  chapter_number: number;
  subject_id: string;
  subjects?: Subject;
}

interface Quiz {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  chapters?: Chapter;
  quiz_questions?: { id: string }[];
}

const QuizzesManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [questionsQuiz, setQuestionsQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState({
    chapter_id: '',
    title: '',
    description: '',
    time_limit_minutes: 30,
    is_published: false
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Subject[];
    }
  });

  const { data: chapters } = useQuery({
    queryKey: ['all-chapters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('*, subjects(id, name, board, class_level)')
        .order('chapter_number');
      if (error) throw error;
      return data as Chapter[];
    }
  });

  const filteredChapters = selectedSubject === 'all' 
    ? chapters 
    : chapters?.filter(c => c.subject_id === selectedSubject);

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['quizzes', selectedSubject],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, chapters(id, name, chapter_number, subject_id, subjects(id, name, class_level)), quiz_questions(id)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      let filtered = data as Quiz[];
      if (selectedSubject !== 'all') {
        filtered = filtered.filter(q => q.chapters?.subject_id === selectedSubject);
      }
      return filtered;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { created_by: string | undefined }) => {
      const { error } = await supabase.from('quizzes').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast({ title: 'Quiz created successfully' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error creating quiz', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('quizzes').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast({ title: 'Quiz updated successfully' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error updating quiz', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quizzes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast({ title: 'Quiz deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting quiz', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({ chapter_id: '', title: '', description: '', time_limit_minutes: 30, is_published: false });
    setEditingQuiz(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      chapter_id: quiz.chapter_id,
      title: quiz.title,
      description: quiz.description || '',
      time_limit_minutes: quiz.time_limit_minutes || 30,
      is_published: quiz.is_published
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuiz) {
      updateMutation.mutate({ id: editingQuiz.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, created_by: user?.id });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (questionsQuiz) {
    return (
      <QuizQuestionsEditor 
        quiz={questionsQuiz} 
        onBack={() => setQuestionsQuiz(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quizzes</h2>
          <p className="text-muted-foreground">Create and manage quizzes for students</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name} (Class {subject.class_level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chapter">Chapter *</Label>
                  <Select
                    value={formData.chapter_id}
                    onValueChange={(value) => setFormData({ ...formData, chapter_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredChapters?.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.subjects?.name} - Ch. {chapter.chapter_number}: {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Chapter 1 Assessment"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    min={1}
                    value={formData.time_limit_minutes}
                    onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 30 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the quiz"
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_published">Published (visible to students)</Label>
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending || !formData.chapter_id}>
                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingQuiz ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : quizzes && quizzes.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quiz</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell className="font-medium">{quiz.title}</TableCell>
                  <TableCell>
                    {quiz.chapters?.subjects?.name} - Ch. {quiz.chapters?.chapter_number}
                  </TableCell>
                  <TableCell>{quiz.quiz_questions?.length || 0}</TableCell>
                  <TableCell>{quiz.time_limit_minutes} min</TableCell>
                  <TableCell>
                    <Badge variant={quiz.is_published ? 'default' : 'secondary'}>
                      {quiz.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setQuestionsQuiz(quiz)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(quiz)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(quiz.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No quizzes yet</h3>
          <p className="text-muted-foreground mb-4">Create quizzes to test student knowledge</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Quiz
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuizzesManager;
