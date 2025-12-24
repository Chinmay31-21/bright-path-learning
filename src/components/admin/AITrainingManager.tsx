import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Brain, FileText, BookOpen, Upload, FileUp, CheckCircle, Clock, AlertCircle, File } from 'lucide-react';

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
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  parsed_content: string | null;
  training_status: string | null;
  subjects?: { id: string; name: string; board: string; class_level: number } | null;
  chapters?: { id: string; name: string } | null;
}

const AITrainingManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TrainingDocument | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    chapter_id: '',
    board: '',
    class_level: '',
    document_type: 'general',
    is_active: true,
    file: null as File | null
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

  // Upload file and create document
  const uploadMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.file) throw new Error('No file selected');
      
      setIsUploading(true);
      setUploadProgress(10);

      // Upload file to storage
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;
      
      setUploadProgress(30);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('training-documents')
        .upload(filePath, data.file);
      
      if (uploadError) throw uploadError;
      
      setUploadProgress(60);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('training-documents')
        .getPublicUrl(filePath);
      
      setUploadProgress(80);
      
      // Create database record
      const insertData: any = {
        title: data.title,
        content: `Document: ${data.file.name}`,
        subject_id: data.subject_id || null,
        chapter_id: data.chapter_id || null,
        document_type: data.document_type,
        is_active: data.is_active,
        file_url: urlData.publicUrl,
        file_name: data.file.name,
        file_type: data.file.type,
        file_size: data.file.size,
        training_status: 'processing'
      };
      if (data.board) insertData.board = data.board;
      if (data.class_level) insertData.class_level = parseInt(data.class_level);
      
      const { error: dbError, data: docData } = await supabase
        .from('ai_training_documents')
        .insert(insertData)
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      setUploadProgress(100);
      
      // Trigger document parsing (simulate for now - in production you'd have a backend process)
      setTimeout(async () => {
        await supabase
          .from('ai_training_documents')
          .update({ training_status: 'completed' })
          .eq('id', docData.id);
        queryClient.invalidateQueries({ queryKey: ['ai-training-documents'] });
      }, 3000);
      
      return docData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-training-documents'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Document uploaded successfully', description: 'AI is now processing the document...' });
    },
    onError: (error) => {
      toast({ title: 'Error uploading document', description: error.message, variant: 'destructive' });
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadProgress(0);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: TrainingDocument) => {
      // Delete file from storage if exists
      if (doc.file_url) {
        const filePath = doc.file_url.split('/').pop();
        if (filePath) {
          await supabase.storage.from('training-documents').remove([`documents/${filePath}`]);
        }
      }
      
      const { error } = await supabase.from('ai_training_documents').delete().eq('id', doc.id);
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
      subject_id: '',
      chapter_id: '',
      board: '',
      class_level: '',
      document_type: 'general',
      is_active: true,
      file: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, file, title: formData.title || file.name.replace(/\.[^/.]+$/, '') });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate(formData);
  };

  const documentTypes = [
    { value: 'general', label: 'General Knowledge' },
    { value: 'concept', label: 'Concept Explanation' },
    { value: 'formula', label: 'Formulas & Rules' },
    { value: 'example', label: 'Solved Examples' },
    { value: 'tips', label: 'Exam Tips' },
    { value: 'syllabus', label: 'Syllabus Content' },
    { value: 'textbook', label: 'Textbook Chapter' }
  ];

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Trained</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Calculate training stats
  const totalDocs = documents?.length || 0;
  const trainedDocs = documents?.filter(d => d.training_status === 'completed').length || 0;
  const processingDocs = documents?.filter(d => d.training_status === 'processing').length || 0;
  const trainingProgress = totalDocs > 0 ? Math.round((trainedDocs / totalDocs) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Training Center
            </CardTitle>
            <CardDescription>
              Upload PDFs and documents to train the AI Mentor
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingDoc(null); resetForm(); }}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Training Document</DialogTitle>
                <DialogDescription>
                  Upload PDF or document files to train the AI Mentor
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>Document File *</Label>
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {formData.file ? (
                      <div className="flex items-center justify-center gap-3">
                        <File className="w-10 h-10 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{formData.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(formData.file.size)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FileUp className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, DOCX, TXT, MD (max 10MB)
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Physics Chapter 5 - Laws of Motion"
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

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active (used by AI Mentor)</Label>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!formData.file || isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload & Train'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Training Progress Overview */}
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <span className="font-semibold">AI Training Progress</span>
            </div>
            <span className="text-lg font-bold text-primary">{trainingProgress}%</span>
          </div>
          <Progress value={trainingProgress} className="h-3 mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{trainedDocs} documents trained</span>
            {processingDocs > 0 && <span>{processingDocs} processing...</span>}
            <span>{totalDocs} total</span>
          </div>
        </div>

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDocs}</p>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{trainedDocs}</p>
                  <p className="text-sm text-muted-foreground">Trained</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{processingDocs}</p>
                  <p className="text-sm text-muted-foreground">Processing</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-blue-500" />
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
        </div>

        {/* Documents Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
        ) : documents && documents.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {doc.file_url ? (
                          <File className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          {doc.file_name && (
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.subjects ? (
                        <span className="text-sm">
                          {doc.subjects.name} (Class {doc.subjects.class_level})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.training_status)}
                        {getStatusBadge(doc.training_status)}
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={doc.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: doc.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {doc.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <BookOpen className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(doc)}
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
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No training documents yet</p>
            <p className="text-sm mt-1">Upload PDFs and documents to train the AI Mentor</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AITrainingManager;