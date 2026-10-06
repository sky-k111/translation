/**
 * Property-Based Testing Setup - Verifies fast-check is configured correctly
 */

import fc from 'fast-check';
import { POSTag } from '../types/pos';
import { DETERMINERS, INTENSIFIERS, LINKING_VERBS } from '../constants/pos-data';

describe('Property-Based Testing Framework Setup', () => {
  test('fast-check is configured correctly', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n === n; // Identity property
      }),
      { numRuns: 100 }
    );
  });

  test('can generate random POSTags', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb', 'unknown'),
        (tag) => {
          const validTags: POSTag[] = ['noun', 'verb', 'adjective', 'adverb', 'unknown'];
          return validTags.includes(tag);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('can generate random determiners', () => {
    const determinersArray = Array.from(DETERMINERS);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...determinersArray),
        (determiner) => {
          return DETERMINERS.has(determiner);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('can generate random intensifiers', () => {
    const intensifiersArray = Array.from(INTENSIFIERS);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...intensifiersArray),
        (intensifier) => {
          return INTENSIFIERS.has(intensifier);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('can generate random linking verbs', () => {
    const linkingVerbsArray = Array.from(LINKING_VERBS);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...linkingVerbsArray),
        (verb) => {
          return LINKING_VERBS.has(verb);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('can generate random sentences', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
        (words) => {
          const sentence = words.join(' ');
          return sentence.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
