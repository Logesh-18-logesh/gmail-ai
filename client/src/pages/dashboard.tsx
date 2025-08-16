import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmailProvider } from '@/context/EmailContext';
import Sidebar from '@/components/Sidebar';
import EmailList from '@/components/EmailList';
import EmailPreview from '@/components/EmailPreview';
import CalendarPanel from '@/components/CalendarPanel';
import ClassificationModal from '@/components/ClassificationModal';
import { Email } from '@shared/schema';
import { useEmail } from '@/context/EmailContext';
import { useQueryClient } from '@tanstack/react-query';

function DashboardContent() {
  const [classificationModalOpen, setClassificationModalOpen] = useState(false);
  const [selectedEmailForCorrection, setSelectedEmailForCorrection] = useState<Email | null>(null);
  const { currentSection, setEmails, isAuthenticated, setIsAuthenticated } = useEmail();
  const queryClient = useQueryClient();

  // Fetch all emails and update context
  const { data: emails = [] } = useQuery({
    queryKey: ['/api/emails'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Check authentication status on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth-status');
        if (response.ok) {
          const result = await response.json();
          setIsAuthenticated(result.authenticated);
        }
      } catch (error) {
        console.log('Auth check failed:', error);
      }
    };
    
    checkAuth();
  }, [setIsAuthenticated]);

  // Update context when emails are fetched
  useEffect(() => {
    if (emails.length > 0) {
      setEmails(emails);
    }
  }, [emails, setEmails]);

  const handleCorrectClassification = (email: Email) => {
    setSelectedEmailForCorrection(email);
    setClassificationModalOpen(true);
  };

  const handleClassificationSuccess = () => {
    // Invalidate and refetch email queries
    queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
  };

  return (
    <div className="flex h-screen bg-gray-50" data-testid="dashboard">
      <Sidebar />
      
      <div className="flex-1 flex">
        <EmailList onCorrectClassification={handleCorrectClassification} />
        
        {currentSection === 'calendar' ? (
          <CalendarPanel />
        ) : (
          <EmailPreview />
        )}
      </div>

      <ClassificationModal
        email={selectedEmailForCorrection}
        isOpen={classificationModalOpen}
        onClose={() => {
          setClassificationModalOpen(false);
          setSelectedEmailForCorrection(null);
        }}
        onSuccess={handleClassificationSuccess}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <EmailProvider>
      <DashboardContent />
    </EmailProvider>
  );
}
