/**
 * Pattern Detector Service
 * 
 * This file contains functions for detecting grammatical patterns that help
 * determine part-of-speech classification, particularly for ambiguous cases
 * like participles that can function as adjectives or verbs.
 */

import { Token, Pattern } from '../types/pos';
import {
  isDeterminer,
  isIntensifier,
  isBeVerb,
  isLinkingVerb,
  isParticiple,
  isAgentPhrase,
  isNoun,
  getPreviousToken,
  getNextToken,
} from '../utils/pos-helpers';

/**
 * Pattern 1: Determiner + Participle + Noun → Participle is Adjective
 * 
 * When a participle appears between a determiner and a noun, it functions
 * as an adjective modifying the noun.
 * 
 * Examples:
 * - "a broken window" - broken is adjective
 * - "the excited students" - excited is adjective
 * - "an interesting book" - interesting is adjective
 * 
 * IMPORTANT: This pattern requires the participle to be PRECEDED by a determiner.
 * It should NOT match "is writing a book" where "writing" is preceded by "is" (be verb).
 * 
 * @param tokens - Array of tokens in the sentence
 * @param position - Position of the word being analyzed
 * @returns True if the pattern matches
 */
export function isAdjectivePattern1(tokens: Token[], position: number): boolean {
  if (position < 1 || position >= tokens.length - 1) {
    return false;
  }
  
  const prev = getPreviousToken(tokens, position);
  const current = tokens[position];
  const next = getNextToken(tokens, position);
  
  // Check: determiner + participle + noun
  return (
    isDeterminer(prev?.word) &&
    isParticiple(current.word) &&
    isNoun(next?.word)
  );
}

/**
 * Pattern 2: Intensifier + Participle → Participle is Adjective
 * 
 * When a participle is preceded by a degree adverb (intensifier), it functions
 * as an adjective being modified by the adverb.
 * 
 * Examples:
 * - "very excited" - excited is adjective
 * - "extremely interesting" - interesting is adjective
 * - "quite broken" - broken is adjective
 * 
 * @param tokens - Array of tokens in the sentence
 * @param position - Position of the word being analyzed
 * @returns True if the pattern matches
 */
export function isAdjectivePattern2(tokens: Token[], position: number): boolean {
  if (position < 1) {
    return false;
  }
  
  const prev = getPreviousToken(tokens, position);
  const current = tokens[position];
  
  // Check: intensifier + participle
  return (
    isIntensifier(prev?.word) &&
    isParticiple(current.word)
  );
}

/**
 * Pattern 3: Be + Participle + "by" → Participle is Verb (Passive Voice)
 * 
 * When a participle appears after a "be" verb and is followed by "by" (agent phrase),
 * it's part of a passive voice construction and functions as a verb.
 * 
 * Examples:
 * - "was written by Tolkien" - written is verb
 * - "is completed by the team" - completed is verb
 * - "were broken by vandals" - broken is verb
 * 
 * @param tokens - Array of tokens in the sentence
 * @param position - Position of the word being analyzed
 * @returns True if the pattern matches
 */
export function isVerbPattern1(tokens: Token[], position: number): boolean {
  if (position < 1 || position >= tokens.length - 1) {
    return false;
  }
  
  const prev = getPreviousToken(tokens, position);
  const current = tokens[position];
  const next = getNextToken(tokens, position);
  
  // Check: be verb + participle + "by"
  return (
    isBeVerb(prev?.word) &&
    isParticiple(current.word) &&
    isAgentPhrase(next)
  );
}

/**
 * Pattern 4: Linking Verb + Participle (no "by") → Participle is Adjective
 * 
 * When a participle appears after a linking verb without a following "by" phrase,
 * it describes a state and functions as an adjective (subject complement).
 * 
 * Examples:
 * - "is broken" (no by phrase) - broken is adjective (describes state)
 * - "feels excited" - excited is adjective
 * - "seems interested" - interested is adjective
 * 
 * Note: This pattern must check that there's NO "by" phrase following,
 * otherwise it would be passive voice (verb).
 * 
 * IMPORTANT: This pattern should NOT match progressive tense like "is writing a book".
 * Progressive tense has be + -ing + object, which should be identified as verb.
 * 
 * @param tokens - Array of tokens in the sentence
 * @param position - Position of the word being analyzed
 * @returns True if the pattern matches
 */
export function isAdjectivePattern3(tokens: Token[], position: number): boolean {
  if (position < 1) {
    return false;
  }
  
  const prev = getPreviousToken(tokens, position);
  const current = tokens[position];
  const next = getNextToken(tokens, position);
  
  // Special case: if current is -ing and prev is be verb and next exists (not end of sentence),
  // it's likely progressive tense (verb), not adjective
  if (current.word.toLowerCase().endsWith('ing') && 
      isBeVerb(prev?.word) && 
      next !== undefined) {
    // This is progressive tense, not adjective
    return false;
  }
  
  // Check: linking verb + participle + NOT "by"
  return (
    isLinkingVerb(prev?.word) &&
    isParticiple(current.word) &&
    !isAgentPhrase(next)
  );
}

/**
 * Pattern 5: Be + -ing + Object/Prep → -ing is Verb (Progressive Tense)
 * 
 * When an -ing word appears after a "be" verb and is followed by an object
 * or prepositional phrase, it's part of a progressive tense construction
 * and functions as a verb.
 * 
 * Examples:
 * - "is writing a book" - writing is verb
 * - "was running in the park" - running is verb
 * - "are studying for exams" - studying is verb
 * 
 * @param tokens - Array of tokens in the sentence
 * @param position - Position of the word being analyzed
 * @returns True if the pattern matches
 */
export function isVerbPattern2(tokens: Token[], position: number): boolean {
  if (position < 1 || position >= tokens.length - 1) {
    return false;
  }
  
  const prev = getPreviousToken(tokens, position);
  const current = tokens[position];
  const next = getNextToken(tokens, position);
  
  // Check: be verb + -ing word + (something follows)
  // The "something follows" indicates it's likely an object or prep phrase
  return (
    isBeVerb(prev?.word) &&
    current.word.toLowerCase().endsWith('ing') &&
    next !== undefined &&
    !isDeterminer(next.word) // If followed by determiner, might be adjective
  );
}

/**
 * Pattern 6: -ing at Subject/Object Position → -ing is Noun (Gerund)
 * 
 * When an -ing word appears at the beginning of a sentence (subject position)
 * or after a verb (object position), it functions as a noun (gerund).
 * 
 * Examples:
 * - "Swimming is fun" - Swimming is noun (subject)
 * - "I enjoy reading" - reading is noun (object)
 * - "Running helps health" - Running is noun (subject)
 * 
 * @param tokens - Array of tokens in the sentence
 * @param position - Position of the word being analyzed
 * @returns True if the pattern matches
 */
export function isNounPattern1(tokens: Token[], position: number): boolean {
  const current = tokens[position];
  
  // Must end with -ing
  if (!current.word.toLowerCase().endsWith('ing')) {
    return false;
  }
  
  // Pattern 1: At the start of sentence (subject position)
  if (position === 0) {
    return true;
  }
  
  // Pattern 2: After certain verbs that take gerund objects
  // (enjoy, like, love, hate, start, begin, continue, etc.)
  const prev = getPreviousToken(tokens, position);
  if (prev) {
    const gerundVerbs = new Set([
      'enjoy', 'like', 'love', 'hate', 'prefer', 'start', 'begin',
      'continue', 'finish', 'stop', 'avoid', 'consider', 'suggest',
      'recommend', 'practice', 'mind', 'miss', 'keep'
    ]);
    
    if (gerundVerbs.has(prev.word.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect which pattern (if any) matches for a given word position
 * 
 * This function checks all patterns in priority order and returns the first match.
 * Pattern priority:
 * 1. Verb patterns (more specific)
 * 2. Adjective patterns
 * 3. Noun patterns
 * 
 * @param tokens - Array of tokens in the sentence
 * @param position - Position of the word being analyzed
 * @returns The detected pattern or null if no pattern matches
 */
export function detectPattern(tokens: Token[], position: number): Pattern | null {
  // Check verb patterns first (more specific)
  if (isVerbPattern1(tokens, position)) {
    return 'be_participle_by';
  }
  
  // Check progressive tense pattern (be + -ing + object)
  if (isVerbPattern2(tokens, position)) {
    // We need to add this pattern to the Pattern type
    // For now, return null and let heuristics handle it
    return null;
  }
  
  // Check adjective patterns
  if (isAdjectivePattern1(tokens, position)) {
    return 'determiner_participle_noun';
  }
  
  if (isAdjectivePattern2(tokens, position)) {
    return 'intensifier_participle';
  }
  
  if (isAdjectivePattern3(tokens, position)) {
    return 'linking_verb_participle';
  }
  
  // No pattern matched
  return null;
}

/**
 * Get the POS tag suggested by a detected pattern
 * 
 * @param pattern - The detected pattern
 * @returns The suggested POS tag for the pattern
 */
export function getPatternPOS(pattern: Pattern): 'adjective' | 'verb' {
  switch (pattern) {
    case 'determiner_participle_noun':
    case 'intensifier_participle':
    case 'linking_verb_participle':
      return 'adjective';
    
    case 'be_participle_by':
      return 'verb';
    
    default:
      return 'adjective'; // Default fallback
  }
}
