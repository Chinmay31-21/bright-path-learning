import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Loader2, FileText, Upload, File, Eye, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type EducationBoard = 'cbse' | 'icse' | 'state';

interface Subject {
  id: string;
  name: string;
  board: EducationBoard;
  class_level: number;
}

interface ChapterDocument {
  id: string;
  chapter_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
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
  const [isDocsDialogOpen, setIsDocsDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [selectedChapterForDocs, setSelectedChapterForDocs] = useState<Chapter | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: '',
    name: '',
    chapter_number: 1,
    description: '',
    syllabus_content: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const { data: chapterDocuments, refetch: refetchDocs } = useQuery({
    queryKey: ['chapter-documents', selectedChapterForDocs?.id],
    queryFn: async () => {
      if (!selectedChapterForDocs) return [];
      const { data, error } = await supabase
        .from('chapter_documents')
        .select('*')
        .eq('chapter_id', selectedChapterForDocs.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ChapterDocument[];
    },
    enabled: !!selectedChapterForDocs
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

  const deleteDocMutation = useMutation({
    mutationFn: async (doc: ChapterDocument) => {
      // Delete from storage
      const filePath = doc.file_url.split('/chapter-documents/')[1];
      if (filePath) {
        await supabase.storage.from('chapter-documents').remove([filePath]);
      }
      // Delete from database
      const { error } = await supabase.from('chapter_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchDocs();
      toast({ title: 'Document deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting document', description: error.message, variant: 'destructive' });
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

  const handleViewDocs = (chapter: Chapter) => {
    setSelectedChapterForDocs(chapter);
    setIsDocsDialogOpen(true);
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedChapterForDocs) return;

    setUploadingDoc(true);
    try {
      for (const file of Array.from(files)) {
        const fileName = `${selectedChapterForDocs.id}/${Date.now()}_${file.name}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('chapter-documents')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chapter-documents')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('chapter_documents')
          .insert({
            chapter_id: selectedChapterForDocs.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user?.id
          });

        if (dbError) throw dbError;
      }

      toast({ title: 'Documents uploaded successfully' });
      refetchDocs();
    } catch (error: any) {
      toast({ title: 'Error uploading documents', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return '📊';
    return '📁';
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chapters</h2>
          <p className="text-muted-foreground">Manage chapters and upload study materials</p>
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
                  <Label htmlFor="syllabus_content">Additional Notes (Optional)</Label>
                  <Textarea
                    id="syllabus_content"
                    value={formData.syllabus_content}
                    onChange={(e) => setFormData({ ...formData, syllabus_content: e.target.value })}
                    placeholder="Any additional notes or key concepts (documents will be the primary source for AI training)"
                    rows={3}
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
                <TableHead>Documents</TableHead>
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
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleViewDocs(chapter)}>
                      <File className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  </TableCell>
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

      {/* Documents Management Dialog */}
      <Dialog open={isDocsDialogOpen} onOpenChange={setIsDocsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Documents for {selectedChapterForDocs?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Upload Section */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload PDF, Word documents, or other study materials
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                onChange={handleDocUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
              >
                {uploadingDoc ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Select Files
                  </>
                )}
              </Button>
            </div>

            {/* Documents List */}
            {chapterDocuments && chapterDocuments.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Uploaded Documents</h4>
                <div className="space-y-2">
                  {chapterDocuments.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getFileIcon(doc.file_type)}</span>
                        <div>
                          <p className="font-medium text-sm">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteDocMutation.mutate(doc)}
                          disabled={deleteDocMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChaptersManager;