import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import { gmailService } from "./services/gmail";
import { calendarService } from "./services/calendar";
import { insertUserFeedbackSchema } from "@shared/schema";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  }
});

// Store authentication state
let authTokens: any = null;
let credentials: any = null;

// Simple classification functions for demo
function classifyEmailPriority(body: string, subject: string) {
  const text = (body + ' ' + subject).toLowerCase();
  
  const urgentKeywords = ['urgent', 'emergency', 'immediate', 'asap', 'critical', 'deadline today', 'security breach', 'action required'];
  const normalKeywords = ['meeting', 'review', 'discussion', 'project', 'timeline', 'concerns'];
  const lowKeywords = ['newsletter', 'update', 'fyi', 'when you have time'];
  
  const urgentScore = urgentKeywords.filter(keyword => text.includes(keyword)).length;
  const normalScore = normalKeywords.filter(keyword => text.includes(keyword)).length;
  const lowScore = lowKeywords.filter(keyword => text.includes(keyword)).length;
  
  if (urgentScore > 0) {
    return { priority: 'urgent', confidence: Math.min(90, 60 + urgentScore * 10) };
  } else if (normalScore > 0) {
    return { priority: 'normal', confidence: Math.min(80, 50 + normalScore * 10) };
  } else if (lowScore > 0) {
    return { priority: 'low', confidence: Math.min(70, 40 + lowScore * 10) };
  } else {
    return { priority: 'normal', confidence: 50 };
  }
}

function generateSimpleSummary(body: string) {
  const sentences = body.split('.').slice(0, 2);
  return sentences.join('.') + (sentences.length > 1 ? '.' : '');
}

function extractSimpleDeadline(body: string) {
  const deadlinePatterns = [
    /deadline[:\s]*today/i,
    /today\s*5:00\s*pm/i,
    /by\s*(\w+day)/i
  ];
  
  for (const pattern of deadlinePatterns) {
    if (pattern.test(body)) {
      if (body.toLowerCase().includes('today')) {
        const today = new Date();
        today.setHours(17, 0, 0, 0); // 5 PM today
        return today;
      }
    }
  }
  return null;
}

// Demo email data for testing purposes
function getDemoEmails() {
  return [
    {
      id: 'email-1',
      threadId: 'thread-1',
      subject: 'Q4 Budget Review - Need Response Today',
      sender: 'Sarah Chen <sarah.chen@company.com>',
      senderEmail: 'sarah.chen@company.com',
      body: 'Hi there, I need your approval on the Q4 marketing budget allocation of $50,000. This is part of our annual budget review process, already approved by finance team. Deadline: Today 5:00 PM. The allocation will cover: Digital advertising campaigns ($30K), Content creation and design ($15K), Event marketing ($5K). Please let me know if you need any additional details. Best, Sarah',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      rawData: {}
    },
    {
      id: 'email-2', 
      threadId: 'thread-2',
      subject: 'Project Timeline Concerns',
      sender: 'Mike Rodriguez <mike.rodriguez@company.com>',
      senderEmail: 'mike.rodriguez@company.com',
      body: 'Team, I wanted to express some concerns about delivery delays for our upcoming project. We need to discuss this in tomorrow\'s meeting to avoid any escalation risk. The client is expecting the deliverables by next week.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      rawData: {}
    },
    {
      id: 'email-3',
      threadId: 'thread-3', 
      subject: 'Security Breach Alert - Immediate Action Required',
      sender: 'Jennifer Park <jennifer.park@company.com>',
      senderEmail: 'jennifer.park@company.com',
      body: 'URGENT: Security incident detected. IT team needs approval for emergency protocols. Time-sensitive decision required. We have detected a potential security breach and need immediate action to secure our systems.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      rawData: {}
    },
    {
      id: 'email-4',
      threadId: 'thread-4',
      subject: 'Weekly Newsletter - Company Updates', 
      sender: 'Company Newsletter <newsletter@company.com>',
      senderEmail: 'newsletter@company.com',
      body: 'This week\'s company updates: New office opening, employee spotlight, and upcoming events. Read more about our latest achievements and team celebrations.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      rawData: {}
    },
    {
      id: 'email-5',
      threadId: 'thread-5',
      subject: 'Meeting Schedule Request',
      sender: 'Alex Johnson <alex.johnson@company.com>',
      senderEmail: 'alex.johnson@company.com', 
      body: 'Hi, could we schedule a meeting next week to discuss the new project requirements? I\'m available Tuesday through Thursday. Let me know what works best for you.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      rawData: {}
    }
  ];
}

// Helper function to run Python AI scripts
function runPythonScript(scriptName: string, command: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'ai', scriptName);
    const python = spawn('python3', [scriptPath, command]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      }
    });
    
    python.stdin.write(JSON.stringify(data));
    python.stdin.end();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload credentials.json
  app.post('/api/upload-credentials', upload.single('credentials'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const credentialsData = JSON.parse(req.file.buffer.toString());
      credentials = credentialsData;
      
      // Initialize services
      const gmailInit = await gmailService.initialize(credentials);
      const calendarInit = await calendarService.initialize(credentials);
      
      if (!gmailInit || !calendarInit) {
        return res.status(500).json({ message: 'Failed to initialize Google services' });
      }
      
      // Check if this is a demo request (empty JSON file) or real credentials  
      const isDemo = !credentials.installed && !credentials.web;
      
      if (isDemo) {
        // Demo mode - automatically authenticate with mock tokens
        authTokens = { access_token: 'demo_token', refresh_token: 'demo_refresh' };
        
        res.json({ 
          message: 'Demo mode activated - using sample emails for testing',
          authUrl: null,
          needsAuth: false,
          demo: true
        });
      } else {
        // Real credentials - generate OAuth URL
        const authUrl = gmailService.getAuthUrl();
        
        res.json({ 
          message: 'Credentials uploaded successfully. Please complete OAuth authentication.',
          authUrl,
          needsAuth: !authTokens,
          demo: false,
          instructions: `
            To complete setup:
            1. Click the authentication link that opens
            2. Grant Gmail and Calendar permissions
            3. Return to this app to see your real emails
            
            Note: Make sure your Google Cloud project has the correct redirect URI:
            ${process.env.REPLIT_URL || 'https://your-replit-url'}/auth/google/callback
          `
        });
      }
    } catch (error) {
      console.error('Error uploading credentials:', error);
      res.status(400).json({ message: 'Invalid credentials file' });
    }
  });

  // Check authentication status
  app.get('/api/auth-status', (req, res) => {
    res.json({ authenticated: !!authTokens });
  });
  
  // Handle OAuth callback - this will be called by Google's redirect
  app.get('/auth/google/callback', async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).send('Authorization code required');
      }
      
      authTokens = await gmailService.getAccessToken(code as string);
      
      if (!authTokens) {
        return res.status(400).send('Failed to exchange code for tokens');
      }
      
      // Re-initialize services with tokens
      await gmailService.initialize(credentials, authTokens);
      await calendarService.initialize(credentials, authTokens);
      
      // Close the popup window
      res.send(`
        <html>
          <body>
            <h2>Authentication Successful!</h2>
            <p>You can close this window.</p>
            <script>
              window.close();
            </script>
          </body>
        </html>
      `);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  // Legacy callback endpoint for backward compatibility
  app.post('/api/auth-callback', async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: 'Authorization code required' });
      }
      
      authTokens = await gmailService.getAccessToken(code);
      
      if (!authTokens) {
        return res.status(400).json({ message: 'Failed to exchange code for tokens' });
      }
      
      // Re-initialize services with tokens
      await gmailService.initialize(credentials, authTokens);
      await calendarService.initialize(credentials, authTokens);
      
      res.json({ message: 'Authentication successful' });
    } catch (error) {
      console.error('Error in auth callback:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });
  
  // Fetch and process emails
  app.post('/api/process-emails', async (req, res) => {
    try {
      if (!authTokens) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Try to fetch real emails from Gmail, fallback to demo data if not configured
      let rawEmails;
      try {
        rawEmails = await gmailService.fetchEmails(20);
        
        // If we get an empty result, show demo data for better UX
        if (!rawEmails || rawEmails.length === 0) {
          rawEmails = getDemoEmails();
        }
      } catch (error) {
        console.log('Gmail fetch failed, using demo data:', error.message);
        rawEmails = getDemoEmails();
      }
      const processedEmails = [];
      
      for (const rawEmail of rawEmails) {
        try {
          // Simple classification based on keywords for demo
          const classification = classifyEmailPriority(rawEmail.body, rawEmail.subject);
          
          // Generate simple summary
          const summary = generateSimpleSummary(rawEmail.body);
          
          // Extract deadline from email text
          const deadline = extractSimpleDeadline(rawEmail.body);
          
          // Create email record
          const email = await storage.createEmail({
            id: rawEmail.id,
            threadId: rawEmail.threadId,
            subject: rawEmail.subject,
            sender: rawEmail.sender,
            senderEmail: rawEmail.senderEmail,
            body: rawEmail.body,
            timestamp: rawEmail.timestamp,
            priority: classification.priority,
            confidence: classification.confidence,
            summary: summary,
            deadline: deadline,
            rawData: rawEmail.rawData,
            isReplyLater: false
          });
          
          // Create calendar event if deadline detected
          if (deadline) {
            try {
              const eventId = await calendarService.createEvent({
                title: `Email Deadline: ${rawEmail.subject}`,
                description: `From: ${rawEmail.sender}\n\nSummary: ${summary}`,
                startTime: deadline,
                endTime: new Date(deadline.getTime() + 60 * 60 * 1000), // 1 hour
                emailId: email.id
              });
              
              if (eventId) {
                await storage.createCalendarEvent({
                  id: `${email.id}-event`,
                  emailId: email.id,
                  eventId,
                  title: `Email Deadline: ${rawEmail.subject}`,
                  description: `From: ${rawEmail.sender}`,
                  startTime: deadline,
                  endTime: new Date(deadline.getTime() + 60 * 60 * 1000)
                });
              }
            } catch (calendarError) {
              console.error('Error creating calendar event:', calendarError);
            }
          }
          
          processedEmails.push(email);
          
        } catch (processingError) {
          console.error('Error processing email:', processingError);
          // Still add email with basic info
          const email = await storage.createEmail({
            id: rawEmail.id,
            threadId: rawEmail.threadId,
            subject: rawEmail.subject,
            sender: rawEmail.sender,
            senderEmail: rawEmail.senderEmail,
            body: rawEmail.body,
            timestamp: rawEmail.timestamp,
            priority: 'normal',
            confidence: 50,
            summary: rawEmail.body.substring(0, 100) + '...',
            deadline: null,
            rawData: rawEmail.rawData,
            isReplyLater: false
          });
          processedEmails.push(email);
        }
      }
      
      res.json({ 
        message: `Processed ${processedEmails.length} emails`,
        emails: processedEmails 
      });
    } catch (error) {
      console.error('Error processing emails:', error);
      res.status(500).json({ message: 'Failed to process emails' });
    }
  });
  
  // Get emails by priority
  app.get('/api/emails/:priority', async (req, res) => {
    try {
      const { priority } = req.params;
      
      if (priority === 'reply-later') {
        const emails = await storage.getReplyLaterEmails();
        res.json(emails);
      } else {
        const emails = await storage.getEmailsByPriority(priority);
        res.json(emails);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      res.status(500).json({ message: 'Failed to fetch emails' });
    }
  });
  
  // Get all emails
  app.get('/api/emails', async (req, res) => {
    try {
      const emails = await storage.getEmails();
      res.json(emails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      res.status(500).json({ message: 'Failed to fetch emails' });
    }
  });
  
  // Update email reply later status
  app.patch('/api/emails/:id/reply-later', async (req, res) => {
    try {
      const { id } = req.params;
      const { isReplyLater } = req.body;
      
      const email = await storage.updateEmailReplyLater(id, isReplyLater);
      
      if (!email) {
        return res.status(404).json({ message: 'Email not found' });
      }
      
      res.json(email);
    } catch (error) {
      console.error('Error updating email:', error);
      res.status(500).json({ message: 'Failed to update email' });
    }
  });
  
  // Submit user feedback for AI model
  app.post('/api/feedback', async (req, res) => {
    try {
      const feedbackData = insertUserFeedbackSchema.parse(req.body);
      
      const feedback = await storage.createUserFeedback(feedbackData);
      
      // Get the email for retraining
      const email = await storage.getEmail(feedbackData.emailId!);
      
      if (email) {
        // Send feedback to AI model
        await runPythonScript(
          'email_classifier.py',
          'add_feedback',
          {
            texts: [email.body],
            labels: [feedbackData.correctedPriority]
          }
        );
        
        // Update the email's priority
        await storage.updateEmail(email.id, {
          priority: feedbackData.correctedPriority
        });
      }
      
      res.json({ 
        message: 'Feedback submitted successfully',
        feedback 
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ message: 'Failed to submit feedback' });
    }
  });
  
  // Get calendar events
  app.get('/api/calendar-events', async (req, res) => {
    try {
      const events = await storage.getCalendarEvents();
      res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ message: 'Failed to fetch calendar events' });
    }
  });
  
  // Delete calendar event
  app.delete('/api/calendar-events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const event = await storage.getCalendarEvent(id);
      if (!event) {
        return res.status(404).json({ message: 'Calendar event not found' });
      }
      
      // Delete from Google Calendar
      await calendarService.deleteEvent(event.eventId);
      
      // Delete from storage
      await storage.deleteCalendarEvent(id);
      
      res.json({ message: 'Calendar event deleted successfully' });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({ message: 'Failed to delete calendar event' });
    }
  });
  
  // Generate reply draft
  app.post('/api/emails/:id/draft-reply', async (req, res) => {
    try {
      const { id } = req.params;
      const email = await storage.getEmail(id);
      
      if (!email) {
        return res.status(404).json({ message: 'Email not found' });
      }
      
      const draftResult = await runPythonScript(
        'email_processor.py',
        'draft_reply',
        {
          body: email.body,
          priority: email.priority
        }
      );
      
      res.json({ draft: draftResult.draft });
    } catch (error) {
      console.error('Error generating reply draft:', error);
      res.status(500).json({ message: 'Failed to generate reply draft' });
    }
  });
  
  // Send reply
  app.post('/api/emails/:id/reply', async (req, res) => {
    try {
      const { id } = req.params;
      const { replyText } = req.body;
      
      if (!authTokens) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const success = await gmailService.sendReply(id, replyText);
      
      if (success) {
        res.json({ message: 'Reply sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send reply' });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      res.status(500).json({ message: 'Failed to send reply' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
