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
import { Plus, Pencil, Trash2, Loader2, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type EducationBoard = 'cbse' | 'icse' | 'state';

interface Subject {
  id: string;
  name: string;
  board: EducationBoard;
  class_level: number;
}

interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  chapter_number: number;
  description: string | null;
  syllabus_content: string | null;
  created_at: string;
  subjects?: Subject;
}

const ChaptersManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [formData, setFormData] = useState({
    subject_id: '',
    name: '',
    chapter_number: 1,
    description: '',
    syllabus_content: ''
  });
  
  const { toast } = useToast();
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

  const { data: chapters, isLoading } = useQuery({
    queryKey: ['chapters', selectedSubject],
    queryFn: async () => {
      let query = supabase
        .from('chapters')
        .select('*, subjects(id, name, board, class_level)')
        .order('chapter_number', { ascending: true });
      
      if (selectedSubject !== 'all') {
        query = query.eq('subject_id', selectedSubject);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Chapter[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('chapters').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      toast({ title: 'Chapter created successfully' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error creating chapter', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('chapters').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      toast({ title: 'Chapter updated successfully' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error updating chapter', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chapters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      toast({ title: 'Chapter deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting chapter', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({ subject_id: '', name: '', chapter_number: 1, description: '', syllabus_content: '' });
    setEditingChapter(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      subject_id: chapter.subject_id,
      name: chapter.name,
      chapter_number: chapter.chapter_number,
      description: chapter.description || '',
      syllabus_content: chapter.syllabus_content || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChapter) {
      updateMutation.mutate({ id: editingChapter.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chapters</h2>
          <p className="text-muted-foreground">Manage chapters for each subject</p>
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
                Add Chapter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingChapter ? 'Edit Chapter' : 'Add New Chapter'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select
                      value={formData.subject_id}
                      onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
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
                    <Label htmlFor="chapter_number">Chapter Number</Label>
                    <Input
                      id="chapter_number"
                      type="number"
                      min={1}
                      value={formData.chapter_number}
                      onChange={(e) => setFormData({ ...formData, chapter_number: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Chapter Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Introduction to Algebra"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the chapter"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="syllabus_content">Syllabus Content (for AI training)</Label>
                  <Textarea
                    id="syllabus_content"
                    value={formData.syllabus_content}
                    onChange={(e) => setFormData({ ...formData, syllabus_content: e.target.value })}
                    placeholder="Enter detailed syllabus content, key concepts, and topics covered..."
                    rows={6}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending || !formData.subject_id}>
                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingChapter ? 'Update' : 'Create'}
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
      ) : chapters && chapters.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chapter</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chapters.map((chapter) => (
                <TableRow key={chapter.id}>
                  <TableCell className="font-medium">
                    Ch. {chapter.chapter_number}: {chapter.name}
                  </TableCell>
                  <TableCell>
                    {chapter.subjects?.name} (Class {chapter.subjects?.class_level})
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{chapter.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(chapter)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(chapter.id)}
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
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No chapters yet</h3>
          <p className="text-muted-foreground mb-4">Add chapters for your subjects</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Chapter
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChaptersManager;
