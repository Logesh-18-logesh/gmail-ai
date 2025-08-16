import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Email, CalendarEvent } from '@shared/schema';

interface EmailContextType {
  emails: Email[];
  calendarEvents: CalendarEvent[];
  selectedEmail: Email | null;
  currentSection: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setEmails: (emails: Email[]) => void;
  setCalendarEvents: (events: CalendarEvent[]) => void;
  setSelectedEmail: (email: Email | null) => void;
  setCurrentSection: (section: string) => void;
  setIsAuthenticated: (auth: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  
  getEmailsBySection: (section: string) => Email[];
  getReplyLaterCount: () => number;
  getEmailCountByPriority: (priority: string) => number;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export function EmailProvider({ children }: { children: ReactNode }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [currentSection, setCurrentSection] = useState('urgent');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getEmailsBySection = useCallback((section: string): Email[] => {
    switch (section) {
      case 'reply-later':
        return emails.filter(email => email.isReplyLater);
      case 'urgent':
      case 'normal':
      case 'low':
        return emails.filter(email => email.priority === section);
      default:
        return emails;
    }
  }, [emails]);

  const getReplyLaterCount = useCallback((): number => {
    return emails.filter(email => email.isReplyLater).length;
  }, [emails]);

  const getEmailCountByPriority = useCallback((priority: string): number => {
    return emails.filter(email => email.priority === priority).length;
  }, [emails]);

  const value: EmailContextType = {
    emails,
    calendarEvents,
    selectedEmail,
    currentSection,
    isAuthenticated,
    isLoading,
    
    setEmails,
    setCalendarEvents,
    setSelectedEmail,
    setCurrentSection,
    setIsAuthenticated,
    setIsLoading,
    
    getEmailsBySection,
    getReplyLaterCount,
    getEmailCountByPriority,
  };

  return (
    <EmailContext.Provider value={value}>
      {children}
    </EmailContext.Provider>
  );
}

export function useEmail() {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
}
