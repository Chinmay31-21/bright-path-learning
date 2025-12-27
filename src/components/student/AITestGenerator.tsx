import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Brain, FileText, AlertCircle, CheckCircle, BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  subjects: Subject;
  has_content: boolean;
  content_count: number;
}

const AITestGenerator = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState('10');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('class_level')
        .order('name');
      if (error) throw error;
      return data as Subject[];
    },
  });

  // Fetch chapters with content availability
  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters-with-content', selectedSubject],
    queryFn: async () => {
      if (!selectedSubject) return [];
      
      // Get chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*, subjects(id, name, board, class_level)')
        .eq('subject_id', selectedSubject)
        .order('chapter_number');
      
      if (chaptersError) throw chaptersError;
      
      // For each chapter, check if it has training documents or chapter documents
      const chaptersWithContent = await Promise.all(
        (chaptersData || []).map(async (chapter) => {
          // Check training documents
          const { count: trainingCount } = await supabase
            .from('ai_training_documents')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('training_status', 'completed')
            .or(`chapter_id.eq.${chapter.id},and(chapter_id.is.null,class_level.eq.${chapter.subjects.class_level})`);
          
          // Check chapter documents
          const { count: docsCount } = await supabase
            .from('chapter_documents')
            .select('*', { count: 'exact', head: true })
            .eq('chapter_id', chapter.id);
          
          const totalContent = (trainingCount || 0) + (docsCount || 0);
          
          return {
            ...chapter,
            has_content: totalContent > 0 || !!chapter.syllabus_content || !!chapter.description,
            content_count: totalContent,
          };
        })
      );
      
      return chaptersWithContent as Chapter[];
    },
    enabled: !!selectedSubject,
  });

  // Generate test mutation
  const generateTestMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-test', {
        body: {
          chapterId: selectedChapter,
          numQuestions: parseInt(numQuestions),
          difficulty,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast({
        title: 'Test Generated Successfully! 🎉',
        description: `Created ${data.questions?.length || 0} questions. Quiz ID: ${data.quizId?.substring(0, 8)}...`,
      });
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate test. Please try again.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    },
  });

  const handleGenerate = async () => {
    if (!selectedChapter) {
      toast({
        title: 'Chapter Required',
        description: 'Please select a chapter to generate a test.',
        variant: 'destructive',
      });
      return;
    }

    const chapter = chapters?.find(c => c.id === selectedChapter);
    if (chapter && !chapter.has_content) {
      toast({
        title: 'No Content Available',
        description: 'This chapter does not have enough training materials. Please ask your teacher to upload content first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    await generateTestMutation.mutateAsync();
  };

  const selectedChapterData = chapters?.find(c => c.id === selectedChapter);

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI Test Generator
          </CardTitle>
          <CardDescription>
            Generate personalized practice tests based on your chapter content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Selection */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name} (Class {subject.class_level} - {subject.board.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chapter Selection */}
          {selectedSubject && (
            <div className="space-y-2">
              <Label>Chapter</Label>
              {chaptersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters?.map((chapter) => (
                      <SelectItem 
                        key={chapter.id} 
                        value={chapter.id}
                        disabled={!chapter.has_content}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>Ch. {chapter.chapter_number}: {chapter.name}</span>
                          {chapter.has_content ? (
                            <Badge variant="default" className="ml-2">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Content Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-2">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No Content
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Chapter Content Info */}
          {selectedChapterData && (
            <Alert className={selectedChapterData.has_content ? 'border-green-500' : 'border-yellow-500'}>
              <AlertDescription className="flex items-start gap-2">
                {selectedChapterData.has_content ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Content Available</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedChapterData.content_count} training document(s) uploaded
                        {selectedChapterData.syllabus_content && ' + Syllabus content'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Insufficient Content</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This chapter needs training materials to generate quality questions.
                        Ask your teacher to upload content.
                      </p>
                    </div>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Test Configuration */}
          {selectedChapter && selectedChapterData?.has_content && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Questions</Label>
                  <Select value={numQuestions} onValueChange={setNumQuestions}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Questions</SelectItem>
                      <SelectItem value="10">10 Questions</SelectItem>
                      <SelectItem value="15">15 Questions</SelectItem>
                      <SelectItem value="20">20 Questions</SelectItem>
                      <SelectItem value="25">25 Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={(val) => setDifficulty(val as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Test...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate AI Test
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="rounded-full bg-primary/10 w-6 h-6 flex items-center justify-center text-primary font-semibold flex-shrink-0">1</div>
            <p>Select your subject and chapter from the dropdown</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-full bg-primary/10 w-6 h-6 flex items-center justify-center text-primary font-semibold flex-shrink-0">2</div>
            <p>Only chapters with uploaded training materials can generate tests</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-full bg-primary/10 w-6 h-6 flex items-center justify-center text-primary font-semibold flex-shrink-0">3</div>
            <p>Choose number of questions and difficulty level</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-full bg-primary/10 w-6 h-6 flex items-center justify-center text-primary font-semibold flex-shrink-0">4</div>
            <p>AI will generate custom questions based on your chapter's content</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-full bg-primary/10 w-6 h-6 flex items-center justify-center text-primary font-semibold flex-shrink-0">5</div>
            <p>Take the test from the "My Tests" section</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AITestGenerator;
