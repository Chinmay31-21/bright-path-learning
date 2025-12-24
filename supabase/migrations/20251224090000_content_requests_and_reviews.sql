-- Create content_requests table for students to request missing content
CREATE TABLE IF NOT EXISTS content_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf', 'ppt')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  UNIQUE(user_id, chapter_id, content_type)
);

-- Create material_reviews table for students to rate and review content
CREATE TABLE IF NOT EXISTS material_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf', 'document')),
  content_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- Create video_progress table to track student video watch progress
CREATE TABLE IF NOT EXISTS video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_requests_user ON content_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_content_requests_chapter ON content_requests(chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_requests_status ON content_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_reviews_content ON material_reviews(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_material_reviews_user ON material_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video ON video_progress(video_id);

-- Enable RLS
ALTER TABLE content_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_requests
CREATE POLICY "Users can view their own content requests"
  ON content_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create content requests"
  ON content_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all content requests"
  ON content_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update content requests"
  ON content_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for material_reviews
CREATE POLICY "Anyone can view reviews"
  ON material_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON material_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON material_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON material_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for video_progress
CREATE POLICY "Users can view their own video progress"
  ON video_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video progress"
  ON video_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video progress"
  ON video_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Add function to count content requests per chapter
CREATE OR REPLACE FUNCTION get_content_request_count(p_chapter_id UUID, p_content_type TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM content_requests
    WHERE chapter_id = p_chapter_id 
    AND content_type = p_content_type
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get average rating for content
CREATE OR REPLACE FUNCTION get_content_average_rating(p_content_type TEXT, p_content_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating)::NUMERIC(2,1), 0)
    FROM material_reviews
    WHERE content_type = p_content_type 
    AND content_id = p_content_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
