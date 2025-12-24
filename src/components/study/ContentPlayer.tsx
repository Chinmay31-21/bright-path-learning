import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video as VideoIcon, 
  FileText, 
  Presentation,
  Loader2
} from 'lucide-react';
import VideoTab from './content/VideoTab';
import DocumentTab from './content/DocumentTab';
import DemandWidget from './content/DemandWidget';

type EducationBoard = 'cbse' | 'icse' | 'state';

interface Subject {
  id: string;
  name: string;
  board: EducationBoard;
  class_level: number;
  description: string | null;
  icon: string | null;
}

interface Chapter {
  id: string;
  name: string;
  chapter_number: number;
  description: string | null;
  subject_id: string;
  syllabus_content: string | null;
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  video_type: string | null;
  created_at: string;
}

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface ContentPlayerProps {
  chapter: Chapter;
  subject: Subject;
}

const ContentPlayer = ({ chapter, subject }: ContentPlayerProps) => {
  const [activeTab, setActiveTab] = useState('videos');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch videos for this chapter
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ['chapter-videos', chapter.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('chapter_id', chapter.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Video[];
    }
  });

  // Fetch documents for this chapter
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['chapter-documents', chapter.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapter_documents')
        .select('*')
        .eq('chapter_id', chapter.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Document[];
    }
  });

  // Fetch user's content requests for this chapter
  const { data: contentRequests } = useQuery({
    queryKey: ['content-requests', chapter.id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('content_requests')
        .select('*')
        .eq('chapter_id', chapter.id)
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch request counts for this chapter
  const { data: requestCounts } = useQuery({
    queryKey: ['content-request-counts', chapter.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_requests')
        .select('content_type')
        .eq('chapter_id', chapter.id)
        .eq('status', 'pending');
      if (error) throw error;
      
      const counts = { video: 0, pdf: 0, ppt: 0 };
      data?.forEach(r => {
        if (r.content_type === 'video') counts.video++;
        else if (r.content_type === 'pdf') counts.pdf++;
        else if (r.content_type === 'ppt') counts.ppt++;
      });
      return counts;
    }
  });

  // Create content request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (contentType: 'video' | 'pdf' | 'ppt') => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('content_requests')
        .insert({
          user_id: user.id,
          chapter_id: chapter.id,
          content_type: contentType
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-requests', chapter.id] });
      queryClient.invalidateQueries({ queryKey: ['content-request-counts', chapter.id] });
      toast({
        title: 'Request Sent!',
        description: 'We\'ve noted your request. The admin will be notified.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Separate documents into PDFs and PPTs
  const pdfs = documents?.filter(d => 
    d.file_type?.includes('pdf') || d.file_name?.toLowerCase().endsWith('.pdf')
  ) || [];
  
  const ppts = documents?.filter(d => 
    d.file_type?.includes('presentation') || 
    d.file_type?.includes('ppt') ||
    d.file_name?.toLowerCase().endsWith('.ppt') ||
    d.file_name?.toLowerCase().endsWith('.pptx')
  ) || [];

  // Check if user has already requested content
  const hasRequestedVideo = contentRequests?.some(r => r.content_type === 'video');
  const hasRequestedPdf = contentRequests?.some(r => r.content_type === 'pdf');
  const hasRequestedPpt = contentRequests?.some(r => r.content_type === 'ppt');

  const isLoading = videosLoading || documentsLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Chapter info card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">{chapter.chapter_number}</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">{chapter.name}</h2>
            <p className="text-sm text-muted-foreground">
              {subject.name} • Class {subject.class_level}
            </p>
            {chapter.description && (
              <p className="text-sm text-muted-foreground mt-2">{chapter.description}</p>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading content...</span>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <VideoIcon className="w-4 h-4" />
              Videos
              {videos && videos.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                  {videos.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pdfs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              PDFs
              {pdfs.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                  {pdfs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ppts" className="flex items-center gap-2">
              <Presentation className="w-4 h-4" />
              PPTs
              {ppts.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                  {ppts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4">
            {videos && videos.length > 0 ? (
              <VideoTab videos={videos} chapterId={chapter.id} />
            ) : (
              <DemandWidget
                contentType="video"
                hasRequested={hasRequestedVideo || false}
                requestCount={requestCounts?.video || 0}
                onRequest={() => createRequestMutation.mutate('video')}
                isLoading={createRequestMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="pdfs" className="space-y-4">
            {pdfs.length > 0 ? (
              <DocumentTab documents={pdfs} type="pdf" />
            ) : (
              <DemandWidget
                contentType="pdf"
                hasRequested={hasRequestedPdf || false}
                requestCount={requestCounts?.pdf || 0}
                onRequest={() => createRequestMutation.mutate('pdf')}
                isLoading={createRequestMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="ppts" className="space-y-4">
            {ppts.length > 0 ? (
              <DocumentTab documents={ppts} type="ppt" />
            ) : (
              <DemandWidget
                contentType="ppt"
                hasRequested={hasRequestedPpt || false}
                requestCount={requestCounts?.ppt || 0}
                onRequest={() => createRequestMutation.mutate('ppt')}
                isLoading={createRequestMutation.isPending}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ContentPlayer;
