/**
 * Setup Test - Verifies testing framework is configured correctly
 */

import { POSTag, Token, Context, Pattern } from '../types/pos';
import { DETERMINERS, INTENSIFIERS, LINKING_VERBS } from '../constants/pos-data';

describe('Testing Framework Setup', () => {
  test('Jest is configured correctly', () => {
    expect(true).toBe(true);
  });

  test('TypeScript types are accessible', () => {
    const tag: POSTag = 'noun';
    expect(tag).toBe('noun');

    const token: Token = {
      word: 'test',
      position: 0
    };
    expect(token.word).toBe('test');
    expect(token.position).toBe(0);
  });

  test('Constants are loaded correctly', () => {
    expect(DETERMINERS.size).toBeGreaterThan(0);
    expect(DETERMINERS.has('a')).toBe(true);
    expect(DETERMINERS.has('the')).toBe(true);

    expect(INTENSIFIERS.size).toBeGreaterThan(0);
    expect(INTENSIFIERS.has('very')).toBe(true);
    expect(INTENSIFIERS.has('extremely')).toBe(true);

    expect(LINKING_VERBS.size).toBeGreaterThan(0);
    expect(LINKING_VERBS.has('is')).toBe(true);
    expect(LINKING_VERBS.has('seem')).toBe(true);
  });

  test('Pattern types are defined', () => {
    const pattern1: Pattern = 'determiner_participle_noun';
    const pattern2: Pattern = 'intensifier_participle';
    const pattern3: Pattern = 'be_participle_by';
    const pattern4: Pattern = 'linking_verb_participle';

    expect(pattern1).toBe('determiner_participle_noun');
    expect(pattern2).toBe('intensifier_participle');
    expect(pattern3).toBe('be_participle_by');
    expect(pattern4).toBe('linking_verb_participle');
  });

  test('Context interface is properly structured', () => {
    const context: Context = {
      previousTokens: [{ word: 'a', position: 0 }],
      nextTokens: [{ word: 'window', position: 2 }],
      sentence: 'a broken window'
    };

    expect(context.previousTokens).toHaveLength(1);
    expect(context.nextTokens).toHaveLength(1);
    expect(context.sentence).toBe('a broken window');
  });
});
