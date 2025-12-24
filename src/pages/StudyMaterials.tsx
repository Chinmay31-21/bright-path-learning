import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import AIChatButton from '@/components/AIChatButton';
import SelectionHub from '@/components/study/SelectionHub';
import ChapterList from '@/components/study/ChapterList';
import ContentPlayer from '@/components/study/ContentPlayer';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

type ViewState = 'selection' | 'chapters' | 'content';

const StudyMaterials = () => {
  const [viewState, setViewState] = useState<ViewState>('selection');
  const [selectedBoard, setSelectedBoard] = useState<EducationBoard | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  // Fetch all subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('class_level')
        .order('name');
      if (error) throw error;
      return data as Subject[];
    }
  });

  // Fetch chapters for selected subject
  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', selectedSubject?.id],
    queryFn: async () => {
      if (!selectedSubject) return [];
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('subject_id', selectedSubject.id)
        .order('chapter_number');
      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!selectedSubject
  });

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setViewState('chapters');
  };

  const handleSelectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setViewState('content');
  };

  const handleBack = () => {
    if (viewState === 'content') {
      setSelectedChapter(null);
      setViewState('chapters');
    } else if (viewState === 'chapters') {
      setSelectedSubject(null);
      setViewState('selection');
    }
  };

  const getBreadcrumb = () => {
    const parts = ['Study Materials'];
    if (selectedSubject) {
      parts.push(`Class ${selectedSubject.class_level} - ${selectedSubject.name}`);
    }
    if (selectedChapter) {
      parts.push(`Chapter ${selectedChapter.chapter_number}: ${selectedChapter.name}`);
    }
    return parts;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Header with breadcrumb and back button */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-4 mb-4">
              {viewState !== 'selection' && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleBack}
                  className="hover:bg-primary/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getBreadcrumb().map((part, index) => (
                    <span key={index} className="flex items-center gap-2">
                      {index > 0 && <span>/</span>}
                      <span className={index === getBreadcrumb().length - 1 ? 'text-foreground font-medium' : ''}>
                        {part}
                      </span>
                    </span>
                  ))}
                </nav>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {viewState === 'selection' && (
                <>Access Your <span className="gradient-text">Study Materials</span></>
              )}
              {viewState === 'chapters' && selectedSubject && (
                <>{selectedSubject.name} <span className="gradient-text">Chapters</span></>
              )}
              {viewState === 'content' && selectedChapter && (
                <>Chapter {selectedChapter.chapter_number}: <span className="gradient-text">{selectedChapter.name}</span></>
              )}
            </h1>
            <p className="text-muted-foreground">
              {viewState === 'selection' && 'Select your class and subject to access videos, PDFs, and presentations.'}
              {viewState === 'chapters' && 'Choose a chapter to view its content.'}
              {viewState === 'content' && 'Watch videos, read PDFs, and review presentations for this chapter.'}
            </p>
          </div>

          {/* Content based on view state */}
          {viewState === 'selection' && (
            <SelectionHub 
              subjects={subjects || []}
              isLoading={subjectsLoading}
              selectedBoard={selectedBoard}
              selectedClass={selectedClass}
              onBoardChange={setSelectedBoard}
              onClassChange={setSelectedClass}
              onSelectSubject={handleSelectSubject}
            />
          )}

          {viewState === 'chapters' && selectedSubject && (
            <ChapterList 
              chapters={chapters || []}
              isLoading={chaptersLoading}
              subject={selectedSubject}
              onSelectChapter={handleSelectChapter}
            />
          )}

          {viewState === 'content' && selectedChapter && selectedSubject && (
            <ContentPlayer 
              chapter={selectedChapter}
              subject={selectedSubject}
            />
          )}
        </div>
      </main>

      <AIChatButton />
    </div>
  );
};

export default StudyMaterials;
