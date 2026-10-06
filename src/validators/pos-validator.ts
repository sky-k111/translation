/**
 * POS Validator
 * 
 * Validates AI-returned POS tags against basic grammar rules
 * and provides automatic correction when validation fails.
 */

import { POSTag } from '../types/pos';
import { DETERMINERS, INTENSIFIERS } from '../constants/pos-data';

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** List of validation errors found */
  errors: string[];
  /** Map of position to corrected POS tags (if corrections were made) */
  correctedTags?: Map<number, POSTag>;
}

/**
 * Word information from AI response
 */
export interface AIWordInfo {
  word: string;
  pos: POSTag;
  explanation?: string;
}

/**
 * Validate POS tags returned by AI service
 * 
 * Applies basic grammar rules to check if the POS tags make sense:
 * - Rule 1: Determiners cannot be followed by verbs
 * - Rule 2: Intensifiers should be followed by adjectives or adverbs
 * 
 * @param words - Array of word information from AI
 * @returns Validation result with errors and corrections
 */
export function validatePOSTags(words: AIWordInfo[]): ValidationResult {
  const errors: string[] = [];
  const correctedTags = new Map<number, POSTag>();

  // Validate each word in context
  for (let idx = 0; idx < words.length; idx++) {
    const word = words[idx];
    const prevWord = idx > 0 ? words[idx - 1] : null;
    const nextWord = idx < words.length - 1 ? words[idx + 1] : null;

    // Rule 1: Determiner + Verb is invalid
    // Determiners are followed by nouns or adjectives, not verbs
    if (prevWord && isDeterminer(prevWord.word)) {
      if (word.pos === 'verb') {
        errors.push(
          `Word "${word.word}" at position ${idx} is tagged as verb after determiner "${prevWord.word}"`
        );
        // Correction: likely an adjective or noun
        // If it ends in -ed or -ing, probably adjective
        if (word.word.endsWith('ed') || word.word.endsWith('ing')) {
          correctedTags.set(idx, 'adjective');
        } else {
          correctedTags.set(idx, 'noun');
        }
      }
    }

    // Rule 2: Intensifier + Verb/Noun is invalid
    // Intensifiers modify adjectives or adverbs, not verbs or nouns
    if (prevWord && isIntensifier(prevWord.word)) {
      if (word.pos === 'verb' || word.pos === 'noun') {
        errors.push(
          `Word "${word.word}" at position ${idx} is tagged as ${word.pos} after intensifier "${prevWord.word}"`
        );
        // Correction: should be adjective or adverb
        // Most common case is adjective
        correctedTags.set(idx, 'adjective');
      }
    }

    // Rule 3: Validate participle patterns
    // If a word ends in -ed/-ing and follows specific patterns, validate accordingly
    if (word.word.endsWith('ed') || word.word.endsWith('ing')) {
      const particpleError = validateParticiplePattern(word, prevWord, nextWord, idx);
      if (particpleError) {
        errors.push(particpleError.error);
        if (particpleError.correction) {
          correctedTags.set(idx, particpleError.correction);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    correctedTags: correctedTags.size > 0 ? correctedTags : undefined
  };
}

/**
 * Validate participle patterns specifically
 */
function validateParticiplePattern(
  word: AIWordInfo,
  prevWord: AIWordInfo | null,
  nextWord: AIWordInfo | null,
  position: number
): { error: string; correction?: POSTag } | null {
  // Pattern: determiner + participle + noun
  // The participle should be an adjective
  if (prevWord && isDeterminer(prevWord.word) && nextWord && nextWord.pos === 'noun') {
    if (word.pos !== 'adjective') {
      return {
        error: `Participle "${word.word}" at position ${position} should be adjective in "determiner + participle + noun" pattern`,
        correction: 'adjective'
      };
    }
  }

  // Pattern: intensifier + participle
  // The participle should be an adjective
  if (prevWord && isIntensifier(prevWord.word)) {
    if (word.pos !== 'adjective') {
      return {
        error: `Participle "${word.word}" at position ${position} should be adjective after intensifier`,
        correction: 'adjective'
      };
    }
  }

  // Pattern: be + participle + by
  // The participle should be a verb (passive voice)
  if (prevWord && isBeVerb(prevWord.word) && nextWord && nextWord.word.toLowerCase() === 'by') {
    if (word.pos !== 'verb') {
      return {
        error: `Participle "${word.word}" at position ${position} should be verb in passive voice pattern`,
        correction: 'verb'
      };
    }
  }

  return null;
}

/**
 * Check if a word is a determiner
 */
function isDeterminer(word: string): boolean {
  return DETERMINERS.has(word.toLowerCase());
}

/**
 * Check if a word is an intensifier
 */
function isIntensifier(word: string): boolean {
  return INTENSIFIERS.has(word.toLowerCase());
}

/**
 * Check if a word is a be verb
 */
function isBeVerb(word: string): boolean {
  const beVerbs = new Set(['be', 'is', 'am', 'are', 'was', 'were', 'been', 'being']);
  return beVerbs.has(word.toLowerCase());
}

/**
 * Apply corrections to word array
 * 
 * @param words - Original word array
 * @param corrections - Map of position to corrected POS
 * @returns New array with corrections applied
 */
export function applyCorrections(
  words: AIWordInfo[],
  corrections: Map<number, POSTag>
): AIWordInfo[] {
  return words.map((word, idx) => {
    const correctedPOS = corrections.get(idx);
    if (correctedPOS) {
      return {
        ...word,
        pos: correctedPOS,
        explanation: `Auto-corrected from ${word.pos} to ${correctedPOS}`
      };
    }
    return word;
  });
}
