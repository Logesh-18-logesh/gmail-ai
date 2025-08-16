import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  AlertTriangle, 
  Inbox, 
  ArrowDown, 
  Clock, 
  Calendar,
  Settings
} from 'lucide-react';
import { useEmail } from '@/context/EmailContext';
import { cn } from '@/lib/utils';
import FileUpload from './FileUpload';

const navigationItems = [
  {
    id: 'urgent',
    label: 'Urgent',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    countType: 'urgent' as const
  },
  {
    id: 'normal',
    label: 'Normal',
    icon: Inbox,
    iconColor: 'text-blue-500',
    countType: 'normal' as const
  },
  {
    id: 'low',
    label: 'Low Priority',
    icon: ArrowDown,
    iconColor: 'text-green-500',
    countType: 'low' as const
  }
];

const followUpItems = [
  {
    id: 'reply-later',
    label: 'Reply Later',
    icon: Clock,
    iconColor: 'text-orange-500',
    countType: 'reply-later' as const
  },
  {
    id: 'calendar',
    label: 'Calendar Events',
    icon: Calendar,
    iconColor: 'text-purple-500',
    countType: null
  }
];

export default function Sidebar() {
  const { 
    currentSection, 
    setCurrentSection,
    getEmailCountByPriority,
    getReplyLaterCount
  } = useEmail();

  const getCount = (countType: string | null) => {
    if (!countType) return null;
    if (countType === 'reply-later') return getReplyLaterCount();
    return getEmailCountByPriority(countType);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col" data-testid="sidebar">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Bot className="text-blue-600 h-5 w-5" />
          <h1 className="text-lg font-semibold text-gray-900">AI Email Manager</h1>
        </div>
      </div>

      {/* Upload Section */}
      <FileUpload />

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {/* Priority Inbox */}
        <div className="space-y-1">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Priority Inbox
          </h3>
          
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const count = getCount(item.countType);
            const isActive = currentSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => setCurrentSection(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <div className="flex items-center">
                  <Icon className={cn("mr-3 h-4 w-4", item.iconColor)} />
                  <span>{item.label}</span>
                </div>
                {count !== null && (
                  <Badge 
                    variant={isActive ? "default" : "secondary"}
                    className="text-xs"
                    data-testid={`count-${item.id}`}
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Follow-ups */}
        <div className="pt-4 space-y-1">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Follow-ups
          </h3>
          
          {followUpItems.map((item) => {
            const Icon = item.icon;
            const count = getCount(item.countType);
            const isActive = currentSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => setCurrentSection(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <div className="flex items-center">
                  <Icon className={cn("mr-3 h-4 w-4", item.iconColor)} />
                  <span>{item.label}</span>
                </div>
                {count !== null && (
                  <Badge 
                    variant={isActive ? "default" : "secondary"}
                    className="text-xs bg-orange-100 text-orange-800"
                    data-testid={`count-${item.id}`}
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
          data-testid="button-settings"
        >
          <Settings className="mr-3 h-4 w-4" />
          <span>Settings</span>
        </Button>
      </div>
    </div>
  );
}
