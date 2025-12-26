import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Loader2, FileText, BookOpen, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  points: number;
}

interface AITestGeneratorProps {
  onTestGenerated?: (questions: GeneratedQuestion[], quizId?: string) => void;
}

const AITestGenerator = ({ onTestGenerated }: AITestGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [numQuestions, setNumQuestions] = useState('10');
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch chapters for optional saving
  const { data: chapters } = useQuery({
    queryKey: ['chapters-for-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select(`
          id, name, chapter_number,
          subjects:subject_id (id, name)
        `)
        .order('chapter_number');
      if (error) throw error;
      return data;
    },
  });

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please paste some content to generate questions from.',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please provide a title for the test.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-test', {
        body: {
          content,
          title,
          numQuestions: parseInt(numQuestions),
          difficulty,
          questionTypes: ['mcq', 'true_false'],
          chapterId: selectedChapter || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Test Generated!',
        description: `Created ${data.questions?.length || 0} questions${data.saved ? ' and saved to database' : ''}.`,
      });

      onTestGenerated?.(data.questions, data.quizId);
      setOpen(false);
      setContent('');
      setTitle('');
    } catch (error) {
      console.error('Error generating test:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate test. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Generate Test with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Test Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Banner */}
          <div className="bg-primary/10 rounded-xl p-4 flex gap-3">
            <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Paste any content</p>
              <p className="text-sm text-muted-foreground">
                Paste notes, textbook content, or any study material. Our AI will generate exam-ready questions automatically.
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Test Title</Label>
            <Input
              id="title"
              placeholder="e.g., Chapter 5 - Trigonometry Quiz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="content" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Study Content
            </Label>
            <Textarea
              id="content"
              placeholder="Paste your study material, notes, or textbook content here...

Example:
The center of mass is a point where the entire mass of a system can be considered to be concentrated. For a system of particles, the position of center of mass is given by:

R_cm = (m1*r1 + m2*r2 + ... + mn*rn) / (m1 + m2 + ... + mn)

Where:
- R_cm is the position vector of center of mass
- mi is the mass of ith particle
- ri is the position vector of ith particle"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {content.length} characters • Minimum 100 characters recommended
            </p>
          </div>

          {/* Options Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Save to Chapter (Optional)
              </Label>
              <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                <SelectTrigger>
                  <SelectValue placeholder="Don't save" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Don't save</SelectItem>
                  {chapters?.map((chapter: any) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.subjects?.name} - Ch.{chapter.chapter_number}: {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !content.trim() || !title.trim()}
            className="w-full h-12"
            variant="hero"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generating Questions...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate {numQuestions} Questions
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AITestGenerator;
