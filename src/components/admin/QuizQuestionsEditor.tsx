import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Quiz {
  id: string;
  title: string;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  points: number;
  order_index: number;
}

interface Props {
  quiz: Quiz;
  onBack: () => void;
}

const QuizQuestionsEditor = ({ quiz, onBack }: Props) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'mcq' as 'mcq' | 'true_false' | 'short_answer',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    points: 1
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['quiz_questions', quiz.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data as QuizQuestion[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<QuizQuestion, 'id'>) => {
      const { error } = await supabase.from('quiz_questions').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz_questions', quiz.id] });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast({ title: 'Question added successfully' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error adding question', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuizQuestion> }) => {
      const { error } = await supabase.from('quiz_questions').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz_questions', quiz.id] });
      toast({ title: 'Question updated successfully' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error updating question', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz_questions', quiz.id] });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast({ title: 'Question deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting question', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      question_text: '',
      question_type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      points: 1
    });
    setEditingQuestion(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || ['', '', '', ''],
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
      points: question.points
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const questionData = {
      quiz_id: quiz.id,
      question_text: formData.question_text,
      question_type: formData.question_type,
      options: formData.question_type === 'mcq' ? formData.options.filter(o => o.trim()) : null,
      correct_answer: formData.correct_answer,
      explanation: formData.explanation || null,
      points: formData.points,
      order_index: editingQuestion?.order_index ?? (questions?.length || 0) + 1
    };

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, data: questionData });
    } else {
      createMutation.mutate(questionData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quizzes
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">{quiz.title}</h2>
          <p className="text-muted-foreground">Manage questions for this quiz</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question_text">Question *</Label>
                <Textarea
                  id="question_text"
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="Enter your question here..."
                  rows={3}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="question_type">Question Type</Label>
                  <Select
                    value={formData.question_type}
                    onValueChange={(value: 'mcq' | 'true_false' | 'short_answer') => {
                      setFormData({ 
                        ...formData, 
                        question_type: value,
                        options: value === 'mcq' ? ['', '', '', ''] : 
                                 value === 'true_false' ? ['True', 'False'] : [],
                        correct_answer: ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min={1}
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              
              {formData.question_type === 'mcq' && (
                <div className="space-y-3">
                  <Label>Options</Label>
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-6">{String.fromCharCode(65 + index)}.</span>
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index] = e.target.value;
                          setFormData({ ...formData, options: newOptions });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="correct_answer">Correct Answer *</Label>
                {formData.question_type === 'mcq' ? (
                  <Select
                    value={formData.correct_answer}
                    onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct answer" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.options.filter(o => o.trim()).map((option, index) => (
                        <SelectItem key={index} value={option}>
                          {String.fromCharCode(65 + index)}. {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : formData.question_type === 'true_false' ? (
                  <Select
                    value={formData.correct_answer}
                    onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct answer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="True">True</SelectItem>
                      <SelectItem value="False">False</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="correct_answer"
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    placeholder="Enter correct answer"
                    required
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation (shown after answering)</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Explain why this is the correct answer..."
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingQuestion ? 'Update' : 'Add'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card key={question.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground mt-1" />
                    <div>
                      <CardTitle className="text-base font-medium">
                        Q{index + 1}. {question.question_text}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {question.question_type === 'mcq' ? 'Multiple Choice' : 
                         question.question_type === 'true_false' ? 'True/False' : 'Short Answer'} 
                        • {question.points} point{question.points > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(question)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(question.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {question.options && (
                  <div className="space-y-2 mb-3">
                    {(question.options as string[]).map((option, optIndex) => (
                      <div 
                        key={optIndex} 
                        className={`p-2 rounded-lg text-sm ${
                          option === question.correct_answer 
                            ? 'bg-success/10 text-success border border-success/20' 
                            : 'bg-muted'
                        }`}
                      >
                        {String.fromCharCode(65 + optIndex)}. {option}
                        {option === question.correct_answer && ' ✓'}
                      </div>
                    ))}
                  </div>
                )}
                {question.question_type === 'short_answer' && (
                  <p className="text-sm text-success">Answer: {question.correct_answer}</p>
                )}
                {question.explanation && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    Explanation: {question.explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card p-12 text-center">
          <p className="text-muted-foreground mb-4">No questions added yet</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Question
          </Button>
        </Card>
      )}
    </div>
  );
};

export default QuizQuestionsEditor;
