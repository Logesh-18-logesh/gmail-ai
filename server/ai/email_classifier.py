#!/usr/bin/env python3
import sys
import json
import os
from typing import List, Dict, Any
import pandas as pd
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from sklearn.feature_extraction.text import TfidfVectorizer
import pickle
import warnings
warnings.filterwarnings("ignore")

class AdaptiveEmailClassifier:
    def __init__(self):
        self.model_name = "distilbert-base-uncased"
        self.classifier = None
        self.vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
        self.priority_model = None
        self.training_data = []
        
        # Initialize the classifier
        try:
            self.classifier = pipeline(
                "text-classification",
                model=self.model_name,
                tokenizer=self.model_name,
                return_all_scores=True
            )
        except Exception as e:
            print(f"Error initializing classifier: {e}", file=sys.stderr)
    
    def classify_priority(self, email_text: str, subject: str = "", sender: str = "") -> Dict[str, Any]:
        """Classify email priority and return confidence scores"""
        try:
            # Combine text features
            combined_text = f"{subject} {email_text} {sender}"
            
            # Keywords that indicate urgency
            urgent_keywords = [
                'urgent', 'asap', 'immediate', 'emergency', 'critical', 'deadline',
                'today', 'now', 'quickly', 'rush', 'priority', 'important',
                'need response', 'time sensitive', 'breaking', 'alert'
            ]
            
            normal_keywords = [
                'meeting', 'schedule', 'discussion', 'review', 'update',
                'information', 'follow up', 'question', 'request', 'feedback'
            ]
            
            low_keywords = [
                'newsletter', 'notification', 'fyi', 'heads up', 'reminder',
                'announcement', 'info', 'casual', 'when you have time'
            ]
            
            text_lower = combined_text.lower()
            
            urgent_score = sum(1 for keyword in urgent_keywords if keyword in text_lower)
            normal_score = sum(1 for keyword in normal_keywords if keyword in text_lower)
            low_score = sum(1 for keyword in low_keywords if keyword in text_lower)
            
            # Calculate confidence based on keyword matches and text length
            total_score = urgent_score + normal_score + low_score
            if total_score == 0:
                total_score = 1  # Avoid division by zero
            
            urgent_confidence = (urgent_score / total_score) * 100
            normal_confidence = (normal_score / total_score) * 100
            low_confidence = (low_score / total_score) * 100
            
            # Determine priority based on highest score
            if urgent_score >= normal_score and urgent_score >= low_score:
                priority = "urgent"
                confidence = max(urgent_confidence, 60)  # Minimum 60% for urgent
            elif normal_score >= low_score:
                priority = "normal"
                confidence = max(normal_confidence, 50)  # Minimum 50% for normal
            else:
                priority = "low"
                confidence = max(low_confidence, 40)  # Minimum 40% for low
            
            # Check for specific patterns that override
            if any(word in text_lower for word in ['deadline today', 'need response today', 'urgent']):
                priority = "urgent"
                confidence = max(confidence, 85)
            
            return {
                "priority": priority,
                "confidence": int(confidence),
                "scores": {
                    "urgent": urgent_confidence,
                    "normal": normal_confidence,
                    "low": low_confidence
                }
            }
            
        except Exception as e:
            print(f"Error in classification: {e}", file=sys.stderr)
            return {
                "priority": "normal",
                "confidence": 50,
                "scores": {"urgent": 0, "normal": 50, "low": 0}
            }
    
    def add_examples(self, texts: List[str], labels: List[str]):
        """Add training examples for model improvement"""
        try:
            for text, label in zip(texts, labels):
                self.training_data.append({"text": text, "label": label})
            
            # In a real implementation, you would retrain the model here
            print(f"Added {len(texts)} training examples", file=sys.stderr)
            
        except Exception as e:
            print(f"Error adding examples: {e}", file=sys.stderr)
    
    def extract_deadline(self, email_text: str) -> Dict[str, Any]:
        """Extract deadline information from email text"""
        try:
            # Use question-answering pipeline for deadline extraction
            qa_pipeline = pipeline("question-answering", model="distilbert-base-cased-distilled-squad")
            
            questions = [
                "When is the deadline?",
                "What is the due date?", 
                "When do you need this?",
                "What time is this due?"
            ]
            
            deadline_info = None
            confidence = 0
            
            for question in questions:
                try:
                    result = qa_pipeline(question=question, context=email_text)
                    if result['score'] > confidence:
                        deadline_info = result['answer']
                        confidence = result['score']
                except:
                    continue
            
            return {
                "deadline": deadline_info,
                "confidence": confidence
            }
            
        except Exception as e:
            print(f"Error extracting deadline: {e}", file=sys.stderr)
            return {"deadline": None, "confidence": 0}

def main():
    if len(sys.argv) < 2:
        print("Usage: python email_classifier.py <command> [args...]", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    classifier = AdaptiveEmailClassifier()
    
    if command == "classify":
        # Read email data from stdin
        email_data = json.loads(sys.stdin.read())
        
        result = classifier.classify_priority(
            email_data.get("body", ""),
            email_data.get("subject", ""),
            email_data.get("sender", "")
        )
        
        print(json.dumps(result))
    
    elif command == "extract_deadline":
        email_data = json.loads(sys.stdin.read())
        result = classifier.extract_deadline(email_data.get("body", ""))
        print(json.dumps(result))
    
    elif command == "add_feedback":
        feedback_data = json.loads(sys.stdin.read())
        texts = feedback_data.get("texts", [])
        labels = feedback_data.get("labels", [])
        classifier.add_examples(texts, labels)
        print(json.dumps({"status": "success", "message": "Feedback added"}))
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
