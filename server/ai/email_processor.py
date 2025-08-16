#!/usr/bin/env python3
import sys
import json
from transformers import pipeline
import warnings
warnings.filterwarnings("ignore")

class EmailProcessor:
    def __init__(self):
        try:
            # Initialize summarization pipeline
            self.summarizer = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                tokenizer="facebook/bart-large-cnn"
            )
        except Exception as e:
            print(f"Error initializing summarizer: {e}", file=sys.stderr)
            self.summarizer = None
    
    def summarize_email(self, email_text: str, max_length: int = 100) -> str:
        """Generate email summary"""
        try:
            if not self.summarizer:
                return self._fallback_summary(email_text)
            
            # Clean and truncate text for summarization
            cleaned_text = email_text.strip()
            if len(cleaned_text) < 50:
                return cleaned_text
            
            # Truncate if too long for the model
            if len(cleaned_text) > 1000:
                cleaned_text = cleaned_text[:1000] + "..."
            
            summary = self.summarizer(
                cleaned_text,
                max_length=max_length,
                min_length=30,
                do_sample=False
            )
            
            return summary[0]['summary_text']
            
        except Exception as e:
            print(f"Error in summarization: {e}", file=sys.stderr)
            return self._fallback_summary(email_text)
    
    def _fallback_summary(self, text: str) -> str:
        """Fallback summary method"""
        sentences = text.split('. ')
        if len(sentences) <= 2:
            return text[:200] + "..." if len(text) > 200 else text
        
        # Return first two sentences
        return '. '.join(sentences[:2]) + '.'
    
    def generate_reply_draft(self, email_text: str, priority: str) -> str:
        """Generate a draft reply based on email content and priority"""
        try:
            # Simple template-based reply generation
            if priority == "urgent":
                return "Thank you for the urgent message. I will prioritize this and respond with details shortly."
            elif priority == "normal":
                return "Thank you for your email. I will review this and get back to you with a response."
            else:
                return "Thank you for your message. I will look into this when I have a chance."
                
        except Exception as e:
            print(f"Error generating reply: {e}", file=sys.stderr)
            return "Thank you for your email. I will get back to you soon."

def main():
    if len(sys.argv) < 2:
        print("Usage: python email_processor.py <command> [args...]", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    processor = EmailProcessor()
    
    if command == "summarize":
        email_data = json.loads(sys.stdin.read())
        summary = processor.summarize_email(email_data.get("body", ""))
        print(json.dumps({"summary": summary}))
    
    elif command == "draft_reply":
        email_data = json.loads(sys.stdin.read())
        draft = processor.generate_reply_draft(
            email_data.get("body", ""),
            email_data.get("priority", "normal")
        )
        print(json.dumps({"draft": draft}))
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
