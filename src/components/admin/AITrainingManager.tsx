import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Brain, FileText, BookOpen } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  board: string;
  class_level: number;
}

interface Chapter {
  id: string;
  name: string;
}

interface TrainingDocument {
  id: string;
  title: string;
  content: string;
  subject_id: string | null;
  chapter_id: string | null;
  board: 'cbse' | 'icse' | 'state' | null;
  class_level: number | null;
  document_type: string;
  is_active: boolean;
  created_at: string;
  subjects?: { id: string; name: string; board: string; class_level: number } | null;
  chapters?: { id: string; name: string } | null;
}

const AITrainingManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TrainingDocument | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subject_id: '',
    chapter_id: '',
    board: '',
    class_level: '',
    document_type: 'general',
    is_active: true
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('class_level', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Subject[];
    }
  });

  // Fetch chapters based on selected subject
  const { data: chapters } = useQuery({
    queryKey: ['chapters', formData.subject_id],
    queryFn: async () => {
      if (!formData.subject_id) return [];
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('subject_id', formData.subject_id)
        .order('chapter_number', { ascending: true });
      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!formData.subject_id
  });

  // Fetch training documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['ai-training-documents', selectedSubject],
    queryFn: async () => {
      let query = supabase
        .from('ai_training_documents')
        .select(`
          *,
          subjects(id, name, board, class_level),
          chapters(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (selectedSubject !== 'all') {
        query = query.eq('subject_id', selectedSubject);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingDocument[];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const insertData: any = {
        title: data.title,
        content: data.content,
        subject_id: data.subject_id || null,
        chapter_id: data.chapter_id || null,
        document_type: data.document_type,
        is_active: data.is_active
      };
      if (data.board) insertData.board = data.board;
      if (data.class_level) insertData.class_level = parseInt(data.class_level);
      
      const { error } = await supabase.from('ai_training_documents').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-documents'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Training document added successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error adding document', description: error.message, variant: 'destructive' });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const updateData: any = {
        title: data.title,
        content: data.content,
        subject_id: data.subject_id || null,
        chapter_id: data.chapter_id || null,
        document_type: data.document_type,
        is_active: data.is_active
      };
      if (data.board) updateData.board = data.board;
      if (data.class_level) updateData.class_level = parseInt(data.class_level);
      
      const { error } = await supabase
        .from('ai_training_documents')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-documents'] });
      setIsDialogOpen(false);
      setEditingDoc(null);
      resetForm();
      toast({ title: 'Training document updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating document', description: error.message, variant: 'destructive' });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_training_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-documents'] });
      toast({ title: 'Training document deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting document', description: error.message, variant: 'destructive' });
    }
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('ai_training_documents')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-documents'] });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      subject_id: '',
      chapter_id: '',
      board: '',
      class_level: '',
      document_type: 'general',
      is_active: true
    });
  };

  const handleEdit = (doc: TrainingDocument) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      content: doc.content,
      subject_id: doc.subject_id || '',
      chapter_id: doc.chapter_id || '',
      board: doc.board || '',
      class_level: doc.class_level?.toString() || '',
      document_type: doc.document_type,
      is_active: doc.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const documentTypes = [
    { value: 'general', label: 'General Knowledge' },
    { value: 'concept', label: 'Concept Explanation' },
    { value: 'formula', label: 'Formulas & Rules' },
    { value: 'example', label: 'Solved Examples' },
    { value: 'tips', label: 'Exam Tips' },
    { value: 'syllabus', label: 'Syllabus Content' }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Training Manager
            </CardTitle>
            <CardDescription>
              Upload content to train the AI Mentor for context-aware responses
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingDoc(null); resetForm(); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Training Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDoc ? 'Edit' : 'Add'} Training Document</DialogTitle>
                <DialogDescription>
                  Add content that will help the AI Mentor provide better answers
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Quadratic Equations - Key Concepts"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select
                      value={formData.document_type}
                      onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Board (Optional)</Label>
                    <Select
                      value={formData.board}
                      onValueChange={(value) => setFormData({ ...formData, board: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select board" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cbse">CBSE</SelectItem>
                        <SelectItem value="icse">ICSE</SelectItem>
                        <SelectItem value="state">State Board</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject (Optional)</Label>
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
                    <Label>Chapter (Optional)</Label>
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

                <div className="space-y-2">
                  <Label>Class Level (Optional)</Label>
                  <Select
                    value={formData.class_level}
                    onValueChange={(value) => setFormData({ ...formData, class_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {[6, 7, 8, 9, 10, 11, 12].map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          Class {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter the training content. Include explanations, formulas, examples, tips, etc."
                    rows={10}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Write clear, structured content. The AI will use this to answer student questions.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active (used by AI Mentor)</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingDoc ? 'Update' : 'Add'} Document
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <Label className="whitespace-nowrap">Filter by Subject:</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All Subjects" />
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{documents?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {documents?.filter(d => d.is_active).length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Active for AI</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(documents?.map(d => d.subject_id).filter(Boolean)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Subjects Covered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : documents?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No training documents yet. Add content to improve AI responses.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject/Class</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {doc.content.substring(0, 100)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.subjects ? (
                        <span>{doc.subjects.name} (Class {doc.subjects.class_level})</span>
                      ) : doc.class_level ? (
                        <span>Class {doc.class_level}</span>
                      ) : (
                        <span className="text-muted-foreground">General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={doc.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: doc.id, isActive: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(doc)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteMutation.mutate(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AITrainingManager;
