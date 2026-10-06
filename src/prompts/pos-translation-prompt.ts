/**
 * Enhanced Translation Prompt for AI-based POS Recognition
 * 
 * This prompt template is designed to extract part-of-speech information
 * from AI translation services, with special attention to participle disambiguation.
 */

/**
 * Enhanced translation prompt that includes POS recognition instructions
 * 
 * This prompt instructs the AI to:
 * 1. Translate the sentence to Chinese
 * 2. Identify the part of speech for each word
 * 3. Pay special attention to participles (past and present)
 * 4. Provide explanations for ambiguous cases
 */
export const ENHANCED_TRANSLATION_PROMPT = `You are a professional linguistic expert specializing in English grammar and part-of-speech tagging.

Translate the following sentence to Simplified Chinese and provide part-of-speech information for each word.

Pay special attention to:
1. Past participles (e.g., "broken", "written") - identify if they are used as adjectives or verbs
2. Words ending in -ed after "be" verbs - distinguish between passive voice (verb) and state description (adjective)
3. Words ending in -ing - distinguish between adjectives, verbs (progressive tense), and gerunds (nouns)

Sentence: {sentence}

Provide the response in the following JSON format:
{
  "translation": "翻译结果",
  "words": [
    {
      "word": "original word",
      "pos": "noun|verb|adjective|adverb",
      "explanation": "brief explanation if ambiguous"
    }
  ]
}

Examples to guide your analysis:

Example 1 - Adjective usage:
Sentence: "a broken window"
- "broken" is an adjective (describes the state of the window)
Pattern: determiner + participle + noun → participle is adjective

Example 2 - Passive voice:
Sentence: "was broken by someone"
- "broken" is a verb (passive voice with agent)
Pattern: be + participle + by + agent → participle is verb

Example 3 - State description:
Sentence: "The window is broken"
- "broken" is an adjective (describes current state, no agent)
Pattern: be + participle (no by phrase) → participle is adjective

Example 4 - Adjective with intensifier:
Sentence: "very excited"
- "excited" is an adjective (modified by degree adverb)
Pattern: intensifier + participle → participle is adjective

Example 5 - Progressive tense:
Sentence: "is exciting people"
- "exciting" is a verb (ongoing action with object)
Pattern: be + -ing + object → -ing is verb

Example 6 - Adjective usage:
Sentence: "an exciting opportunity"
- "exciting" is an adjective (describes the opportunity)
Pattern: determiner + -ing + noun → -ing is adjective

Example 7 - Gerund:
Sentence: "Swimming is fun"
- "Swimming" is a noun (gerund, subject of sentence)
Pattern: -ing at subject position → -ing is noun

Important rules:
- After determiners (a, an, the, this, etc.), participles before nouns are adjectives
- After intensifiers (very, extremely, quite, etc.), participles are adjectives
- After "be" + participle + "by", the participle is a verb (passive voice)
- After linking verbs (feel, seem, look, etc.) + participle, usually adjective
- "be" + -ing + object/prep phrase = verb (progressive)
- -ing at subject/object position = noun (gerund)

Return ONLY the JSON object, no additional text.`;

/**
 * Simplified prompt for POS-only analysis (no translation)
 * Used when translation is not needed, only POS information
 */
export const POS_ONLY_PROMPT = `You are a professional linguistic expert specializing in English grammar and part-of-speech tagging.

Analyze the part of speech for each word in the following sentence.

Pay special attention to:
1. Past participles (e.g., "broken", "written") - identify if they are used as adjectives or verbs
2. Words ending in -ed after "be" verbs - distinguish between passive voice (verb) and state description (adjective)
3. Words ending in -ing - distinguish between adjectives, verbs (progressive tense), and gerunds (nouns)

Sentence: {sentence}

Provide the response in the following JSON format:
{
  "words": [
    {
      "word": "original word",
      "pos": "noun|verb|adjective|adverb",
      "explanation": "brief explanation if ambiguous"
    }
  ]
}

Important rules:
- After determiners (a, an, the, this, etc.), participles before nouns are adjectives
- After intensifiers (very, extremely, quite, etc.), participles are adjectives
- After "be" + participle + "by", the participle is a verb (passive voice)
- After linking verbs (feel, seem, look, etc.) + participle, usually adjective
- "be" + -ing + object/prep phrase = verb (progressive)
- -ing at subject/object position = noun (gerund)

Return ONLY the JSON object, no additional text.`;

/**
 * System prompt for AI translation service
 * Sets the context for the AI assistant
 */
export const SYSTEM_PROMPT = `You are a professional linguistic expert specializing in English grammar and part-of-speech tagging.
Your task is to analyze English sentences and provide accurate part-of-speech information, with special attention to ambiguous cases like participles.
Always return responses in valid JSON format.`;
