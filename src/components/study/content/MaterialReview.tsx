import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Star, 
  Send,
  Loader2,
  User,
  Calendar,
  Edit2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MaterialReviewProps {
  contentType: 'video' | 'pdf' | 'document';
  contentId: string;
  contentTitle: string;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

const MaterialReview = ({ contentType, contentId, contentTitle }: MaterialReviewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch all reviews for this content
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', contentType, contentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_reviews')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Review[];
    }
  });

  // Fetch user's existing review
  const { data: userReview } = useQuery({
    queryKey: ['user-review', contentType, contentId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('material_reviews')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Review | null;
    },
    enabled: !!user
  });

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      if (rating === 0) throw new Error('Please select a rating');
      
      const { error } = await supabase
        .from('material_reviews')
        .insert({
          user_id: user.id,
          content_type: contentType,
          content_id: contentId,
          rating,
          review_text: reviewText || null
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', contentType, contentId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', contentType, contentId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['video-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['document-reviews'] });
      setRating(0);
      setReviewText('');
      toast({
        title: 'Review Submitted!',
        description: 'Thank you for your feedback.',
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

  // Update review mutation
  const updateReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user || !userReview) throw new Error('No review to update');
      if (rating === 0) throw new Error('Please select a rating');
      
      const { error } = await supabase
        .from('material_reviews')
        .update({
          rating,
          review_text: reviewText || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userReview.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', contentType, contentId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', contentType, contentId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['video-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['document-reviews'] });
      setIsEditing(false);
      toast({
        title: 'Review Updated!',
        description: 'Your review has been updated.',
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

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user || !userReview) throw new Error('No review to delete');
      
      const { error } = await supabase
        .from('material_reviews')
        .delete()
        .eq('id', userReview.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', contentType, contentId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', contentType, contentId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['video-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['document-reviews'] });
      setRating(0);
      setReviewText('');
      toast({
        title: 'Review Deleted',
        description: 'Your review has been removed.',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleStartEdit = () => {
    if (userReview) {
      setRating(userReview.rating);
      setReviewText(userReview.review_text || '');
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setRating(0);
    setReviewText('');
  };

  const handleSubmit = () => {
    if (isEditing && userReview) {
      updateReviewMutation.mutate();
    } else {
      createReviewMutation.mutate();
    }
  };

  const otherReviews = reviews?.filter(r => r.user_id !== user?.id) || [];
  const isSubmitting = createReviewMutation.isPending || updateReviewMutation.isPending;

  return (
    <div className="space-y-6">
      {/* User's review form or existing review */}
      {user && (
        <div className="space-y-4">
          {userReview && !isEditing ? (
            <div className="bg-primary/5 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">Your Review</p>
                    <p className="text-xs text-muted-foreground">{formatDate(userReview.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteReviewMutation.mutate()}
                    disabled={deleteReviewMutation.isPending}
                  >
                    {deleteReviewMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= userReview.rating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              {userReview.review_text && (
                <p className="text-sm text-foreground">{userReview.review_text}</p>
              )}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-xl p-4 space-y-4">
              <p className="text-sm font-medium text-foreground">
                {isEditing ? 'Edit Your Review' : 'Rate this content'}
              </p>
              
              {/* Star rating */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </span>
                )}
              </div>
              
              {/* Review text */}
              <Textarea
                placeholder="Write your review (optional)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isEditing ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {isEditing ? 'Update Review' : 'Submit Review'}
                    </>
                  )}
                </Button>
                {isEditing && (
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Other reviews */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : otherReviews.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">
            {otherReviews.length} Review{otherReviews.length > 1 ? 's' : ''}
          </h4>
          {otherReviews.map((review) => (
            <div key={review.id} className="border-t pt-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-foreground">{review.review_text}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !user && (
        <p className="text-center text-sm text-muted-foreground py-4">
          No reviews yet. Be the first to review!
        </p>
      )}
    </div>
  );
};

export default MaterialReview;
