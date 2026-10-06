/**
 * Property-Based Tests for Context Analyzer
 * 
 * These tests verify universal properties that should hold across all inputs
 * using the fast-check library for property-based testing.
 */

import fc from 'fast-check';
import { ContextAnalyzerImpl } from '../services/context-analyzer';
import { LemmaMapperImpl } from '../services/lemma-mapper';
import { DETERMINERS, INTENSIFIERS, COMMON_NOUNS } from '../constants/pos-data';
import { IRREGULAR_VERBS } from '../data/irregular-verbs';

describe('Context Analyzer - Property-Based Tests', () => {
  let analyzer: ContextAnalyzerImpl;
  let lemmaMapper: LemmaMapperImpl;

  beforeEach(() => {
    lemmaMapper = new LemmaMapperImpl();
    lemmaMapper.initialize();
    analyzer = new ContextAnalyzerImpl(lemmaMapper);
  });

  /**
   * Property 1: Determiner-Participle-Noun Pattern → Adjective
   * 
   * **Validates: Requirements 1.1, 2.3, 3.1**
   * 
   * For ANY sentence containing "determiner + participle + noun" pattern,
   * the participle MUST be identified as an adjective.
   */
  describe('Property 1: Determiner-Participle-Noun Pattern', () => {
    // Test data generators
    const determiners = Array.from(DETERMINERS);
    const pastParticiples = [
      'broken', 'written', 'spoken', 'taken', 'given', 'driven',
      'excited', 'interested', 'bored', 'tired', 'confused'
    ];
    const presentParticiples = [
      'breaking', 'writing', 'speaking', 'exciting', 'interesting',
      'boring', 'tiring', 'confusing', 'amazing', 'surprising'
    ];
    const allParticiples = [...pastParticiples, ...presentParticiples];
    const nouns = Array.from(COMMON_NOUNS);

    test('past participles in determiner-participle-noun pattern are adjectives', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...determiners),
          fc.constantFrom(...pastParticiples),
          fc.constantFrom(...nouns),
          (determiner, participle, noun) => {
            const sentence = `${determiner} ${participle} ${noun}`;
            const pos = analyzer.analyzePOS(participle, sentence, 1);
            
            // The participle should be identified as adjective
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('present participles in determiner-participle-noun pattern are adjectives', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...determiners),
          fc.constantFrom(...presentParticiples),
          fc.constantFrom(...nouns),
          (determiner, participle, noun) => {
            const sentence = `${determiner} ${participle} ${noun}`;
            const pos = analyzer.analyzePOS(participle, sentence, 1);
            
            // The participle should be identified as adjective
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('all participles in determiner-participle-noun pattern are adjectives', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...determiners),
          fc.constantFrom(...allParticiples),
          fc.constantFrom(...nouns),
          (determiner, participle, noun) => {
            const sentence = `${determiner} ${participle} ${noun}`;
            const pos = analyzer.analyzePOS(participle, sentence, 1);
            
            // The participle should be identified as adjective
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('irregular participles in determiner-participle-noun pattern are adjectives', () => {
      const irregularParticiples = Array.from(IRREGULAR_VERBS.keys()).slice(0, 30);
      
      fc.assert(
        fc.property(
          fc.constantFrom(...determiners),
          fc.constantFrom(...irregularParticiples),
          fc.constantFrom(...nouns),
          (determiner, participle, noun) => {
            const sentence = `${determiner} ${participle} ${noun}`;
            const pos = analyzer.analyzePOS(participle, sentence, 1);
            
            // The participle should be identified as adjective
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Intensifier-Participle Pattern → Adjective
   * 
   * **Validates: Requirements 1.2, 3.3**
   * 
   * For ANY sentence containing "intensifier + participle" pattern,
   * the participle MUST be identified as an adjective.
   */
  describe('Property 2: Intensifier-Participle Pattern', () => {
    const intensifiers = Array.from(INTENSIFIERS);
    const pastParticiples = [
      'broken', 'written', 'excited', 'interested', 'bored', 'tired',
      'confused', 'amazed', 'surprised', 'pleased', 'satisfied'
    ];
    const presentParticiples = [
      'breaking', 'exciting', 'interesting', 'boring', 'tiring',
      'confusing', 'amazing', 'surprising', 'pleasing', 'satisfying'
    ];
    const allParticiples = [...pastParticiples, ...presentParticiples];

    test('past participles after intensifiers are adjectives', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...intensifiers),
          fc.constantFrom(...pastParticiples),
          (intensifier, participle) => {
            const sentence = `It is ${intensifier} ${participle}`;
            const pos = analyzer.analyzePOS(participle, sentence, 2);
            
            // The participle should be identified as adjective
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('present participles after intensifiers are adjectives', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...intensifiers),
          fc.constantFrom(...presentParticiples),
          (intensifier, participle) => {
            const sentence = `It is ${intensifier} ${participle}`;
            const pos = analyzer.analyzePOS(participle, sentence, 2);
            
            // The participle should be identified as adjective
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('all participles after intensifiers are adjectives', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...intensifiers),
          fc.constantFrom(...allParticiples),
          (intensifier, participle) => {
            const sentence = `It is ${intensifier} ${participle}`;
            const pos = analyzer.analyzePOS(participle, sentence, 2);
            
            // The participle should be identified as adjective
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('intensifier-participle pattern works in different sentence contexts', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...intensifiers),
          fc.constantFrom(...allParticiples),
          fc.constantFrom('She is', 'He was', 'They are', 'I am', 'We were'),
          (intensifier, participle, prefix) => {
            const sentence = `${prefix} ${intensifier} ${participle}`;
            // Find the position of the participle
            const words = sentence.split(' ');
            const position = words.indexOf(participle);
            
            const pos = analyzer.analyzePOS(participle, sentence, position);
            
            // The participle should be identified as adjective
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Passive Voice Recognition → Verb
   * 
   * **Validates: Requirements 1.3, 2.2**
   * 
   * For ANY sentence containing "be + participle + by + agent" pattern,
   * the participle MUST be identified as a verb (passive voice).
   */
  describe('Property 3: Passive Voice Recognition', () => {
    const beVerbs = ['is', 'was', 'are', 'were', 'been', 'being'];
    const pastParticiples = [
      'broken', 'written', 'spoken', 'taken', 'given', 'driven',
      'completed', 'finished', 'created', 'destroyed', 'built'
    ];
    const agents = ['John', 'Mary', 'someone', 'them', 'him', 'her', 'the team', 'the author'];

    test('participles in be-participle-by pattern are verbs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...beVerbs),
          fc.constantFrom(...pastParticiples),
          fc.constantFrom(...agents),
          (beVerb, participle, agent) => {
            const sentence = `It ${beVerb} ${participle} by ${agent}`;
            // Find the position of the participle
            const words = sentence.split(' ');
            const position = words.indexOf(participle);
            
            const pos = analyzer.analyzePOS(participle, sentence, position);
            
            // The participle should be identified as verb (passive voice)
            return pos === 'verb';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('irregular participles in passive voice are verbs', () => {
      const irregularParticiples = ['broken', 'written', 'spoken', 'taken', 'given', 'driven', 'chosen', 'frozen'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...beVerbs),
          fc.constantFrom(...irregularParticiples),
          fc.constantFrom(...agents),
          (beVerb, participle, agent) => {
            const sentence = `The book ${beVerb} ${participle} by ${agent}`;
            // Find the position of the participle
            const words = sentence.split(' ');
            const position = words.indexOf(participle);
            
            const pos = analyzer.analyzePOS(participle, sentence, position);
            
            // The participle should be identified as verb
            return pos === 'verb';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('passive voice with different subjects', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('The window', 'The book', 'The car', 'The house', 'The project'),
          fc.constantFrom(...beVerbs),
          fc.constantFrom(...pastParticiples),
          fc.constantFrom(...agents),
          (subject, beVerb, participle, agent) => {
            const sentence = `${subject} ${beVerb} ${participle} by ${agent}`;
            // Find the position of the participle
            const words = sentence.split(' ');
            const position = words.indexOf(participle);
            
            const pos = analyzer.analyzePOS(participle, sentence, position);
            
            // The participle should be identified as verb
            return pos === 'verb';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: State Description Recognition → Adjective
   * 
   * **Validates: Requirements 1.4, 2.1**
   * 
   * For ANY sentence containing "linking verb + participle" (without "by"),
   * the participle MUST be identified as an adjective (state description).
   */
  describe('Property 4: State Description Recognition', () => {
    const linkingVerbs = ['is', 'was', 'seems', 'feels', 'looks', 'appears', 'sounds'];
    const stateParticiples = [
      'broken', 'excited', 'interested', 'bored', 'tired', 'confused',
      'amazed', 'surprised', 'pleased', 'satisfied', 'worried', 'concerned'
    ];

    test('participles after linking verbs without by are adjectives', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...linkingVerbs),
          fc.constantFrom(...stateParticiples),
          (linkingVerb, participle) => {
            const sentence = `It ${linkingVerb} ${participle}`;
            // Find the position of the participle
            const words = sentence.split(' ');
            const position = words.indexOf(participle);
            
            const pos = analyzer.analyzePOS(participle, sentence, position);
            
            // The participle should be identified as adjective (state)
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('state descriptions with different subjects', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('The window', 'The door', 'She', 'He', 'They', 'The book'),
          fc.constantFrom(...linkingVerbs),
          fc.constantFrom(...stateParticiples),
          (subject, linkingVerb, participle) => {
            const sentence = `${subject} ${linkingVerb} ${participle}`;
            // Find the position of the participle
            const words = sentence.split(' ');
            const position = words.indexOf(participle);
            
            const pos = analyzer.analyzePOS(participle, sentence, position);
            
            // The participle should be identified as adjective
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('state descriptions with additional context', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...linkingVerbs),
          fc.constantFrom(...stateParticiples),
          fc.constantFrom('now', 'today', 'already', 'still', 'very much'),
          (linkingVerb, participle, context) => {
            const sentence = `It ${linkingVerb} ${participle} ${context}`;
            // Find the position of the participle
            const words = sentence.split(' ');
            const position = words.indexOf(participle);
            
            const pos = analyzer.analyzePOS(participle, sentence, position);
            
            // The participle should be identified as adjective
            // (not verb, because no "by" phrase)
            return pos === 'adjective';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Progressive Tense Recognition → Verb
   * Property 7: Gerund Recognition → Noun
   * 
   * **Validates: Requirements 3.2, 3.4**
   * 
   * -ing words should be identified as:
   * - Verb when in progressive tense (be + -ing + object/prep)
   * - Noun when used as gerund (subject/object position)
   * - Adjective when modifying nouns
   */
  describe('Property 6 & 7: Progressive Tense and Gerund Recognition', () => {
    const beVerbs = ['is', 'was', 'are', 'were', 'am'];
    const ingVerbs = [
      'writing', 'reading', 'running', 'swimming', 'studying',
      'working', 'playing', 'eating', 'drinking', 'sleeping'
    ];
    const objects = ['a book', 'the paper', 'fast', 'hard', 'well'];

    test('Property 6: -ing words in progressive tense are verbs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...beVerbs),
          fc.constantFrom(...ingVerbs),
          fc.constantFrom(...objects),
          (beVerb, ingWord, object) => {
            const sentence = `She ${beVerb} ${ingWord} ${object}`;
            // Find the position of the -ing word
            const words = sentence.split(' ');
            const position = words.indexOf(ingWord);
            
            const pos = analyzer.analyzePOS(ingWord, sentence, position);
            
            // The -ing word should be identified as verb (progressive)
            return pos === 'verb';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 7: -ing words at subject position are nouns (gerunds)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ingVerbs),
          fc.constantFrom('is fun', 'is important', 'is difficult', 'helps', 'matters'),
          (ingWord, predicate) => {
            const sentence = `${ingWord} ${predicate}`;
            // The -ing word is at position 0 (subject)
            const pos = analyzer.analyzePOS(ingWord, sentence, 0);
            
            // The -ing word should be identified as noun (gerund)
            return pos === 'noun';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 7: -ing words after certain verbs are nouns (gerunds)', () => {
      const gerundVerbs = ['enjoy', 'like', 'love', 'hate', 'start', 'finish', 'stop', 'avoid'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...gerundVerbs),
          fc.constantFrom(...ingVerbs),
          (verb, ingWord) => {
            const sentence = `I ${verb} ${ingWord}`;
            // Find the position of the -ing word
            const words = sentence.split(' ');
            const position = words.indexOf(ingWord);
            
            const pos = analyzer.analyzePOS(ingWord, sentence, position);
            
            // The -ing word should be identified as noun (gerund object)
            return pos === 'noun';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('-ing words in different contexts are correctly identified', () => {
      // Test a mix of contexts
      const testCases = [
        { sentence: 'Swimming is fun', word: 'Swimming', position: 0, expected: 'noun' as const },
        { sentence: 'She is swimming fast', word: 'swimming', position: 2, expected: 'verb' as const },
        { sentence: 'I enjoy reading books', word: 'reading', position: 2, expected: 'noun' as const },
        { sentence: 'The exciting news', word: 'exciting', position: 1, expected: 'adjective' as const },
      ];

      testCases.forEach(({ sentence, word, position, expected }) => {
        const pos = analyzer.analyzePOS(word, sentence, position);
        expect(pos).toBe(expected);
      });
    });
  });
});
