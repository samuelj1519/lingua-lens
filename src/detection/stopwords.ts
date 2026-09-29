export const STOPWORDS: Record<string, Set<string>> = {
  en: new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was', 'have']),
  fr: new Set(['le', 'la', 'les', 'des', 'une', 'pour', 'avec', 'dans', 'est', 'pas']),
  de: new Set(['der', 'die', 'das', 'und', 'ist', 'nicht', 'mit', 'für', 'auf', 'sie']),
  es: new Set(['el', 'la', 'los', 'las', 'de', 'que', 'con', 'para', 'por', 'una']),
};
