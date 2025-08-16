import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, CalendarCheck2, Edit3, Brain } from 'lucide-react';
import { useEmail } from '@/context/EmailContext';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

export default function EmailPreview() {
  const { selectedEmail, setSelectedEmail } = useEmail();
  const [replyDraft, setReplyDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Fetch reply draft when email is selected
  const { data: draftData } = useQuery({
    queryKey: ['/api/emails', selectedEmail?.id, 'draft-reply'],
    enabled: !!selectedEmail,
  });

  useEffect(() => {
    if (draftData?.draft) {
      setReplyDraft(draftData.draft);
    }
  }, [draftData]);

  const handleSendReply = async () => {
    if (!selectedEmail || !replyDraft.trim()) return;

    try {
      await apiRequest('POST', `/api/emails/${selectedEmail.id}/reply`, {
        replyText: replyDraft
      });

      toast({
        title: 'Success',
        description: 'Reply sent successfully',
      });

      setSelectedEmail(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    }
  };

  const getSenderInitials = (sender: string): string => {
    const name = sender.replace(/<.*>/, '').trim();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-amber-100 text-amber-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!selectedEmail) return null;

  return (
    <div 
      className="w-96 bg-white border-l border-gray-200 flex flex-col"
      data-testid="email-preview"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {selectedEmail.subject}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedEmail(null)}
            className="text-gray-400 hover:text-gray-600"
            data-testid="button-close-preview"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src="" alt={selectedEmail.sender} />
            <AvatarFallback>
              {getSenderInitials(selectedEmail.sender)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {selectedEmail.sender.replace(/<.*>/, '').trim()}
            </p>
            <p className="text-sm text-gray-500">
              {selectedEmail.senderEmail}
            </p>
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-2">
            <Brain className="text-blue-500 mr-2 h-4 w-4" />
            <span className="text-sm font-medium text-gray-700">AI Thread Summary</span>
          </div>
          <p className="text-sm text-gray-600">
            {selectedEmail.summary || 'No summary available'}
          </p>
        </div>
        
        {/* Email Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Received:</span>
            <span className="text-gray-700">
              {formatDistanceToNow(new Date(selectedEmail.timestamp))} ago
            </span>
          </div>
          
          {selectedEmail.deadline && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Deadline:</span>
              <span className="text-red-600 font-medium">
                {new Date(selectedEmail.deadline).toLocaleDateString()}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Priority:</span>
            <Badge className={`text-xs font-medium ${getPriorityColor(selectedEmail.priority)}`}>
              {selectedEmail.priority} ({selectedEmail.confidence}%)
            </Badge>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-sm text-gray-700">
            {selectedEmail.body}
          </div>
        </div>
      </div>

      {/* Reply Section */}
      <div className="p-6 border-t border-gray-200">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              AI Draft Response
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-600 hover:text-blue-700 text-xs"
              data-testid="button-edit-draft"
            >
              <Edit3 className="mr-1 h-3 w-3" />
              {isEditing ? 'Preview' : 'Edit Draft'}
            </Button>
          </div>
          
          {isEditing ? (
            <Textarea
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none"
              rows={4}
              placeholder="Write your reply..."
              data-testid="textarea-reply-draft"
            />
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {replyDraft || 'No draft available'}
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">Confidence: 86%</span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={handleSendReply}
            disabled={!replyDraft.trim()}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            data-testid="button-send-reply"
          >
            <Send className="mr-2 h-4 w-4" />
            Send Reply
          </Button>
          
          <Button
            variant="outline"
            className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            data-testid="button-schedule-reply"
          >
            <CalendarCheck2 className="mr-2 h-4 w-4" />
            CalendarCheck2
          </Button>
        </div>
      </div>
    </div>
  );
}
