-- Create chapter-documents storage bucket for student materials
INSERT INTO storage.buckets (id, name, public) VALUES ('chapter-documents', 'chapter-documents', true);

-- Create chapter-videos storage bucket for direct video uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('chapter-videos', 'chapter-videos', true);

-- RLS policies for chapter-documents bucket
CREATE POLICY "Anyone can view chapter documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'chapter-documents');

CREATE POLICY "Admins can upload chapter documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chapter-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update chapter documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chapter-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete chapter documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'chapter-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for chapter-videos bucket
CREATE POLICY "Anyone can view chapter videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'chapter-videos');

CREATE POLICY "Admins can upload chapter videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chapter-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update chapter videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chapter-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete chapter videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'chapter-videos' AND has_role(auth.uid(), 'admin'::app_role));

-- Create chapter_documents table to track uploaded documents for each chapter
CREATE TABLE public.chapter_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chapter_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for chapter_documents
CREATE POLICY "Anyone can view chapter documents"
ON public.chapter_documents FOR SELECT
USING (true);

CREATE POLICY "Admins can manage chapter documents"
ON public.chapter_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add video_type column to videos table to distinguish between link and upload
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'link';