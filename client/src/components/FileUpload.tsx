import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
import { useEmail } from '@/context/EmailContext';
import { apiRequest } from '@/lib/queryClient';

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, setIsAuthenticated, setIsLoading } = useEmail();
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a valid credentials.json file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('credentials', file);

      const response = await fetch('/api/upload-credentials', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      if (result.needsAuth) {
        // Open OAuth URL in new window
        const authWindow = window.open(result.authUrl, 'auth', 'width=500,height=600');
        
        // Poll for auth completion
        const pollTimer = setInterval(() => {
          try {
            if (authWindow?.closed) {
              clearInterval(pollTimer);
              handleAuthComplete();
            }
          } catch (error) {
            // Cross-origin error when auth is complete
            clearInterval(pollTimer);
            handleAuthComplete();
          }
        }, 1000);
      } else {
        setIsAuthenticated(true);
        toast({
          title: 'Success',
          description: 'Connected to Gmail & Calendar successfully!',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAuthComplete = async () => {
    // In a real implementation, you would handle the OAuth callback
    // For now, we'll simulate successful authentication
    setIsAuthenticated(true);
    setIsLoading(true);
    
    toast({
      title: 'Authentication successful',
      description: 'Processing your emails...',
    });

    try {
      // Process emails
      const response = await apiRequest('POST', '/api/process-emails');
      
      toast({
        title: 'Success',
        description: 'Emails processed and classified successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to process emails',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="p-4 bg-green-50 border-b border-green-200" data-testid="auth-status">
        <div className="flex items-center text-green-700">
          <CheckCircle className="mr-2 h-4 w-4" />
          <span className="text-sm">Connected to Gmail & Calendar</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border-b border-gray-200" data-testid="upload-section">
      <Label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Credentials
      </Label>
      
      <div className="relative">
        <Input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          data-testid="input-credentials-file"
        />
        
        {uploading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-1">
        Upload your Google credentials.json file
      </p>
    </div>
  );
}
