export interface EntryInfo {
  entry: string;
  definition: string;
  partOfSpeech?: string;
  source?: string;
  metadata?: Map<string, string>;
  translations?: Map<string, string>;
  relatedEntries?: Map<string, EntryInfo>; // <entry, EntryInfo>
  exampleSentences?: string[];
  synonyms?: string[];
  antonyms?: string[];
}
