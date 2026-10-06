/**
 * Context Analyzer Service
 * 
 * Analyzes words in context to determine their part of speech.
 * Uses pattern recognition and heuristic rules to identify POS,
 * particularly for ambiguous cases like participles.
 */

import { POSTag, Token, Context, Pattern, POSAnalysisResult, WordAnalysis } from '../types/pos';
import { LemmaMapper, lemmaMapper as defaultLemmaMapper } from './lemma-mapper';
import {
  tokenize,
  isParticiple,
  isDeterminer,
  isIntensifier,
  isBeVerb,
  isLinkingVerb,
  isAgentPhrase,
  getPreviousToken,
  getNextToken,
} from '../utils/pos-helpers';
import {
  detectPattern,
  getPatternPOS,
  isAdjectivePattern1,
  isAdjectivePattern2,
  isAdjectivePattern3,
  isVerbPattern1,
  isVerbPattern2,
  isNounPattern1,
} from './pattern-detector';

/**
 * Interface for Context Analyzer
 */
export interface ContextAnalyzer {
  /**
   * Analyze the part of speech of a word in a sentence
   * @param word - The word to analyze
   * @param sentence - The complete sentence containing the word
   * @param position - The position of the word in the sentence (0-based)
   * @returns The identified part of speech
   */
  analyzePOS(word: string, sentence: string, position: number): POSTag;

  /**
   * Detect grammatical pattern at a position
   * @param tokens - Array of tokens
   * @param position - Position to check
   * @returns The detected pattern or null
   */
  detectPattern(tokens: Token[], position: number): Pattern | null;

  /**
   * Apply heuristic rules to determine POS
   * @param word - The word to analyze
   * @param context - Context information
   * @returns The identified part of speech
   */
  applyHeuristics(word: string, context: Context): POSTag;

  /**
   * Analyze an entire sentence
   * @param sentence - The sentence to analyze
   * @returns Complete analysis result
   */
  analyze(sentence: string): POSAnalysisResult;
}

/**
 * Implementation of Context Analyzer
 */
export class ContextAnalyzerImpl implements ContextAnalyzer {
  private lemmaMapper: LemmaMapper;

  constructor(lemmaMapper?: LemmaMapper) {
    this.lemmaMapper = lemmaMapper || defaultLemmaMapper;
    // Ensure lemma mapper is initialized
    this.lemmaMapper.initialize();
  }

  /**
   * Analyze the part of speech of a word in a sentence
   */
  analyzePOS(word: string, sentence: string, position: number): POSTag {
    // Handle empty input
    if (!word || !sentence) {
      return 'unknown';
    }

    // Tokenize the sentence
    const tokens = tokenize(sentence);
    
    // Validate position
    if (position < 0 || position >= tokens.length) {
      return 'unknown';
    }

    // Ensure we're analyzing the correct word
    const targetToken = tokens[position];
    if (targetToken.word.toLowerCase() !== word.toLowerCase()) {
      // Try to find the word in the tokens
      const foundIndex = tokens.findIndex(t => t.word.toLowerCase() === word.toLowerCase());
      if (foundIndex !== -1) {
        position = foundIndex;
      } else {
        return 'unknown';
      }
    }

    // First, try pattern detection
    const pattern = this.detectPattern(tokens, position);
    if (pattern) {
      return getPatternPOS(pattern);
    }

    // If no pattern matched, apply heuristics
    const context = this.buildContext(tokens, position);
    return this.applyHeuristics(word, context);
  }

  /**
   * Detect grammatical pattern at a position
   */
  detectPattern(tokens: Token[], position: number): Pattern | null {
    return detectPattern(tokens, position);
  }

  /**
   * Apply heuristic rules to determine POS
   */
  applyHeuristics(word: string, context: Context): POSTag {
    const lowerWord = word.toLowerCase();

    // Heuristic 1: Check if it's a participle
    if (!isParticiple(word)) {
      // If not a participle, we can't make strong assumptions
      // Return unknown for now (could be enhanced with dictionary lookup)
      return 'unknown';
    }

    // Heuristic 2: -ing words
    if (lowerWord.endsWith('ing')) {
      return this.analyzeIngWord(word, context);
    }

    // Heuristic 3: -ed words or irregular participles
    if (lowerWord.endsWith('ed') || this.lemmaMapper.isIrregularParticiple(word)) {
      return this.analyzeEdWord(word, context);
    }

    return 'unknown';
  }

  /**
   * Analyze an -ing word based on context
   */
  private analyzeIngWord(word: string, context: Context): POSTag {
    const prevToken = context.previousTokens[context.previousTokens.length - 1];
    const nextToken = context.nextTokens[0];

    // Pattern: be + -ing + object/prep → verb (progressive)
    if (prevToken && isBeVerb(prevToken.word)) {
      // If followed by something, check if it's an object
      if (nextToken) {
        const nextWord = nextToken.word.toLowerCase();
        
        // If next is "by", it's passive voice adjective
        if (nextWord === 'by') {
          return 'adjective';
        }
        
        // Otherwise, if there's something after the -ing word, it's likely progressive tense
        // (the something is an object or prepositional phrase)
        return 'verb';
      }
      // be + -ing at end of sentence → could be adjective
      return 'adjective';
    }

    // Pattern: at start of sentence or after certain verbs → noun (gerund)
    if (context.previousTokens.length === 0) {
      return 'noun'; // Subject position
    }

    if (prevToken) {
      const gerundVerbs = new Set([
        'enjoy', 'like', 'love', 'hate', 'prefer', 'start', 'begin',
        'continue', 'finish', 'stop', 'avoid', 'consider', 'suggest'
      ]);
      if (gerundVerbs.has(prevToken.word.toLowerCase())) {
        return 'noun'; // Object position
      }
    }

    // Pattern: determiner + -ing + noun → adjective
    if (prevToken && isDeterminer(prevToken.word) && nextToken) {
      return 'adjective';
    }

    // Pattern: intensifier + -ing → adjective
    if (prevToken && isIntensifier(prevToken.word)) {
      return 'adjective';
    }

    // Default for -ing: adjective (common usage)
    return 'adjective';
  }

  /**
   * Analyze an -ed word or irregular participle based on context
   */
  private analyzeEdWord(word: string, context: Context): POSTag {
    const prevToken = context.previousTokens[context.previousTokens.length - 1];
    const nextToken = context.nextTokens[0];

    // Pattern: be + participle + by → verb (passive voice)
    if (prevToken && isBeVerb(prevToken.word)) {
      if (nextToken && isAgentPhrase(nextToken)) {
        return 'verb';
      }
      // be + participle (no by) → adjective (state description)
      return 'adjective';
    }

    // Pattern: linking verb + participle → adjective
    if (prevToken && isLinkingVerb(prevToken.word)) {
      return 'adjective';
    }

    // Pattern: determiner + participle + noun → adjective
    if (prevToken && isDeterminer(prevToken.word) && nextToken) {
      return 'adjective';
    }

    // Pattern: intensifier + participle → adjective
    if (prevToken && isIntensifier(prevToken.word)) {
      return 'adjective';
    }

    // Default for -ed: adjective (common usage)
    return 'adjective';
  }

  /**
   * Build context information for a word at a position
   */
  private buildContext(tokens: Token[], position: number): Context {
    const previousTokens: Token[] = [];
    const nextTokens: Token[] = [];

    // Get up to 2 previous tokens
    for (let i = Math.max(0, position - 2); i < position; i++) {
      previousTokens.push(tokens[i]);
    }

    // Get up to 2 next tokens
    for (let i = position + 1; i < Math.min(tokens.length, position + 3); i++) {
      nextTokens.push(tokens[i]);
    }

    return {
      previousTokens,
      nextTokens,
      sentence: tokens.map(t => t.word).join(' ')
    };
  }

  /**
   * Analyze an entire sentence
   */
  analyze(sentence: string): POSAnalysisResult {
    const startTime = Date.now();

    // Handle empty input
    if (!sentence || sentence.trim().length === 0) {
      return {
        sentence: '',
        words: [],
        approach: 'frontend',
        timestamp: startTime,
        cacheHit: false
      };
    }

    // Tokenize
    const tokens = tokenize(sentence);

    // Analyze each word
    const words: WordAnalysis[] = tokens.map((token, index) => {
      const pos = this.analyzePOS(token.word, sentence, index);
      return {
        word: token.word,
        position: index,
        pos,
        confidence: this.calculateConfidence(pos, tokens, index)
      };
    });

    return {
      sentence,
      words,
      approach: 'frontend',
      timestamp: startTime,
      cacheHit: false
    };
  }

  /**
   * Calculate confidence score for a POS determination
   * Higher confidence when pattern matching succeeds
   */
  private calculateConfidence(pos: POSTag, tokens: Token[], position: number): number {
    // If we detected a pattern, confidence is high
    const pattern = this.detectPattern(tokens, position);
    if (pattern) {
      return 0.9; // High confidence from pattern matching
    }

    // If POS is unknown, confidence is low
    if (pos === 'unknown') {
      return 0.3;
    }

    // Heuristic-based determination has medium confidence
    return 0.7;
  }
}

/**
 * Singleton instance of Context Analyzer
 */
export const contextAnalyzer = new ContextAnalyzerImpl();
