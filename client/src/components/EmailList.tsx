import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEmail } from '@/context/EmailContext';
import EmailCard from './EmailCard';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Email } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EmailListProps {
  onCorrectClassification: (email: Email) => void;
}

export default function EmailList({ onCorrectClassification }: EmailListProps) {
  const { 
    currentSection, 
    getEmailsBySection, 
    isAuthenticated,
    isLoading 
  } = useEmail();
  
  const { toast } = useToast();

  // Get filtered emails from context
  const displayEmails = getEmailsBySection(currentSection);

  const handleToggleReplyLater = async (email: Email) => {
    try {
      await apiRequest('PATCH', `/api/emails/${email.id}/reply-later`, {
        isReplyLater: !email.isReplyLater
      });
      
      toast({
        title: 'Success',
        description: email.isReplyLater 
          ? 'Email removed from Reply Later' 
          : 'Email added to Reply Later',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update email status',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await apiRequest('POST', '/api/process-emails');
      
      toast({
        title: 'Success',
        description: 'Emails refreshed and re-classified',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh emails',
        variant: 'destructive',
      });
    }
  };

  const getSectionTitle = () => {
    const titles = {
      urgent: 'Urgent',
      normal: 'Normal',
      low: 'Low Priority',
      'reply-later': 'Reply Later',
      calendar: 'Calendar Events'
    };
    return titles[currentSection as keyof typeof titles] || 'Emails';
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <p className="text-gray-500">Upload your credentials to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {getSectionTitle()} ({displayEmails.length})
            </h2>
            <p className="text-sm text-gray-500">
              {currentSection === 'calendar' 
                ? 'Calendar events created from email deadlines'
                : 'AI-classified emails sorted by priority'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-amber-300 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">High Priority</span>
              </div>
              <div className="flex items-center ml-4">
                <div className="w-3 h-3 bg-green-300 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Lower Priority</span>
              </div>
            </div>
            
            <Button
              onClick={handleRefresh}
              className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              disabled={isLoading}
              data-testid="button-refresh"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center" data-testid="loading-state">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">
              {isLoading ? 'Processing emails with AI...' : 'Loading emails...'}
            </p>
          </div>
        </div>
      )}

      {/* Email List */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto" data-testid="email-list">
          {displayEmails.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">No emails in this category</p>
            </div>
          ) : (
            displayEmails.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                onCorrectClassification={onCorrectClassification}
                onToggleReplyLater={handleToggleReplyLater}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
