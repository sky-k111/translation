/**
 * Irregular Verbs Mapping Table
 * Maps past participles to their base verb forms
 * Includes 200+ common English irregular verbs
 */

export interface IrregularVerb {
  base: string;
  pastSimple: string;
  pastParticiple: string;
}

/**
 * Comprehensive mapping of irregular verb forms
 * Key: past participle form
 * Value: IrregularVerb object with all forms
 */
export const IRREGULAR_VERBS: Map<string, IrregularVerb> = new Map([
  // A
  ['arisen', { base: 'arise', pastSimple: 'arose', pastParticiple: 'arisen' }],
  ['awoken', { base: 'awake', pastSimple: 'awoke', pastParticiple: 'awoken' }],
  
  // B
  ['been', { base: 'be', pastSimple: 'was/were', pastParticiple: 'been' }],
  ['borne', { base: 'bear', pastSimple: 'bore', pastParticiple: 'borne' }],
  ['born', { base: 'bear', pastSimple: 'bore', pastParticiple: 'born' }],
  ['beaten', { base: 'beat', pastSimple: 'beat', pastParticiple: 'beaten' }],
  ['become', { base: 'become', pastSimple: 'became', pastParticiple: 'become' }],
  ['begun', { base: 'begin', pastSimple: 'began', pastParticiple: 'begun' }],
  ['bent', { base: 'bend', pastSimple: 'bent', pastParticiple: 'bent' }],
  ['bet', { base: 'bet', pastSimple: 'bet', pastParticiple: 'bet' }],
  ['bid', { base: 'bid', pastSimple: 'bid', pastParticiple: 'bid' }],
  ['bitten', { base: 'bite', pastSimple: 'bit', pastParticiple: 'bitten' }],
  ['bled', { base: 'bleed', pastSimple: 'bled', pastParticiple: 'bled' }],
  ['blown', { base: 'blow', pastSimple: 'blew', pastParticiple: 'blown' }],
  ['broken', { base: 'break', pastSimple: 'broke', pastParticiple: 'broken' }],
  ['bred', { base: 'breed', pastSimple: 'bred', pastParticiple: 'bred' }],
  ['brought', { base: 'bring', pastSimple: 'brought', pastParticiple: 'brought' }],
  ['broadcast', { base: 'broadcast', pastSimple: 'broadcast', pastParticiple: 'broadcast' }],
  ['built', { base: 'build', pastSimple: 'built', pastParticiple: 'built' }],
  ['burnt', { base: 'burn', pastSimple: 'burnt', pastParticiple: 'burnt' }],
  ['burned', { base: 'burn', pastSimple: 'burned', pastParticiple: 'burned' }],
  ['burst', { base: 'burst', pastSimple: 'burst', pastParticiple: 'burst' }],
  ['bought', { base: 'buy', pastSimple: 'bought', pastParticiple: 'bought' }],
  
  // C
  ['cast', { base: 'cast', pastSimple: 'cast', pastParticiple: 'cast' }],
  ['caught', { base: 'catch', pastSimple: 'caught', pastParticiple: 'caught' }],
  ['chosen', { base: 'choose', pastSimple: 'chose', pastParticiple: 'chosen' }],
  ['clung', { base: 'cling', pastSimple: 'clung', pastParticiple: 'clung' }],
  ['come', { base: 'come', pastSimple: 'came', pastParticiple: 'come' }],
  ['cost', { base: 'cost', pastSimple: 'cost', pastParticiple: 'cost' }],
  ['crept', { base: 'creep', pastSimple: 'crept', pastParticiple: 'crept' }],
  ['cut', { base: 'cut', pastSimple: 'cut', pastParticiple: 'cut' }],
  
  // D
  ['dealt', { base: 'deal', pastSimple: 'dealt', pastParticiple: 'dealt' }],
  ['dug', { base: 'dig', pastSimple: 'dug', pastParticiple: 'dug' }],
  ['done', { base: 'do', pastSimple: 'did', pastParticiple: 'done' }],
  ['drawn', { base: 'draw', pastSimple: 'drew', pastParticiple: 'drawn' }],
  ['dreamt', { base: 'dream', pastSimple: 'dreamt', pastParticiple: 'dreamt' }],
  ['dreamed', { base: 'dream', pastSimple: 'dreamed', pastParticiple: 'dreamed' }],
  ['driven', { base: 'drive', pastSimple: 'drove', pastParticiple: 'driven' }],
  ['drunk', { base: 'drink', pastSimple: 'drank', pastParticiple: 'drunk' }],
  ['dwelt', { base: 'dwell', pastSimple: 'dwelt', pastParticiple: 'dwelt' }],
  
  // E
  ['eaten', { base: 'eat', pastSimple: 'ate', pastParticiple: 'eaten' }],
  
  // F
  ['fallen', { base: 'fall', pastSimple: 'fell', pastParticiple: 'fallen' }],
  ['fed', { base: 'feed', pastSimple: 'fed', pastParticiple: 'fed' }],
  ['felt', { base: 'feel', pastSimple: 'felt', pastParticiple: 'felt' }],
  ['fought', { base: 'fight', pastSimple: 'fought', pastParticiple: 'fought' }],
  ['found', { base: 'find', pastSimple: 'found', pastParticiple: 'found' }],
  ['fled', { base: 'flee', pastSimple: 'fled', pastParticiple: 'fled' }],
  ['flung', { base: 'fling', pastSimple: 'flung', pastParticiple: 'flung' }],
  ['flown', { base: 'fly', pastSimple: 'flew', pastParticiple: 'flown' }],
  ['forbidden', { base: 'forbid', pastSimple: 'forbade', pastParticiple: 'forbidden' }],
  ['forecast', { base: 'forecast', pastSimple: 'forecast', pastParticiple: 'forecast' }],
  ['foreseen', { base: 'foresee', pastSimple: 'foresaw', pastParticiple: 'foreseen' }],
  ['foretold', { base: 'foretell', pastSimple: 'foretold', pastParticiple: 'foretold' }],
  ['forgotten', { base: 'forget', pastSimple: 'forgot', pastParticiple: 'forgotten' }],
  ['forgiven', { base: 'forgive', pastSimple: 'forgave', pastParticiple: 'forgiven' }],
  ['forsaken', { base: 'forsake', pastSimple: 'forsook', pastParticiple: 'forsaken' }],
  ['frozen', { base: 'freeze', pastSimple: 'froze', pastParticiple: 'frozen' }],
  
  // G
  ['gotten', { base: 'get', pastSimple: 'got', pastParticiple: 'gotten' }],
  ['got', { base: 'get', pastSimple: 'got', pastParticiple: 'got' }],
  ['given', { base: 'give', pastSimple: 'gave', pastParticiple: 'given' }],
  ['gone', { base: 'go', pastSimple: 'went', pastParticiple: 'gone' }],
  ['ground', { base: 'grind', pastSimple: 'ground', pastParticiple: 'ground' }],
  ['grown', { base: 'grow', pastSimple: 'grew', pastParticiple: 'grown' }],
  
  // H
  ['had', { base: 'have', pastSimple: 'had', pastParticiple: 'had' }],
  ['heard', { base: 'hear', pastSimple: 'heard', pastParticiple: 'heard' }],
  ['hidden', { base: 'hide', pastSimple: 'hid', pastParticiple: 'hidden' }],
  ['hit', { base: 'hit', pastSimple: 'hit', pastParticiple: 'hit' }],
  ['held', { base: 'hold', pastSimple: 'held', pastParticiple: 'held' }],
  ['hurt', { base: 'hurt', pastSimple: 'hurt', pastParticiple: 'hurt' }],
  ['hung', { base: 'hang', pastSimple: 'hung', pastParticiple: 'hung' }],
  
  // K
  ['kept', { base: 'keep', pastSimple: 'kept', pastParticiple: 'kept' }],
  ['knelt', { base: 'kneel', pastSimple: 'knelt', pastParticiple: 'knelt' }],
  ['knit', { base: 'knit', pastSimple: 'knit', pastParticiple: 'knit' }],
  ['known', { base: 'know', pastSimple: 'knew', pastParticiple: 'known' }],
  
  // L
  ['laid', { base: 'lay', pastSimple: 'laid', pastParticiple: 'laid' }],
  ['led', { base: 'lead', pastSimple: 'led', pastParticiple: 'led' }],
  ['leant', { base: 'lean', pastSimple: 'leant', pastParticiple: 'leant' }],
  ['leaned', { base: 'lean', pastSimple: 'leaned', pastParticiple: 'leaned' }],
  ['leapt', { base: 'leap', pastSimple: 'leapt', pastParticiple: 'leapt' }],
  ['leaped', { base: 'leap', pastSimple: 'leaped', pastParticiple: 'leaped' }],
  ['learnt', { base: 'learn', pastSimple: 'learnt', pastParticiple: 'learnt' }],
  ['learned', { base: 'learn', pastSimple: 'learned', pastParticiple: 'learned' }],
  ['left', { base: 'leave', pastSimple: 'left', pastParticiple: 'left' }],
  ['lent', { base: 'lend', pastSimple: 'lent', pastParticiple: 'lent' }],
  ['let', { base: 'let', pastSimple: 'let', pastParticiple: 'let' }],
  ['lain', { base: 'lie', pastSimple: 'lay', pastParticiple: 'lain' }],
  ['lit', { base: 'light', pastSimple: 'lit', pastParticiple: 'lit' }],
  ['lighted', { base: 'light', pastSimple: 'lighted', pastParticiple: 'lighted' }],
  ['lost', { base: 'lose', pastSimple: 'lost', pastParticiple: 'lost' }],
  
  // M
  ['made', { base: 'make', pastSimple: 'made', pastParticiple: 'made' }],
  ['meant', { base: 'mean', pastSimple: 'meant', pastParticiple: 'meant' }],
  ['met', { base: 'meet', pastSimple: 'met', pastParticiple: 'met' }],
  ['misled', { base: 'mislead', pastSimple: 'misled', pastParticiple: 'misled' }],
  ['mistaken', { base: 'mistake', pastSimple: 'mistook', pastParticiple: 'mistaken' }],
  ['misunderstood', { base: 'misunderstand', pastSimple: 'misunderstood', pastParticiple: 'misunderstood' }],
  ['mown', { base: 'mow', pastSimple: 'mowed', pastParticiple: 'mown' }],
  
  // O
  ['overcome', { base: 'overcome', pastSimple: 'overcame', pastParticiple: 'overcome' }],
  ['overdone', { base: 'overdo', pastSimple: 'overdid', pastParticiple: 'overdone' }],
  ['overtaken', { base: 'overtake', pastSimple: 'overtook', pastParticiple: 'overtaken' }],
  ['overthrown', { base: 'overthrow', pastSimple: 'overthrew', pastParticiple: 'overthrown' }],
  
  // P
  ['paid', { base: 'pay', pastSimple: 'paid', pastParticiple: 'paid' }],
  ['proven', { base: 'prove', pastSimple: 'proved', pastParticiple: 'proven' }],
  ['proved', { base: 'prove', pastSimple: 'proved', pastParticiple: 'proved' }],
  ['put', { base: 'put', pastSimple: 'put', pastParticiple: 'put' }],
  
  // Q
  ['quit', { base: 'quit', pastSimple: 'quit', pastParticiple: 'quit' }],
  
  // R
  ['read', { base: 'read', pastSimple: 'read', pastParticiple: 'read' }],
  ['rid', { base: 'rid', pastSimple: 'rid', pastParticiple: 'rid' }],
  ['ridden', { base: 'ride', pastSimple: 'rode', pastParticiple: 'ridden' }],
  ['rung', { base: 'ring', pastSimple: 'rang', pastParticiple: 'rung' }],
  ['risen', { base: 'rise', pastSimple: 'rose', pastParticiple: 'risen' }],
  ['run', { base: 'run', pastSimple: 'ran', pastParticiple: 'run' }],
  
  // S
  ['said', { base: 'say', pastSimple: 'said', pastParticiple: 'said' }],
  ['seen', { base: 'see', pastSimple: 'saw', pastParticiple: 'seen' }],
  ['sought', { base: 'seek', pastSimple: 'sought', pastParticiple: 'sought' }],
  ['sold', { base: 'sell', pastSimple: 'sold', pastParticiple: 'sold' }],
  ['sent', { base: 'send', pastSimple: 'sent', pastParticiple: 'sent' }],
  ['set', { base: 'set', pastSimple: 'set', pastParticiple: 'set' }],
  ['sewn', { base: 'sew', pastSimple: 'sewed', pastParticiple: 'sewn' }],
  ['shaken', { base: 'shake', pastSimple: 'shook', pastParticiple: 'shaken' }],
  ['shed', { base: 'shed', pastSimple: 'shed', pastParticiple: 'shed' }],
  ['shone', { base: 'shine', pastSimple: 'shone', pastParticiple: 'shone' }],
  ['shined', { base: 'shine', pastSimple: 'shined', pastParticiple: 'shined' }],
  ['shot', { base: 'shoot', pastSimple: 'shot', pastParticiple: 'shot' }],
  ['shown', { base: 'show', pastSimple: 'showed', pastParticiple: 'shown' }],
  ['shrunk', { base: 'shrink', pastSimple: 'shrank', pastParticiple: 'shrunk' }],
  ['shut', { base: 'shut', pastSimple: 'shut', pastParticiple: 'shut' }],
  ['sung', { base: 'sing', pastSimple: 'sang', pastParticiple: 'sung' }],
  ['sunk', { base: 'sink', pastSimple: 'sank', pastParticiple: 'sunk' }],
  ['sat', { base: 'sit', pastSimple: 'sat', pastParticiple: 'sat' }],
  ['slain', { base: 'slay', pastSimple: 'slew', pastParticiple: 'slain' }],
  ['slept', { base: 'sleep', pastSimple: 'slept', pastParticiple: 'slept' }],
  ['slid', { base: 'slide', pastSimple: 'slid', pastParticiple: 'slid' }],
  ['slung', { base: 'sling', pastSimple: 'slung', pastParticiple: 'slung' }],
  ['slit', { base: 'slit', pastSimple: 'slit', pastParticiple: 'slit' }],
  ['smelt', { base: 'smell', pastSimple: 'smelt', pastParticiple: 'smelt' }],
  ['smelled', { base: 'smell', pastSimple: 'smelled', pastParticiple: 'smelled' }],
  ['sown', { base: 'sow', pastSimple: 'sowed', pastParticiple: 'sown' }],
  ['spoken', { base: 'speak', pastSimple: 'spoke', pastParticiple: 'spoken' }],
  ['sped', { base: 'speed', pastSimple: 'sped', pastParticiple: 'sped' }],
  ['speeded', { base: 'speed', pastSimple: 'speeded', pastParticiple: 'speeded' }],
  ['spelt', { base: 'spell', pastSimple: 'spelt', pastParticiple: 'spelt' }],
  ['spelled', { base: 'spell', pastSimple: 'spelled', pastParticiple: 'spelled' }],
  ['spent', { base: 'spend', pastSimple: 'spent', pastParticiple: 'spent' }],
  ['spilt', { base: 'spill', pastSimple: 'spilt', pastParticiple: 'spilt' }],
  ['spilled', { base: 'spill', pastSimple: 'spilled', pastParticiple: 'spilled' }],
  ['spun', { base: 'spin', pastSimple: 'spun', pastParticiple: 'spun' }],
  ['spit', { base: 'spit', pastSimple: 'spit', pastParticiple: 'spit' }],
  ['spat', { base: 'spit', pastSimple: 'spat', pastParticiple: 'spat' }],
  ['split', { base: 'split', pastSimple: 'split', pastParticiple: 'split' }],
  ['spoilt', { base: 'spoil', pastSimple: 'spoilt', pastParticiple: 'spoilt' }],
  ['spoiled', { base: 'spoil', pastSimple: 'spoiled', pastParticiple: 'spoiled' }],
  ['spread', { base: 'spread', pastSimple: 'spread', pastParticiple: 'spread' }],
  ['sprung', { base: 'spring', pastSimple: 'sprang', pastParticiple: 'sprung' }],
  ['stood', { base: 'stand', pastSimple: 'stood', pastParticiple: 'stood' }],
  ['stolen', { base: 'steal', pastSimple: 'stole', pastParticiple: 'stolen' }],
  ['stuck', { base: 'stick', pastSimple: 'stuck', pastParticiple: 'stuck' }],
  ['stung', { base: 'sting', pastSimple: 'stung', pastParticiple: 'stung' }],
  ['stunk', { base: 'stink', pastSimple: 'stank', pastParticiple: 'stunk' }],
  ['stridden', { base: 'stride', pastSimple: 'strode', pastParticiple: 'stridden' }],
  ['struck', { base: 'strike', pastSimple: 'struck', pastParticiple: 'struck' }],
  ['striven', { base: 'strive', pastSimple: 'strove', pastParticiple: 'striven' }],
  ['strung', { base: 'string', pastSimple: 'strung', pastParticiple: 'strung' }],
  ['sworn', { base: 'swear', pastSimple: 'swore', pastParticiple: 'sworn' }],
  ['swept', { base: 'sweep', pastSimple: 'swept', pastParticiple: 'swept' }],
  ['swollen', { base: 'swell', pastSimple: 'swelled', pastParticiple: 'swollen' }],
  ['swum', { base: 'swim', pastSimple: 'swam', pastParticiple: 'swum' }],
  ['swung', { base: 'swing', pastSimple: 'swung', pastParticiple: 'swung' }],
  
  // T
  ['taken', { base: 'take', pastSimple: 'took', pastParticiple: 'taken' }],
  ['taught', { base: 'teach', pastSimple: 'taught', pastParticiple: 'taught' }],
  ['torn', { base: 'tear', pastSimple: 'tore', pastParticiple: 'torn' }],
  ['told', { base: 'tell', pastSimple: 'told', pastParticiple: 'told' }],
  ['thought', { base: 'think', pastSimple: 'thought', pastParticiple: 'thought' }],
  ['thrown', { base: 'throw', pastSimple: 'threw', pastParticiple: 'thrown' }],
  ['thrust', { base: 'thrust', pastSimple: 'thrust', pastParticiple: 'thrust' }],
  ['trodden', { base: 'tread', pastSimple: 'trod', pastParticiple: 'trodden' }],
  
  // U
  ['understood', { base: 'understand', pastSimple: 'understood', pastParticiple: 'understood' }],
  ['undertaken', { base: 'undertake', pastSimple: 'undertook', pastParticiple: 'undertaken' }],
  ['undone', { base: 'undo', pastSimple: 'undid', pastParticiple: 'undone' }],
  ['upset', { base: 'upset', pastSimple: 'upset', pastParticiple: 'upset' }],
  
  // W
  ['woken', { base: 'wake', pastSimple: 'woke', pastParticiple: 'woken' }],
  ['worn', { base: 'wear', pastSimple: 'wore', pastParticiple: 'worn' }],
  ['woven', { base: 'weave', pastSimple: 'wove', pastParticiple: 'woven' }],
  ['wed', { base: 'wed', pastSimple: 'wed', pastParticiple: 'wed' }],
  ['wept', { base: 'weep', pastSimple: 'wept', pastParticiple: 'wept' }],
  ['wet', { base: 'wet', pastSimple: 'wet', pastParticiple: 'wet' }],
  ['won', { base: 'win', pastSimple: 'won', pastParticiple: 'won' }],
  ['withdrawn', { base: 'withdraw', pastSimple: 'withdrew', pastParticiple: 'withdrawn' }],
  ['withheld', { base: 'withhold', pastSimple: 'withheld', pastParticiple: 'withheld' }],
  ['withstood', { base: 'withstand', pastSimple: 'withstood', pastParticiple: 'withstood' }],
  ['wrung', { base: 'wring', pastSimple: 'wrung', pastParticiple: 'wrung' }],
  ['written', { base: 'write', pastSimple: 'wrote', pastParticiple: 'written' }],
]);

/**
 * Helper function to get the base form of an irregular verb
 * @param participle - The past participle form
 * @returns The base form or null if not found
 */
export function getBaseForm(participle: string): string | null {
  const verb = IRREGULAR_VERBS.get(participle.toLowerCase());
  return verb ? verb.base : null;
}

/**
 * Check if a word is an irregular past participle
 * @param word - The word to check
 * @returns True if the word is an irregular past participle
 */
export function isIrregularParticiple(word: string): boolean {
  return IRREGULAR_VERBS.has(word.toLowerCase());
}
