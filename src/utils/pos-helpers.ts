/**
 * POS Helper Functions
 * 
 * This file contains utility functions for identifying word types and patterns
 * used in part-of-speech analysis. These functions support the Context Analyzer
 * in recognizing grammatical patterns.
 */

import {
  DETERMINERS,
  INTENSIFIERS,
  LINKING_VERBS,
  BE_VERBS,
  AGENT_INDICATORS,
  PRESENT_PARTICIPLE_ENDING,
} from '../constants/pos-data';
import { IRREGULAR_VERBS } from '../data/irregular-verbs';
import { Token } from '../types/pos';

/**
 * Check if a word is a determiner (限定词)
 * 
 * Determiners include articles (a, an, the), demonstratives (this, that),
 * possessives (my, your), and quantifiers (some, any, every).
 * 
 * @param word - The word to check
 * @returns True if the word is a determiner
 * 
 * @example
 * isDeterminer('a') // true
 * isDeterminer('the') // true
 * isDeterminer('broken') // false
 */
export function isDeterminer(word: string | undefined): boolean {
  if (!word) return false;
  return DETERMINERS.has(word.toLowerCase());
}

/**
 * Check if a word is an intensifier / degree adverb (程度副词)
 * 
 * Intensifiers modify adjectives or adverbs to indicate degree or intensity.
 * Examples: very, extremely, quite, really
 * 
 * @param word - The word to check
 * @returns True if the word is an intensifier
 * 
 * @example
 * isIntensifier('very') // true
 * isIntensifier('extremely') // true
 * isIntensifier('broken') // false
 */
export function isIntensifier(word: string | undefined): boolean {
  if (!word) return false;
  return INTENSIFIERS.has(word.toLowerCase());
}

/**
 * Check if a word is a linking verb (系动词)
 * 
 * Linking verbs connect the subject to a subject complement (often an adjective).
 * Examples: be, seem, feel, look, appear, become
 * 
 * @param word - The word to check
 * @returns True if the word is a linking verb
 * 
 * @example
 * isLinkingVerb('is') // true
 * isLinkingVerb('seems') // true
 * isLinkingVerb('broken') // false
 */
export function isLinkingVerb(word: string | undefined): boolean {
  if (!word) return false;
  return LINKING_VERBS.has(word.toLowerCase());
}

/**
 * Check if a word is a "be" verb
 * 
 * Be verbs are a subset of linking verbs, specifically forms of "be".
 * Used for passive voice detection.
 * Examples: be, is, am, are, was, were, been, being
 * 
 * @param word - The word to check
 * @returns True if the word is a be verb
 * 
 * @example
 * isBeVerb('is') // true
 * isBeVerb('was') // true
 * isBeVerb('seems') // false (linking verb but not be verb)
 */
export function isBeVerb(word: string | undefined): boolean {
  if (!word) return false;
  return BE_VERBS.has(word.toLowerCase());
}

/**
 * Check if a word is a participle (分词)
 * 
 * Participles are verb forms that can function as adjectives or parts of verb phrases.
 * Includes:
 * - Past participles: -ed endings or irregular forms (broken, written)
 * - Present participles: -ing endings (breaking, writing)
 * 
 * @param word - The word to check
 * @returns True if the word is a participle
 * 
 * @example
 * isParticiple('broken') // true (irregular past participle)
 * isParticiple('excited') // true (regular past participle)
 * isParticiple('breaking') // true (present participle)
 * isParticiple('window') // false
 */
export function isParticiple(word: string | undefined): boolean {
  if (!word) return false;
  
  const lowerWord = word.toLowerCase();
  
  // Check if it's an irregular past participle
  if (IRREGULAR_VERBS.has(lowerWord)) {
    return true;
  }
  
  // Check if it ends with -ed (past participle)
  if (lowerWord.endsWith('ed')) {
    return true;
  }
  
  // Check if it ends with -ing (present participle)
  if (lowerWord.endsWith(PRESENT_PARTICIPLE_ENDING)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a token represents an agent phrase (施事者短语)
 * 
 * Agent phrases indicate who performs the action in passive voice constructions.
 * Typically in the form "by + noun/pronoun".
 * 
 * @param token - The token to check (can be undefined)
 * @returns True if the token is part of an agent phrase (starts with "by")
 * 
 * @example
 * isAgentPhrase({ word: 'by', position: 3 }) // true
 * isAgentPhrase({ word: 'someone', position: 4 }) // false
 * isAgentPhrase(undefined) // false
 */
export function isAgentPhrase(token: Token | undefined): boolean {
  if (!token) return false;
  return AGENT_INDICATORS.has(token.word.toLowerCase());
}

/**
 * Check if a word is likely a noun
 * 
 * This is a simple heuristic check. A more sophisticated implementation
 * would use a dictionary or NLP library.
 * 
 * Current heuristics:
 * - Capitalized words (proper nouns)
 * - Words ending in common noun suffixes (-tion, -ness, -ment, -ity, etc.)
 * 
 * @param word - The word to check
 * @returns True if the word is likely a noun
 * 
 * @example
 * isNoun('window') // true (would need dictionary)
 * isNoun('information') // true (-tion suffix)
 * isNoun('happiness') // true (-ness suffix)
 */
export function isNoun(word: string | undefined): boolean {
  if (!word) return false;
  
  const lowerWord = word.toLowerCase();
  
  // Common noun suffixes
  const nounSuffixes = [
    'tion', 'sion', 'ness', 'ment', 'ity', 'ty', 'ance', 'ence',
    'ship', 'hood', 'dom', 'er', 'or', 'ist', 'ian', 'age', 'ism'
  ];
  
  // Check if word ends with common noun suffix
  for (const suffix of nounSuffixes) {
    if (lowerWord.endsWith(suffix)) {
      return true;
    }
  }
  
  // Check if word is capitalized (proper noun)
  // But not if it's at the start of a sentence (would need context)
  if (word[0] === word[0].toUpperCase() && word.length > 1) {
    return true;
  }
  
  // For now, return false for other cases
  // A full implementation would use a dictionary
  return false;
}

/**
 * Get the previous token from a token array
 * 
 * @param tokens - Array of tokens
 * @param position - Current position
 * @returns The previous token or undefined if at start
 */
export function getPreviousToken(tokens: Token[], position: number): Token | undefined {
  if (position <= 0 || position > tokens.length) return undefined;
  return tokens[position - 1];
}

/**
 * Get the next token from a token array
 * 
 * @param tokens - Array of tokens
 * @param position - Current position
 * @returns The next token or undefined if at end
 */
export function getNextToken(tokens: Token[], position: number): Token | undefined {
  if (position < 0 || position >= tokens.length - 1) return undefined;
  return tokens[position + 1];
}

/**
 * Tokenize a sentence into an array of Token objects
 * 
 * Simple whitespace-based tokenization. A more sophisticated implementation
 * would handle punctuation better.
 * 
 * @param sentence - The sentence to tokenize
 * @returns Array of Token objects
 * 
 * @example
 * tokenize('The broken window') 
 * // [
 * //   { word: 'The', position: 0 },
 * //   { word: 'broken', position: 1 },
 * //   { word: 'window', position: 2 }
 * // ]
 */
export function tokenize(sentence: string): Token[] {
  if (!sentence || sentence.trim().length === 0) {
    return [];
  }
  
  // Split by whitespace and filter empty strings
  const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
  
  return words.map((word, index) => ({
    word,
    position: index
  }));
}
