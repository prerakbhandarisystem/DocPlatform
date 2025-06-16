"""
AI service supporting multiple LLM providers (OpenAI, Google AI)
"""

import structlog
from app.core.config import settings
from typing import Dict, Any, Optional
import logging
import asyncio

logger = structlog.get_logger()


class AIService:
    """AI service supporting multiple LLM providers."""
    
    def __init__(self):
        self.settings = settings
        self.client = None
        self.initialized = False
        self.provider = self._determine_provider()
        
    def _determine_provider(self) -> str:
        """Determine which AI provider to use based on available configuration."""
        if self.settings.GOOGLE_AI_API_KEY:
            return "google"
        elif self.settings.OPENAI_API_KEY:
            return "openai"
        else:
            return "none"
    
    async def initialize(self):
        """Initialize AI service."""
        if self.provider == "google" and self.settings.GOOGLE_AI_API_KEY:
            import google.generativeai as genai
            genai.configure(api_key=self.settings.GOOGLE_AI_API_KEY)
            self.client = genai.GenerativeModel(self.settings.GOOGLE_AI_MODEL)
        elif self.provider == "openai" and self.settings.OPENAI_API_KEY:
            import openai
            self.client = openai.AsyncOpenAI(api_key=self.settings.OPENAI_API_KEY)
        
        logger.info(f"AI service initialized with provider: {self.provider}")
        self.initialized = True
    
    async def close(self):
        """Close AI service."""
        logger.info("AI service closed")

    async def process_request(
        self,
        message: str,
        document_id: str,
        selected_text: Optional[str] = None,
        feature: str = "chat",
        context: Optional[Dict[str, Any]] = None,
        document_content: Optional[str] = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        """
        Process AI request based on feature type
        """
        if self.provider == "none":
            return {
                "response": "🔧 AI service is not configured. Please set your GOOGLE_AI_API_KEY environment variable. Get your free API key from https://aistudio.google.com/",
                "feature": feature
            }
            
        try:
            # Initialize if not already done
            if not self.initialized:
                await self.initialize()
            
            system_prompt = self._get_system_prompt(feature, context)
            user_prompt = self._build_user_prompt(
                message, selected_text, document_content, feature
            )
            
            # Generate response based on provider
            if self.provider == "google":
                ai_response = await self._generate_google_response(system_prompt, user_prompt)
            elif self.provider == "openai":
                ai_response = await self._generate_openai_response(system_prompt, user_prompt)
            else:
                ai_response = "AI provider not configured properly."
            
            # Process response based on feature
            processed_response = await self._process_feature_response(
                ai_response, feature, context
            )
            
            return processed_response
            
        except Exception as e:
            logger.error(f"AI processing error: {str(e)}")
            return {
                "response": f"I encountered an error: {str(e)}. If this is an API key issue, please check your GOOGLE_AI_API_KEY environment variable.",
                "feature": feature
            }
    
    async def _generate_google_response(self, system_prompt: str, user_prompt: str) -> str:
        """Generate response using Google AI (Gemini)."""
        try:
            # Combine system and user prompts for Gemini
            full_prompt = f"{system_prompt}\n\nUser: {user_prompt}\n\nAssistant:"
            
            # Generate response synchronously (Gemini SDK doesn't have async yet)
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.client.generate_content(
                    full_prompt,
                    generation_config={
                        'temperature': self.settings.GOOGLE_AI_TEMPERATURE,
                        'max_output_tokens': self.settings.GOOGLE_AI_MAX_TOKENS,
                        'top_p': 0.9,
                        'top_k': 40
                    }
                )
            )
            
            return response.text if response.text else "I couldn't generate a response. Please try again."
            
        except Exception as e:
            logger.error(f"Google AI error: {str(e)}")
            raise
    
    async def _generate_openai_response(self, system_prompt: str, user_prompt: str) -> str:
        """Generate response using OpenAI."""
        try:
            response = await self.client.chat.completions.create(
                model=self.settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=self.settings.OPENAI_MAX_TOKENS,
                temperature=self.settings.OPENAI_TEMPERATURE
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            raise
    
    def _get_system_prompt(self, feature: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Get system prompt based on feature."""
        base_prompt = "You are an AI assistant helping with document editing and analysis. Be helpful, accurate, and concise."
        
        feature_prompts = {
            "chat": "Engage in helpful conversation about the document. Be conversational and informative.",
            "questions": "Answer specific questions about the document content accurately and thoroughly.",
            "suggestions": "Provide actionable suggestions for improving the document's content, structure, or style. For each suggestion, provide the specific text that should be inserted or replaced. Format each suggestion as: 'SUGGESTION: [brief description] | INSERT: [exact text to insert]'",
            "summary": "Create clear, concise summaries that capture the key points and main ideas.",
            "grammar": "Check for grammar, spelling, punctuation, and style issues. For each correction, provide the original text and the corrected version in this format: 'ORIGINAL: [original text] | CORRECTED: [corrected text] | REASON: [explanation]'",
            "translation": f"Translate content to {context.get('targetLanguage', 'Spanish') if context else 'Spanish'}. Provide the translation in this format: 'TRANSLATION: [translated text]'",
            "templates": "Suggest appropriate document templates, formats, and structural improvements.",
            "collaboration": "Provide collaboration notes, feedback, and suggestions for team document work."
        }
        
        feature_specific = feature_prompts.get(feature, feature_prompts["chat"])
        
        tone_instruction = ""
        if context and context.get('toneSettings'):
            tone = context['toneSettings']
            tone_instruction = f" Adjust your response to be {tone.get('formality', 'neutral')} in formality, {tone.get('emotion', 'neutral')} in emotion, and {tone.get('clarity', 'clear')} in clarity."
        
        return f"{base_prompt} {feature_specific}{tone_instruction}"
    
    def _build_user_prompt(
        self,
        message: str,
        selected_text: Optional[str] = None,
        document_content: Optional[str] = None,
        feature: str = "chat"
    ) -> str:
        """Build user prompt with context."""
        prompt_parts = []
        
        if document_content:
            prompt_parts.append(f"Document content: {document_content[:3000]}...")
        
        if selected_text:
            prompt_parts.append(f"Selected text: {selected_text}")
        
        prompt_parts.append(f"User request: {message}")
        
        return "\n\n".join(prompt_parts)
    
    async def _process_feature_response(
        self,
        response: str,
        feature: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process AI response based on feature."""
        result = {
            "response": response,
            "feature": feature,
            "provider": self.provider
        }
        
        # Add feature-specific enhancements
        if feature == "suggestions":
            suggestions = self._extract_suggestions(response)
            result["suggestions"] = suggestions
        elif feature == "grammar":
            corrections = self._extract_corrections(response)
            result["corrections"] = corrections
        elif feature == "translation":
            result["translation"] = {
                "original_language": "auto-detect",
                "target_language": context.get('targetLanguage', 'es') if context else 'es',
                "translated_text": response
            }
        
        return result
    
    def _extract_suggestions(self, response: str) -> list:
        """Extract actionable suggestions from AI response."""
        suggestions = []
        lines = response.split('\n')
        for line in lines:
            if 'SUGGESTION:' in line and 'INSERT:' in line:
                parts = line.split('|')
                if len(parts) >= 2:
                    suggestion_part = parts[0].replace('SUGGESTION:', '').strip()
                    insert_part = parts[1].replace('INSERT:', '').strip()
                    suggestions.append({
                        'description': suggestion_part,
                        'text': insert_part,
                        'type': 'insert'
                    })
            elif line.strip().startswith(('•', '-', '*', '1.', '2.', '3.', '4.', '5.')):
                # Fallback for simple bullet points
                suggestions.append({
                    'description': line.strip(),
                    'text': line.strip(),
                    'type': 'insert'
                })
        return suggestions
    
    def _extract_corrections(self, response: str) -> list:
        """Extract grammar corrections from AI response."""
        corrections = []
        lines = response.split('\n')
        for line in lines:
            if 'ORIGINAL:' in line and 'CORRECTED:' in line:
                parts = line.split('|')
                if len(parts) >= 3:
                    original_part = parts[0].replace('ORIGINAL:', '').strip()
                    corrected_part = parts[1].replace('CORRECTED:', '').strip()
                    reason_part = parts[2].replace('REASON:', '').strip()
                    corrections.append({
                        'original': original_part,
                        'corrected': corrected_part,
                        'reason': reason_part,
                        'type': 'replace'
                    })
        return corrections


# Global AI service instance
ai_service = AIService()