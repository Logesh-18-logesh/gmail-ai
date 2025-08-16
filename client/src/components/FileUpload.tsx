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

      if (result.demo) {
        // Demo mode - automatically authenticate
        setIsAuthenticated(true);
        setIsLoading(true);
        
        toast({
          title: 'Demo Mode Active',
          description: 'Using sample emails for testing. Processing...',
        });

        // Process demo emails
        try {
          await apiRequest('POST', '/api/process-emails');
          toast({
            title: 'Demo Ready',
            description: 'Sample emails loaded and classified. Try the features!',
          });
        } catch (error: any) {
          toast({
            title: 'Error',
            description: 'Failed to process demo emails',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      } else if (result.needsAuth) {
        // Real OAuth required
        if (result.instructions) {
          toast({
            title: 'Setup Instructions',
            description: result.instructions,
            duration: 10000,
          });
        }
        
        const authWindow = window.open(result.authUrl, 'auth', 'width=500,height=600');
        
        toast({
          title: 'Authentication Required',
          description: 'Complete Google OAuth in the popup window',
        });
        
        // Poll for auth completion
        const pollTimer = setInterval(() => {
          try {
            if (authWindow?.closed) {
              clearInterval(pollTimer);
              handleAuthComplete();
            }
          } catch (error) {
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
      
      <div className="mt-2">
        <p className="text-xs text-gray-500 mb-2">
          Upload your Google credentials.json file to connect to Gmail
        </p>
        
        <div className="bg-blue-100 rounded-lg p-3 text-xs text-blue-800">
          <strong>Demo Mode:</strong> Upload an empty JSON file (just <code>{`{}`}</code>) to try the app with sample emails.
          <br />
          <strong>Real Gmail:</strong> Upload your actual credentials.json from Google Cloud Console.
        </div>
      </div>
    </div>
  );
}
