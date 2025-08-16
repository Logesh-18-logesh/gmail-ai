import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Edit, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CalendarEvent } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

export default function CalendarPanel() {
  const { toast } = useToast();

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/calendar-events'],
  });

  const handleDeleteEvent = async (event: CalendarEvent) => {
    try {
      await apiRequest('DELETE', `/api/calendar-events/${event.id}`);
      
      refetch();
      
      toast({
        title: 'Success',
        description: 'Calendar event deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete calendar event',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (title: string) => {
    if (title.toLowerCase().includes('urgent')) {
      return 'border-amber-200 bg-amber-50';
    }
    if (title.toLowerCase().includes('meeting')) {
      return 'border-blue-200 bg-blue-50';
    }
    return 'border-gray-200 bg-gray-50';
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const isSameDay = start.toDateString() === end.toDateString();
    const isToday = start.toDateString() === new Date().toDateString();
    
    if (isToday) {
      return `Today, ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `${start.toLocaleDateString()}, ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div 
      className="w-80 bg-white border-l border-gray-200 flex flex-col"
      data-testid="calendar-panel"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <Calendar className="text-purple-500 h-5 w-5" />
          <h3 className="text-lg font-semibold text-gray-900">Calendar Events</h3>
        </div>
        <p className="text-sm text-gray-500">Events created from email deadlines</p>
      </div>
      
      {/* Events List */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading events...</p>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No calendar events</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event: CalendarEvent) => (
              <div
                key={event.id}
                className={`border rounded-lg p-4 ${getPriorityColor(event.title)}`}
                data-testid={`event-${event.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {event.title}
                    </h4>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>{formatEventTime(event.startTime.toString(), event.endTime.toString())}</span>
                    </div>
                    
                    {event.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Created {formatDistanceToNow(new Date(event.createdAt!))} ago
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
                      data-testid={`button-edit-event-${event.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                      onClick={() => handleDeleteEvent(event)}
                      data-testid={`button-delete-event-${event.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-6 border-t border-gray-200">
        <Button
          variant="outline"
          className="w-full"
          data-testid="button-view-full-calendar"
        >
          <Calendar className="mr-2 h-4 w-4" />
          View Full Calendar
        </Button>
      </div>
    </div>
  );
}
