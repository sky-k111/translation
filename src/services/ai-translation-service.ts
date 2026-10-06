/**
 * AI Translation Service with POS Recognition
 * 
 * Extends the existing AI translation service to include part-of-speech recognition.
 * Uses enhanced prompts to extract POS information from AI responses.
 * Includes fallback mechanism to Context Analyzer when AI fails.
 */

import { POSTag, POSAnalysisResult, WordAnalysis } from '../types/pos';
import { ContextAnalyzer, contextAnalyzer as defaultContextAnalyzer } from './context-analyzer';
import { 
  ENHANCED_TRANSLATION_PROMPT, 
  POS_ONLY_PROMPT, 
  SYSTEM_PROMPT 
} from '../prompts/pos-translation-prompt';
import { 
  validatePOSTags, 
  applyCorrections, 
  ValidationResult,
  AIWordInfo 
} from '../validators/pos-validator';

/**
 * AI Translation result with POS information
 */
export interface AITranslationResult {
  /** Chinese translation */
  translation: string;
  /** Word-level POS information */
  words: AIWordInfo[];
  /** Confidence score (optional) */
  confidence?: number;
}

/**
 * AI service configuration
 */
export interface AIServiceConfig {
  /** API endpoint URL */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Model name to use */
  model: string;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * AI Translation Service Interface
 */
export interface AITranslationService {
  /**
   * Translate and get POS information
   * @param sentence - Sentence to translate and analyze
   * @returns Translation result with POS tags
   */
  translateWithPOS(sentence: string): Promise<AITranslationResult>;

  /**
   * Get POS information only (no translation)
   * @param sentence - Sentence to analyze
   * @returns POS analysis result
   */
  getPOSOnly(sentence: string): Promise<POSAnalysisResult>;

  /**
   * Validate POS tags returned by AI
   * @param result - AI translation result
   * @returns Validation result
   */
  validatePOSTags(result: AITranslationResult): ValidationResult;
}

/**
 * OpenAI Translation Service Implementation
 */
export class OpenAITranslationService implements AITranslationService {
  private config: AIServiceConfig;
  private fallbackAnalyzer: ContextAnalyzer;

  constructor(config: AIServiceConfig, fallbackAnalyzer?: ContextAnalyzer) {
    this.config = {
      ...config,
      temperature: config.temperature ?? 0.3,
      timeout: config.timeout ?? 5000
    };
    this.fallbackAnalyzer = fallbackAnalyzer || defaultContextAnalyzer;
  }

  /**
   * Translate and get POS information
   */
  async translateWithPOS(sentence: string): Promise<AITranslationResult> {
    // Handle empty input
    if (!sentence || sentence.trim().length === 0) {
      return {
        translation: '',
        words: []
      };
    }

    try {
      // Prepare the prompt
      const userPrompt = ENHANCED_TRANSLATION_PROMPT.replace('{sentence}', sentence);

      // Call AI API with timeout
      const result = await this.callAIWithTimeout(userPrompt);

      // Validate the result
      const validation = this.validatePOSTags(result);
      
      if (!validation.isValid) {
        console.warn('AI POS tags validation failed:', validation.errors);
        
        // Apply corrections if available
        if (validation.correctedTags) {
          result.words = applyCorrections(result.words, validation.correctedTags);
        }
      }

      return result;
    } catch (error) {
      console.error('AI translation failed, falling back to context analyzer:', error);
      
      // Fallback to context analyzer
      return this.fallbackToContextAnalyzer(sentence);
    }
  }

  /**
   * Get POS information only (no translation)
   */
  async getPOSOnly(sentence: string): Promise<POSAnalysisResult> {
    // Handle empty input
    if (!sentence || sentence.trim().length === 0) {
      return {
        sentence: '',
        words: [],
        approach: 'ai',
        timestamp: Date.now(),
        cacheHit: false
      };
    }

    try {
      // Prepare the prompt
      const userPrompt = POS_ONLY_PROMPT.replace('{sentence}', sentence);

      // Call AI API
      const response = await this.callAIWithTimeout(userPrompt);

      // Convert to POSAnalysisResult format
      const words: WordAnalysis[] = response.words.map((w, idx) => ({
        word: w.word,
        position: idx,
        pos: w.pos,
        confidence: 0.95, // High confidence for AI results
        explanation: w.explanation
      }));

      return {
        sentence,
        words,
        approach: 'ai',
        timestamp: Date.now(),
        cacheHit: false
      };
    } catch (error) {
      console.error('AI POS analysis failed, falling back to context analyzer:', error);
      
      // Fallback to context analyzer
      return this.fallbackAnalyzer.analyze(sentence);
    }
  }

  /**
   * Validate POS tags returned by AI
   */
  validatePOSTags(result: AITranslationResult): ValidationResult {
    return validatePOSTags(result.words);
  }

  /**
   * Call AI API with timeout protection
   */
  private async callAIWithTimeout(userPrompt: string): Promise<AITranslationResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI service timeout')), this.config.timeout);
    });

    const apiPromise = this.callAIAPI(userPrompt);

    return Promise.race([apiPromise, timeoutPromise]);
  }

  /**
   * Call AI API
   */
  private async callAIAPI(userPrompt: string): Promise<AITranslationResult> {
    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      
      // Validate response structure
      if (!parsed.words || !Array.isArray(parsed.words)) {
        throw new Error('Invalid response structure: missing words array');
      }

      return {
        translation: parsed.translation || '',
        words: parsed.words,
        confidence: 0.95
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Failed to parse AI response: ${errorMessage}`);
    }
  }

  /**
   * Fallback to context analyzer when AI fails
   */
  private fallbackToContextAnalyzer(sentence: string): AITranslationResult {
    console.log('Using fallback context analyzer for:', sentence);
    
    const analysis = this.fallbackAnalyzer.analyze(sentence);
    
    // Convert to AITranslationResult format
    const words: AIWordInfo[] = analysis.words.map(w => ({
      word: w.word,
      pos: w.pos,
      explanation: 'Fallback analysis (AI unavailable)'
    }));

    return {
      translation: '', // No translation in fallback mode
      words,
      confidence: 0.7 // Lower confidence for fallback
    };
  }
}

/**
 * Create AI Translation Service from Chrome storage settings
 * This function integrates with the existing Chrome extension
 */
export async function createAIServiceFromSettings(): Promise<OpenAITranslationService | null> {
  try {
    // Get AI settings from Chrome storage
    const result = await chrome.storage.local.get(['aiSettings']);
    const settings = result.aiSettings;

    if (!settings || !settings.enabled || !settings.apiKey) {
      console.log('AI service not configured or not enabled');
      return null;
    }

    const config: AIServiceConfig = {
      apiUrl: settings.apiUrl,
      apiKey: settings.apiKey,
      model: settings.model,
      temperature: settings.temperature || 0.3,
      timeout: 5000
    };

    return new OpenAITranslationService(config);
  } catch (error) {
    console.error('Failed to create AI service from settings:', error);
    return null;
  }
}
