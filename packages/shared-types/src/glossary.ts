/** A single site-wide glossary entry, scoped to a target language. */
export interface GlossaryTerm {
  id: string;
  source: string;
  target: string;
  targetLang: string;
}
