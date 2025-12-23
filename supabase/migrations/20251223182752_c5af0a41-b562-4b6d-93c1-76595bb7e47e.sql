-- Create AI training documents table for storing documents used to train the AI Mentor
CREATE TABLE public.ai_training_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  board education_board,
  class_level INTEGER,
  document_type TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_training_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active training documents" 
ON public.ai_training_documents 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage training documents" 
ON public.ai_training_documents 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create student_roadmap table for tracking personalized learning paths
CREATE TABLE public.student_roadmap (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  milestone_title TEXT NOT NULL,
  milestone_description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.student_roadmap ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_roadmap
CREATE POLICY "Users can view own roadmap" 
ON public.student_roadmap 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own roadmap" 
ON public.student_roadmap 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roadmaps" 
ON public.student_roadmap 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Add indexes for better performance
CREATE INDEX idx_ai_training_docs_subject ON public.ai_training_documents(subject_id);
CREATE INDEX idx_ai_training_docs_board_class ON public.ai_training_documents(board, class_level);
CREATE INDEX idx_student_roadmap_user ON public.student_roadmap(user_id);
CREATE INDEX idx_student_roadmap_subject ON public.student_roadmap(subject_id);