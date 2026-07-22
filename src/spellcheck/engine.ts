import nspell from 'nspell';

export interface SpellEngine {
  correct(word: string): boolean;
  suggest(word: string): string[];
  add(word: string): void;
}

export interface DictionarySource {
  affixUrl: string;
  dictionaryUrl: string;
}

/** Default en_US Hunspell dictionary, served (with CORS) from jsDelivr. */
export const DEFAULT_DICTIONARY: DictionarySource = {
  affixUrl: 'https://cdn.jsdelivr.net/npm/dictionary-en/index.aff',
  dictionaryUrl: 'https://cdn.jsdelivr.net/npm/dictionary-en/index.dic',
};

/** Fetch the affix + dictionary files and build an nspell-backed engine. */
export async function loadSpellEngine(src: DictionarySource): Promise<SpellEngine> {
  const [aff, dic] = await Promise.all([
    fetch(src.affixUrl).then((r) => {
      if (!r.ok) throw new Error(`Failed to load affix file (${r.status})`);
      return r.text();
    }),
    fetch(src.dictionaryUrl).then((r) => {
      if (!r.ok) throw new Error(`Failed to load dictionary file (${r.status})`);
      return r.text();
    }),
  ]);
  const spell = nspell(aff, dic);
  return {
    correct: (w) => spell.correct(w),
    suggest: (w) => spell.suggest(w).slice(0, 8),
    add: (w) => {
      spell.add(w);
    },
  };
}
