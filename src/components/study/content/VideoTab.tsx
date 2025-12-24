import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Play, 
  Clock, 
  ExternalLink,
  Star,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MaterialReview from './MaterialReview';

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

interface VideoTabProps {
  videos: Video[];
  chapterId: string;
}

const VideoTab = ({ videos, chapterId }: VideoTabProps) => {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showReviews, setShowReviews] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch reviews for videos
  const { data: reviewsData } = useQuery({
    queryKey: ['video-reviews', chapterId],
    queryFn: async () => {
      const videoIds = videos.map(v => v.id);
      const { data, error } = await supabase
        .from('material_reviews')
        .select('content_id, rating')
        .eq('content_type', 'video')
        .in('content_id', videoIds);
      
      if (error) throw error;
      
      // Calculate average ratings
      const ratings: Record<string, { avg: number; count: number }> = {};
      videoIds.forEach(id => {
        const videoReviews = data?.filter(r => r.content_id === id) || [];
        const avg = videoReviews.length > 0 
          ? videoReviews.reduce((sum, r) => sum + r.rating, 0) / videoReviews.length 
          : 0;
        ratings[id] = { avg: Math.round(avg * 10) / 10, count: videoReviews.length };
      });
      
      return ratings;
    }
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoEmbedUrl = (url: string) => {
    // Handle YouTube URLs - use youtube-nocookie.com for enhanced privacy
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      try {
        if (url.includes('youtu.be')) {
          videoId = url.split('/').pop()?.split('?')[0] || '';
        } else if (url.includes('watch?v=')) {
          videoId = new URL(url).searchParams.get('v') || '';
        } else if (url.includes('/embed/')) {
          videoId = url.split('/embed/')[1]?.split('?')[0] || '';
        }
      } catch {
        // Fallback for malformed URLs
        const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : '';
      }
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
    }
    // Handle Vimeo URLs
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop()?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  return (
    <div className="space-y-6">
      {/* Video player section */}
      {selectedVideo && (
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
          <div className="aspect-video bg-black">
            <iframe
              src={getVideoEmbedUrl(selectedVideo.video_url)}
              title={selectedVideo.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
            />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">{selectedVideo.title}</h3>
            {selectedVideo.description && (
              <p className="text-muted-foreground">{selectedVideo.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              {selectedVideo.duration_seconds && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatDuration(selectedVideo.duration_seconds)}
                </div>
              )}
              {reviewsData?.[selectedVideo.id] && reviewsData[selectedVideo.id].count > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-foreground font-medium">
                    {reviewsData[selectedVideo.id].avg}
                  </span>
                  <span className="text-muted-foreground">
                    ({reviewsData[selectedVideo.id].count} reviews)
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReviews(showReviews === selectedVideo.id ? null : selectedVideo.id)}
                className="ml-auto"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Reviews
              </Button>
            </div>
            
            {showReviews === selectedVideo.id && (
              <div className="mt-4 pt-4 border-t">
                <MaterialReview 
                  contentType="video" 
                  contentId={selectedVideo.id} 
                  contentTitle={selectedVideo.title}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video list */}
      <div className="grid gap-4">
        {videos.map((video, index) => {
          const rating = reviewsData?.[video.id];
          const isSelected = selectedVideo?.id === video.id;
          
          return (
            <div
              key={video.id}
              className={`glass-card rounded-xl p-4 transition-all duration-300 animate-fade-in ${
                isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent/50 cursor-pointer'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setSelectedVideo(video)}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail or play button */}
                <div className="relative w-32 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Play className="w-8 h-8 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground mb-1 line-clamp-1">{video.title}</h4>
                  {video.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    {video.duration_seconds && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(video.duration_seconds)}
                      </span>
                    )}
                    {rating && rating.count > 0 && (
                      <span className="text-xs flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {rating.avg} ({rating.count})
                      </span>
                    )}
                    {video.video_type && (
                      <Badge variant="secondary" className="text-xs">
                        {video.video_type}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(video.video_url, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VideoTab;
