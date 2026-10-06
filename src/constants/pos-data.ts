/**
 * Part-of-Speech Recognition Constants
 * 
 * This file contains constant data sets used for POS pattern recognition.
 * These constants support the frontend lightweight optimization approach.
 */

/**
 * Determiners (限定词)
 * Used to identify "determiner + participle + noun" patterns
 * 
 * Examples: "a broken window", "the excited students"
 */
export const DETERMINERS = new Set<string>([
  // Articles
  'a',
  'an',
  'the',
  
  // Demonstratives
  'this',
  'that',
  'these',
  'those',
  
  // Possessives
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
  
  // Quantifiers
  'some',
  'any',
  'no',
  'every',
  'each',
  'either',
  'neither',
  'all',
  'both',
  'few',
  'many',
  'several',
  'much'
]);

/**
 * Intensifiers / Degree Adverbs (程度副词)
 * Used to identify "intensifier + participle" patterns
 * 
 * Examples: "very excited", "extremely interesting"
 */
export const INTENSIFIERS = new Set<string>([
  'very',
  'extremely',
  'quite',
  'rather',
  'pretty',
  'fairly',
  'really',
  'truly',
  'highly',
  'deeply',
  'absolutely',
  'completely',
  'totally',
  'utterly',
  'entirely',
  'perfectly',
  'incredibly',
  'remarkably',
  'exceptionally',
  'extraordinarily',
  'particularly',
  'especially',
  'unusually',
  'surprisingly',
  'amazingly'
]);

/**
 * Linking Verbs (系动词)
 * Used to identify "linking verb + participle" patterns for state descriptions
 * 
 * Examples: "is broken", "feels excited", "seems interested"
 */
export const LINKING_VERBS = new Set<string>([
  // Be verbs
  'be',
  'is',
  'am',
  'are',
  'was',
  'were',
  'been',
  'being',
  
  // Sensory verbs
  'feel',
  'seem',
  'look',
  'sound',
  'appear',
  'taste',
  'smell',
  
  // Change of state verbs
  'become',
  'remain',
  'stay',
  'grow',
  'turn',
  'get',
  'go',
  'come',
  'prove'
]);

/**
 * Be Verbs (be 动词)
 * Subset of linking verbs, used specifically for passive voice detection
 * 
 * Examples: "was written by", "is completed by"
 */
export const BE_VERBS = new Set<string>([
  'be',
  'is',
  'am',
  'are',
  'was',
  'were',
  'been',
  'being'
]);

/**
 * Common past participle endings
 * Used for initial participle detection
 */
export const PAST_PARTICIPLE_ENDINGS = [
  'ed',
  'en',
  'n',
  't'
];

/**
 * Present participle ending
 */
export const PRESENT_PARTICIPLE_ENDING = 'ing';

/**
 * Common irregular past participles for quick lookup
 * This is a subset; the full list is in irregular-verbs.ts
 */
export const COMMON_IRREGULAR_PARTICIPLES = new Set<string>([
  'broken',
  'written',
  'spoken',
  'taken',
  'given',
  'driven',
  'chosen',
  'frozen',
  'stolen',
  'beaten',
  'hidden',
  'ridden',
  'risen',
  'fallen',
  'shaken',
  'eaten',
  'forgotten',
  'gotten',
  'bitten',
  'blown',
  'drawn',
  'flown',
  'grown',
  'known',
  'shown',
  'thrown',
  'worn',
  'torn',
  'sworn',
  'born',
  'done',
  'gone',
  'seen',
  'been'
]);

/**
 * Agent phrase indicators
 * Used to detect passive voice constructions
 */
export const AGENT_INDICATORS = new Set<string>([
  'by'
]);

/**
 * Common nouns for testing purposes
 * Used in property-based tests
 */
export const COMMON_NOUNS = [
  'window',
  'book',
  'student',
  'opportunity',
  'idea',
  'person',
  'door',
  'car',
  'house',
  'computer',
  'phone',
  'table',
  'chair',
  'dog',
  'cat',
  'tree',
  'flower',
  'city',
  'country',
  'world'
];

/**
 * Default color scheme for POS visualization
 */
export const DEFAULT_COLOR_SCHEME = {
  noun: '#4A90E2',      // Blue
  verb: '#E24A4A',      // Red
  adjective: '#50C878',  // Green
  adverb: '#F5A623',    // Orange
  unknown: '#9B9B9B'    // Gray
};
