// Test loading word-index-manager

global.Trie = class Trie {
  constructor() {
    this.root = { children: {}, isEndOfWord: false, wordData: null };
  }
  insert(word, data) {}
  search(word) { return null; }
  startsWith(prefix) { return []; }
  delete(word) { return false; }
};

global.MinHeap = class MinHeap {};

console.log('Globals set');
console.log('typeof Trie:', typeof global.Trie);
console.log('typeof self:', typeof self);
console.log('typeof global:', typeof global);

try {
  console.log('\nAttempting to require word-index-manager...');
  const mod = require('../../extension/utils/word-index-manager.js');
  console.log('Success!');
  console.log('Module:', mod);
  console.log('Keys:', Object.keys(mod));
  console.log('WordIndexManager:', mod.WordIndexManager);
  
  if (mod.WordIndexManager) {
    console.log('\nTrying to instantiate...');
    const manager = new mod.WordIndexManager({ storageKey: 'test' });
    console.log('Instance created:', manager);
  }
} catch (error) {
  console.error('\nError:', error.message);
  console.error(error.stack);
}
