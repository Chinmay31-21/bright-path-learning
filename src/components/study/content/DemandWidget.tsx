import { 
  Video, 
  FileText, 
  Presentation,
  Hand,
  CheckCircle2,
  Users,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DemandWidgetProps {
  contentType: 'video' | 'pdf' | 'ppt';
  hasRequested: boolean;
  requestCount: number;
  onRequest: () => void;
  isLoading: boolean;
}

const contentConfig = {
  video: {
    icon: Video,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    title: 'No Videos Available',
    description: 'Video lectures for this chapter haven\'t been uploaded yet.',
    requestText: 'Request Videos'
  },
  pdf: {
    icon: FileText,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    title: 'No PDFs Available',
    description: 'PDF documents for this chapter haven\'t been uploaded yet.',
    requestText: 'Request PDFs'
  },
  ppt: {
    icon: Presentation,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    title: 'No Presentations Available',
    description: 'PowerPoint presentations for this chapter haven\'t been uploaded yet.',
    requestText: 'Request Presentations'
  }
};

const DemandWidget = ({
  contentType,
  hasRequested,
  requestCount,
  onRequest,
  isLoading
}: DemandWidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = contentConfig[contentType];
  const Icon = config.icon;

  return (
    <div className="glass-card rounded-2xl p-8 text-center animate-fade-in">
      <div className={`w-20 h-20 rounded-2xl ${config.bgColor} flex items-center justify-center mx-auto mb-6`}>
        <Icon className={`w-10 h-10 ${config.color}`} />
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">{config.title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {config.description}
      </p>

      {/* Request count indicator */}
      {requestCount > 0 && (
        <div className="flex items-center justify-center gap-2 mb-6 text-sm">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{requestCount}</span> student{requestCount > 1 ? 's' : ''} already requested this
          </span>
        </div>
      )}

      {/* Action button */}
      {!user ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Sign in to request content</p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      ) : hasRequested ? (
        <div className="flex items-center justify-center gap-3 py-3 px-6 bg-success/10 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span className="font-medium text-success">Request Sent!</span>
        </div>
      ) : (
        <Button 
          onClick={onRequest}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Request...
            </>
          ) : (
            <>
              <Hand className="w-4 h-4 mr-2" />
              {config.requestText}
            </>
          )}
        </Button>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        Your request helps us prioritize what content to upload next.
      </p>
    </div>
  );
};

export default DemandWidget;
