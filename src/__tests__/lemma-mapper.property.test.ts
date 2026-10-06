/**
 * Property-Based Tests for Lemma Mapper
 * Feature: pos-recognition-optimization
 * Property 5: 不规则动词词元映射的正确性
 * Validates: Requirements 1.5
 */

import * as fc from 'fast-check';
import { LemmaMapperImpl } from '../services/lemma-mapper';
import { IRREGULAR_VERBS } from '../data/irregular-verbs';

describe('Lemma Mapper - Property-Based Tests', () => {
  let mapper: LemmaMapperImpl;

  beforeAll(() => {
    mapper = new LemmaMapperImpl();
    mapper.initialize();
  });

  /**
   * Property 5: 不规则动词词元映射的正确性
   * Validates: Requirements 1.5
   * 
   * For any irregular verb past participle in our mapping table,
   * the mapper should return the correct base form, and this mapping
   * should be bijective (one-to-one correspondence).
   */
  test('Property 5: Irregular verb lemma mapping correctness', () => {
    // Get all past participles from the IRREGULAR_VERBS map
    const allParticiples = Array.from(IRREGULAR_VERBS.keys());

    fc.assert(
      fc.property(
        fc.constantFrom(...allParticiples),
        (participle) => {
          // Get the expected base form from the mapping table
          const expectedVerb = IRREGULAR_VERBS.get(participle);
          expect(expectedVerb).toBeDefined();

          // Get the base form using the mapper
          const actualBase = mapper.getLemma(participle);

          // Verify the mapping exists and is correct
          expect(actualBase).not.toBeNull();
          expect(actualBase).toBe(expectedVerb!.base);

          // Verify the word is recognized as an irregular participle
          expect(mapper.isIrregularParticiple(participle)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5a: Case-insensitive mapping
   * 
   * The mapper should work correctly regardless of the case of the input.
   */
  test('Property 5a: Case-insensitive lemma mapping', () => {
    const allParticiples = Array.from(IRREGULAR_VERBS.keys());

    fc.assert(
      fc.property(
        fc.constantFrom(...allParticiples),
        fc.constantFrom('lower', 'upper', 'mixed'),
        (participle, caseType) => {
          let testWord = participle;
          
          if (caseType === 'upper') {
            testWord = participle.toUpperCase();
          } else if (caseType === 'mixed' && participle.length > 1) {
            testWord = participle[0].toUpperCase() + participle.slice(1);
          }

          const expectedBase = IRREGULAR_VERBS.get(participle)!.base;
          const actualBase = mapper.getLemma(testWord);

          expect(actualBase).toBe(expectedBase);
          expect(mapper.isIrregularParticiple(testWord)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5b: Bijective mapping (one-to-one correspondence)
   * 
   * Each past participle should map to exactly one base form.
   * This property verifies the consistency of the mapping.
   */
  test('Property 5b: Bijective mapping consistency', () => {
    const allParticiples = Array.from(IRREGULAR_VERBS.keys());

    fc.assert(
      fc.property(
        fc.constantFrom(...allParticiples),
        (participle) => {
          // Get the base form multiple times
          const base1 = mapper.getLemma(participle);
          const base2 = mapper.getLemma(participle);
          const base3 = mapper.getLemma(participle);

          // All calls should return the same result (consistency)
          expect(base1).toBe(base2);
          expect(base2).toBe(base3);

          // The result should match the expected base form
          const expectedBase = IRREGULAR_VERBS.get(participle)!.base;
          expect(base1).toBe(expectedBase);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5c: Non-existent words return null
   * 
   * Words that are not in the irregular verbs table should return null.
   */
  test('Property 5c: Non-irregular words return null', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 15 }).filter(
          (word) => !IRREGULAR_VERBS.has(word.toLowerCase())
        ),
        (nonIrregularWord) => {
          const result = mapper.getLemma(nonIrregularWord);
          const isIrregular = mapper.isIrregularParticiple(nonIrregularWord);

          // Should return null for non-irregular words
          expect(result).toBeNull();
          expect(isIrregular).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5d: Whitespace handling
   * 
   * The mapper should handle words with leading/trailing whitespace correctly.
   */
  test('Property 5d: Whitespace trimming', () => {
    const allParticiples = Array.from(IRREGULAR_VERBS.keys());

    fc.assert(
      fc.property(
        fc.constantFrom(...allParticiples),
        fc.nat(5), // Number of leading spaces
        fc.nat(5), // Number of trailing spaces
        (participle, leadingSpaces, trailingSpaces) => {
          const paddedWord = ' '.repeat(leadingSpaces) + participle + ' '.repeat(trailingSpaces);
          const expectedBase = IRREGULAR_VERBS.get(participle)!.base;

          const actualBase = mapper.getLemma(paddedWord);

          expect(actualBase).toBe(expectedBase);
          expect(mapper.isIrregularParticiple(paddedWord)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
