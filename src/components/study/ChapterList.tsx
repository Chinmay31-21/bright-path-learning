import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BookOpen, 
  ChevronRight, 
  Loader2,
  FileText,
  Video,
  FileCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';

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

interface ChapterListProps {
  chapters: Chapter[];
  isLoading: boolean;
  subject: Subject;
  onSelectChapter: (chapter: Chapter) => void;
}

const ChapterList = ({
  chapters,
  isLoading,
  subject,
  onSelectChapter
}: ChapterListProps) => {
  const { user } = useAuth();

  // Fetch content counts for each chapter
  const { data: contentCounts } = useQuery({
    queryKey: ['chapter-content-counts', subject.id],
    queryFn: async () => {
      const chapterIds = chapters.map(c => c.id);
      
      // Fetch video counts
      const { data: videos } = await supabase
        .from('videos')
        .select('chapter_id')
        .in('chapter_id', chapterIds);
      
      // Fetch document counts
      const { data: documents } = await supabase
        .from('chapter_documents')
        .select('chapter_id, file_type')
        .in('chapter_id', chapterIds);
      
      // Count by chapter
      const counts: Record<string, { videos: number; pdfs: number; ppts: number }> = {};
      chapterIds.forEach(id => {
        counts[id] = { videos: 0, pdfs: 0, ppts: 0 };
      });
      
      videos?.forEach(v => {
        if (counts[v.chapter_id]) {
          counts[v.chapter_id].videos++;
        }
      });
      
      documents?.forEach(d => {
        if (counts[d.chapter_id]) {
          if (d.file_type?.includes('pdf')) {
            counts[d.chapter_id].pdfs++;
          } else if (d.file_type?.includes('presentation') || d.file_type?.includes('ppt')) {
            counts[d.chapter_id].ppts++;
          }
        }
      });
      
      return counts;
    },
    enabled: chapters.length > 0
  });

  // Fetch student progress for chapters
  const { data: studentProgress } = useQuery({
    queryKey: ['student-progress', subject.id, user?.id],
    queryFn: async () => {
      if (!user) return {};
      
      const { data } = await supabase
        .from('student_progress')
        .select('chapter_id, progress_percentage')
        .eq('user_id', user.id)
        .in('chapter_id', chapters.map(c => c.id));
      
      const progress: Record<string, number> = {};
      data?.forEach(p => {
        progress[p.chapter_id] = p.progress_percentage || 0;
      });
      
      return progress;
    },
    enabled: chapters.length > 0 && !!user
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading chapters...</span>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Chapters Available</h3>
        <p className="text-muted-foreground">
          Chapters for this subject haven't been added yet. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Subject info card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">{subject.name}</h2>
            <p className="text-sm text-muted-foreground">
              Class {subject.class_level} • {chapters.length} Chapters
            </p>
          </div>
          <Badge variant="secondary">{subject.board.toUpperCase()}</Badge>
        </div>
      </div>

      {/* Chapter list */}
      <div className="space-y-4">
        {chapters.map((chapter, index) => {
          const counts = contentCounts?.[chapter.id] || { videos: 0, pdfs: 0, ppts: 0 };
          const progress = studentProgress?.[chapter.id] || 0;
          const totalContent = counts.videos + counts.pdfs + counts.ppts;
          
          return (
            <button
              key={chapter.id}
              onClick={() => onSelectChapter(chapter)}
              className="w-full glass-card rounded-2xl p-6 text-left hover-lift group transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Chapter number badge */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{chapter.chapter_number}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {chapter.name}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                  
                  {chapter.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {chapter.description}
                    </p>
                  )}
                  
                  {/* Content indicators */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Video className="w-4 h-4 text-blue-500" />
                      <span className={counts.videos > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                        {counts.videos} Videos
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span className={counts.pdfs > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                        {counts.pdfs} PDFs
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <FileCheck className="w-4 h-4 text-orange-500" />
                      <span className={counts.ppts > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                        {counts.ppts} PPTs
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  {progress > 0 && (
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-sm font-medium text-primary">{progress}%</span>
                    </div>
                  )}
                  
                  {totalContent === 0 && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      No content yet
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChapterList;
