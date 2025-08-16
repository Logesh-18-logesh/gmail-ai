# AI Email Assistant

## Overview

This is an AI-powered email assistant that automatically classifies emails by priority (urgent, normal, low) and provides intelligent features like email summarization, reply drafting, and calendar event creation. The application integrates with Gmail to fetch emails and uses machine learning models to analyze and categorize them.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/UI component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Context API for email state management combined with TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Google OAuth2 for Gmail and Calendar access
- **AI Integration**: Python scripts for email classification and processing using transformers library
- **File Handling**: Multer for credential file uploads
- **Session Management**: Express sessions with PostgreSQL store

### Database Schema
- **emails**: Stores email data with AI-generated priority classifications, summaries, and metadata
- **calendar_events**: Stores calendar events created from emails
- **user_feedback**: Captures user corrections to AI classifications for model improvement

### AI Components
- **Email Classification**: Uses DistilBERT model for priority classification (urgent/normal/low)
- **Email Summarization**: Uses BART model for generating email summaries
- **Adaptive Learning**: Collects user feedback to improve classification accuracy over time

### Authentication Flow
- Users upload Google OAuth credentials (credentials.json)
- OAuth flow redirects to Google for authorization
- Tokens are stored for accessing Gmail and Calendar APIs
- Authentication state is managed in-memory during sessions

### Data Flow
1. Gmail API fetches emails automatically
2. Python AI scripts process emails for classification and summarization
3. Processed emails are stored in PostgreSQL database
4. Frontend displays categorized emails with AI-generated insights
5. Users can provide feedback to improve AI accuracy
6. Calendar events can be created directly from emails

## External Dependencies

### Google Services
- **Gmail API**: For reading and sending emails
- **Google Calendar API**: For creating calendar events from emails
- **Google OAuth2**: For secure authentication and authorization

### AI/ML Services
- **Transformers Library**: Hugging Face transformers for NLP models
- **DistilBERT**: For email priority classification
- **BART**: For email summarization
- **Python Runtime**: For executing AI processing scripts

### Database
- **PostgreSQL**: Primary database for storing emails, events, and user feedback
- **Neon Database**: Cloud PostgreSQL provider (based on connection string pattern)

### Development Tools
- **Replit Integration**: Custom plugins for development environment
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Production bundling for server code