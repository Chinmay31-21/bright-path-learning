import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Loader2, FileText, Upload, Download, ExternalLink } from 'lucide-react';
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
  name: string;
  chapter_number: number;
  subject_id: string;
}

interface SyllabusDocument {
  id: string;
  chapter_id: string | null;
  subject_id: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  subjects?: Subject;
  chapters?: Chapter;
}

const SyllabusManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: '',
    chapter_id: '',
    file: null as File | null
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

  const { data: documents, isLoading } = useQuery({
    queryKey: ['syllabus_documents', selectedSubject],
    queryFn: async () => {
      let query = supabase
        .from('syllabus_documents')
        .select('*, subjects(id, name, board, class_level), chapters(id, name, chapter_number)')
        .order('created_at', { ascending: false });
      
      if (selectedSubject !== 'all') {
        query = query.eq('subject_id', selectedSubject);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SyllabusDocument[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: SyllabusDocument) => {
      // Delete file from storage
      const filePath = doc.file_url.split('/').pop();
      if (filePath) {
        await supabase.storage.from('syllabus').remove([filePath]);
      }
      
      // Delete record from database
      const { error } = await supabase.from('syllabus_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syllabus_documents'] });
      toast({ title: 'Document deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting document', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({ subject_id: '', chapter_id: '', file: null });
    setIsDialogOpen(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.subject_id) return;

    setUploading(true);
    try {
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('syllabus')
        .upload(fileName, formData.file);
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('syllabus')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from('syllabus_documents').insert([{
        subject_id: formData.subject_id,
        chapter_id: formData.chapter_id || null,
        file_name: formData.file.name,
        file_url: urlData.publicUrl,
        file_size: formData.file.size,
        uploaded_by: user?.id
      }]);

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['syllabus_documents'] });
      toast({ title: 'Document uploaded successfully' });
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error uploading document', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Syllabus Documents</h2>
          <p className="text-muted-foreground">Upload PDFs to train the AI mentor</p>
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
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Syllabus Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
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
                  <Label htmlFor="chapter">Chapter (optional)</Label>
                  <Select
                    value={formData.chapter_id}
                    onValueChange={(value) => setFormData({ ...formData, chapter_id: value })}
                    disabled={!formData.subject_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific chapter</SelectItem>
                      {chapters?.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          Ch. {chapter.chapter_number}: {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file">PDF File *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading || !formData.file || !formData.subject_id}>
                    {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Upload
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
      ) : documents && documents.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-destructive" />
                      {doc.file_name}
                    </div>
                  </TableCell>
                  <TableCell>{doc.subjects?.name}</TableCell>
                  <TableCell>
                    {doc.chapters ? `Ch. ${doc.chapters.chapter_number}: ${doc.chapters.name}` : '-'}
                  </TableCell>
                  <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                  <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                      >
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(doc)}
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
          <h3 className="text-lg font-semibold text-foreground mb-2">No documents uploaded</h3>
          <p className="text-muted-foreground mb-4">Upload syllabus PDFs to train the AI mentor</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload PDF
          </Button>
        </div>
      )}
    </div>
  );
};

export default SyllabusManager;
