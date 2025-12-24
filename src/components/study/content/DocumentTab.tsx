import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Presentation,
  Download,
  ExternalLink,
  Star,
  MessageSquare,
  Eye,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MaterialReview from './MaterialReview';

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface DocumentTabProps {
  documents: Document[];
  type: 'pdf' | 'ppt';
}

const DocumentTab = ({ documents, type }: DocumentTabProps) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showReviews, setShowReviews] = useState<string | null>(null);

  // Fetch reviews for documents
  const { data: reviewsData } = useQuery({
    queryKey: ['document-reviews', type, documents.map(d => d.id)],
    queryFn: async () => {
      const docIds = documents.map(d => d.id);
      const contentType = type === 'pdf' ? 'pdf' : 'document';
      
      const { data, error } = await supabase
        .from('material_reviews')
        .select('content_id, rating')
        .eq('content_type', contentType)
        .in('content_id', docIds);
      
      if (error) throw error;
      
      // Calculate average ratings
      const ratings: Record<string, { avg: number; count: number }> = {};
      docIds.forEach(id => {
        const docReviews = data?.filter(r => r.content_id === id) || [];
        const avg = docReviews.length > 0 
          ? docReviews.reduce((sum, r) => sum + r.rating, 0) / docReviews.length 
          : 0;
        ratings[id] = { avg: Math.round(avg * 10) / 10, count: docReviews.length };
      });
      
      return ratings;
    }
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const Icon = type === 'pdf' ? FileText : Presentation;
  const iconColor = type === 'pdf' ? 'text-red-500' : 'text-orange-500';
  const contentType = type === 'pdf' ? 'pdf' : 'document';

  return (
    <div className="space-y-6">
      {/* Document preview section */}
      {selectedDocument && type === 'pdf' && (
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
          <div className="h-[600px] bg-muted">
            <iframe
              src={`${selectedDocument.file_url}#toolbar=1`}
              title={selectedDocument.file_name}
              className="w-full h-full"
            />
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {selectedDocument.file_name}
                </h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{formatFileSize(selectedDocument.file_size)}</span>
                  <span>•</span>
                  <span>{formatDate(selectedDocument.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReviews(showReviews === selectedDocument.id ? null : selectedDocument.id)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Reviews
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedDocument.file_url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            
            {showReviews === selectedDocument.id && (
              <div className="mt-4 pt-4 border-t">
                <MaterialReview 
                  contentType={contentType} 
                  contentId={selectedDocument.id} 
                  contentTitle={selectedDocument.file_name}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="grid gap-4">
        {documents.map((doc, index) => {
          const rating = reviewsData?.[doc.id];
          const isSelected = selectedDocument?.id === doc.id;
          
          return (
            <div
              key={doc.id}
              className={`glass-card rounded-xl p-4 transition-all duration-300 animate-fade-in ${
                isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent/50'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground mb-1 line-clamp-1">{doc.file_name}</h4>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(doc.created_at)}
                    </span>
                    {rating && rating.count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {rating.avg} ({rating.count})
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {type === 'pdf' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDocument(isSelected ? null : doc)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {isSelected ? 'Hide' : 'Preview'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowReviews(showReviews === doc.id ? null : doc.id);
                      if (type !== 'pdf') setSelectedDocument(doc);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              {showReviews === doc.id && type !== 'pdf' && (
                <div className="mt-4 pt-4 border-t">
                  <MaterialReview 
                    contentType={contentType} 
                    contentId={doc.id} 
                    contentTitle={doc.file_name}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentTab;
