import glossaryData from '@/data/glossary.json';

export type GlossaryTerm = {
  name: string;
  category: string;
  short: string;
  detail: string;
  see_also?: string[];
  books?: string[];
  training_keywords?: string[];
};

export type GlossaryData = {
  version: number;
  updated: string;
  categories: Record<string, string>;
  terms: GlossaryTerm[];
};

export const GLOSSARY = glossaryData as GlossaryData;

/**
 * 文章中に含まれる用語(name の完全一致)をすべて返す。
 * 同じ用語は1度だけカウント。
 */
export function findMatchingTerms(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const term of GLOSSARY.terms) {
    if (text.includes(term.name)) {
      found.add(term.name);
    }
  }
  return Array.from(found);
}

export function termByName(name: string): GlossaryTerm | undefined {
  return GLOSSARY.terms.find((t) => t.name === name);
}

export function categoryLabel(key: string): string {
  return GLOSSARY.categories[key] ?? key;
}
