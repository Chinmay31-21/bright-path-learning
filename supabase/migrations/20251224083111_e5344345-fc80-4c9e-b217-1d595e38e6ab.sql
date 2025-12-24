-- Create storage bucket for training documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-documents', 'training-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for training documents storage
CREATE POLICY "Anyone can view training documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-documents');

CREATE POLICY "Admins can upload training documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'training-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete training documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'training-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Add file columns to ai_training_documents
ALTER TABLE public.ai_training_documents
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_type text,
ADD COLUMN IF NOT EXISTS file_size integer,
ADD COLUMN IF NOT EXISTS parsed_content text,
ADD COLUMN IF NOT EXISTS training_status text DEFAULT 'pending';

-- Create chat history table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.chat_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));