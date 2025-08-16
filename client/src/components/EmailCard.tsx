import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Reply, 
  Clock, 
  Archive,
  Brain,
  Edit,
  TriangleAlert,
  AlertCircle,
  ArrowDown
} from 'lucide-react';
import { Email } from '@shared/schema';
import { useEmail } from '@/context/EmailContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmailCardProps {
  email: Email;
  onCorrectClassification: (email: Email) => void;
  onToggleReplyLater: (email: Email) => void;
}

const priorityConfig = {
  urgent: {
    gradient: 'bg-gradient-to-r from-yellow-50 to-amber-50',
    border: 'border-l-4 border-amber-400',
    icon: TriangleAlert,
    iconColor: 'text-amber-500',
    badgeColor: 'bg-amber-100 text-amber-800',
    label: 'Urgent'
  },
  normal: {
    gradient: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    border: 'border-l-4 border-blue-400',
    icon: AlertCircle,
    iconColor: 'text-blue-500',
    badgeColor: 'bg-blue-100 text-blue-800',
    label: 'Normal'
  },
  low: {
    gradient: 'bg-gradient-to-r from-green-50 to-emerald-50',
    border: 'border-l-4 border-green-400',
    icon: ArrowDown,
    iconColor: 'text-green-500',
    badgeColor: 'bg-green-100 text-green-800',
    label: 'Low'
  }
};

export default function EmailCard({ email, onCorrectClassification, onToggleReplyLater }: EmailCardProps) {
  const { setSelectedEmail } = useEmail();
  const config = priorityConfig[email.priority as keyof typeof priorityConfig];
  const PriorityIcon = config?.icon || AlertCircle;

  const handleCardClick = () => {
    setSelectedEmail(email);
  };

  const getSenderInitials = (sender: string): string => {
    const name = sender.replace(/<.*>/, '').trim();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getSenderRole = (senderEmail: string): string => {
    if (senderEmail.includes('vp') || senderEmail.includes('vice')) return 'VP';
    if (senderEmail.includes('ceo') || senderEmail.includes('chief')) return 'CEO';
    if (senderEmail.includes('manager')) return 'Manager';
    if (senderEmail.includes('client')) return 'Client';
    return 'Team';
  };

  return (
    <div
      className={cn(
        "p-6 m-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer",
        config?.gradient || 'bg-white',
        config?.border || 'border-l-4 border-gray-400'
      )}
      onClick={handleCardClick}
      data-testid={`card-email-${email.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src="" alt={email.sender} />
              <AvatarFallback className="text-xs">
                {getSenderInitials(email.sender)}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {email.sender.replace(/<.*>/, '').trim()}
              </h3>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(email.timestamp))} ago
              </p>
            </div>
            
            <Badge 
              variant="secondary" 
              className="text-xs"
              data-testid={`badge-role-${email.id}`}
            >
              {getSenderRole(email.senderEmail)}
            </Badge>
          </div>
          
          <h4 className="text-base font-semibold text-gray-900 mb-2">
            {email.subject}
          </h4>
          
          <div className="flex items-center space-x-4 mb-3">
            <div className="flex items-center">
              <Brain className="text-blue-500 mr-1 h-4 w-4" />
              <span className="text-sm text-gray-600">AI Summary:</span>
            </div>
            
            {email.deadline && (
              <div className="flex items-center">
                <Clock className="text-red-500 mr-1 h-4 w-4" />
                <span className="text-sm text-red-600 font-medium">
                  {new Date(email.deadline).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {email.summary || email.body.substring(0, 150) + '...'}
          </p>
          
          <div className="flex items-center space-x-4">
            <div className={cn(
              "flex items-center px-3 py-1 rounded-full text-sm",
              config?.badgeColor || 'bg-gray-100 text-gray-800'
            )}>
              <PriorityIcon className="mr-2 h-4 w-4" />
              <span className="font-medium">{config?.label || 'Unknown'}</span>
              <span className="ml-2 bg-white bg-opacity-50 px-2 py-0.5 rounded text-xs">
                {email.confidence}%
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 h-auto p-1"
              onClick={(e) => {
                e.stopPropagation();
                onCorrectClassification(email);
              }}
              data-testid={`button-correct-${email.id}`}
            >
              <Edit className="mr-1 h-3 w-3" />
              Correct Classification
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2 ml-4">
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            data-testid={`button-reply-${email.id}`}
          >
            <Reply className="mr-2 h-4 w-4" />
            Reply
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggleReplyLater(email);
            }}
            data-testid={`button-reply-later-${email.id}`}
          >
            <Clock className="mr-2 h-4 w-4" />
            {email.isReplyLater ? 'Remove Later' : 'Reply Later'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
            data-testid={`button-archive-${email.id}`}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
