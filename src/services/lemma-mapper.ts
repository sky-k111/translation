/**
 * Lemma Mapper Service
 * Maps irregular verb participles to their base forms
 */

import { IRREGULAR_VERBS, IrregularVerb } from '../data/irregular-verbs';

/**
 * Interface for Lemma Mapper
 */
export interface LemmaMapper {
  /**
   * Get the base form (lemma) of a word
   * @param word - The word to look up (typically a past participle)
   * @returns The base form or null if not found
   */
  getLemma(word: string): string | null;

  /**
   * Check if a word is an irregular past participle
   * @param word - The word to check
   * @returns True if the word is an irregular past participle
   */
  isIrregularParticiple(word: string): boolean;

  /**
   * Initialize the mapper (loads the irregular verbs mapping table)
   */
  initialize(): void;
}

/**
 * Implementation of LemmaMapper
 * Uses the IRREGULAR_VERBS mapping table to find base forms
 */
export class LemmaMapperImpl implements LemmaMapper {
  private initialized: boolean = false;
  private verbMap: Map<string, IrregularVerb>;

  constructor() {
    this.verbMap = new Map();
  }

  /**
   * Initialize the lemma mapper
   * Loads the irregular verbs mapping table into memory
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Copy the IRREGULAR_VERBS map
    this.verbMap = new Map(IRREGULAR_VERBS);
    this.initialized = true;
  }

  /**
   * Get the base form (lemma) of a word
   * @param word - The word to look up (case-insensitive)
   * @returns The base form or null if not found in irregular verbs
   */
  getLemma(word: string): string | null {
    if (!this.initialized) {
      this.initialize();
    }

    const normalizedWord = word.toLowerCase().trim();
    const verb = this.verbMap.get(normalizedWord);
    
    return verb ? verb.base : null;
  }

  /**
   * Check if a word is an irregular past participle
   * @param word - The word to check (case-insensitive)
   * @returns True if the word exists in the irregular verbs mapping
   */
  isIrregularParticiple(word: string): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    const normalizedWord = word.toLowerCase().trim();
    return this.verbMap.has(normalizedWord);
  }

  /**
   * Get the complete verb forms for a participle
   * @param participle - The past participle form
   * @returns The complete IrregularVerb object or null if not found
   */
  getVerbForms(participle: string): IrregularVerb | null {
    if (!this.initialized) {
      this.initialize();
    }

    const normalizedWord = participle.toLowerCase().trim();
    return this.verbMap.get(normalizedWord) || null;
  }

  /**
   * Get statistics about the loaded irregular verbs
   * @returns Object with count of loaded verbs
   */
  getStats(): { totalVerbs: number; initialized: boolean } {
    return {
      totalVerbs: this.verbMap.size,
      initialized: this.initialized
    };
  }
}

/**
 * Singleton instance of LemmaMapper
 * Use this for consistent access across the application
 */
export const lemmaMapper = new LemmaMapperImpl();
