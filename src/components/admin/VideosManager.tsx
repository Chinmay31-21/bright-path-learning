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
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Loader2, Video, Play } from 'lucide-react';
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
  subjects?: Subject;
}

interface VideoItem {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  uploaded_by: string | null;
  created_at: string;
  chapters?: Chapter;
}

const VideosManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [formData, setFormData] = useState({
    chapter_id: '',
    title: '',
    description: '',
    video_url: '',
    duration_seconds: 0,
    thumbnail_url: ''
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

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos', selectedSubject],
    queryFn: async () => {
      let query = supabase
        .from('videos')
        .select('*, chapters(id, name, chapter_number, subject_id, subjects(id, name, class_level))')
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data as VideoItem[];
      if (selectedSubject !== 'all') {
        filtered = filtered.filter(v => v.chapters?.subject_id === selectedSubject);
      }
      return filtered;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { uploaded_by: string | undefined }) => {
      const { error } = await supabase.from('videos').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast({ title: 'Video added successfully' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error adding video', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('videos').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast({ title: 'Video updated successfully' });
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error updating video', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast({ title: 'Video deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting video', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({ chapter_id: '', title: '', description: '', video_url: '', duration_seconds: 0, thumbnail_url: '' });
    setEditingVideo(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (video: VideoItem) => {
    setEditingVideo(video);
    setFormData({
      chapter_id: video.chapter_id,
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      duration_seconds: video.duration_seconds || 0,
      thumbnail_url: video.thumbnail_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVideo) {
      updateMutation.mutate({ id: editingVideo.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, uploaded_by: user?.id });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Videos</h2>
          <p className="text-muted-foreground">Manage educational videos for each chapter</p>
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
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingVideo ? 'Edit Video' : 'Add New Video'}</DialogTitle>
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
                  <Label htmlFor="title">Video Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Introduction to Linear Equations"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="video_url">Video URL *</Label>
                  <Input
                    id="video_url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... or direct video URL"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={0}
                      value={formData.duration_seconds}
                      onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">Thumbnail URL</Label>
                    <Input
                      id="thumbnail"
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the video content"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending || !formData.chapter_id}>
                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingVideo ? 'Update' : 'Add'}
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
      ) : videos && videos.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Video</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 rounded bg-muted flex items-center justify-center">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <Play className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span>{video.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {video.chapters?.subjects?.name} - Ch. {video.chapters?.chapter_number}
                  </TableCell>
                  <TableCell>{formatDuration(video.duration_seconds)}</TableCell>
                  <TableCell>{new Date(video.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(video)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(video.id)}
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
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No videos yet</h3>
          <p className="text-muted-foreground mb-4">Add educational videos for your chapters</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideosManager;
