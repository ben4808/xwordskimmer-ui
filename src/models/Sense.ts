import { Entry } from "./Entry";
import { EntryTranslation } from "./EntryTranslation";

export interface Sense {
  id: string;
  entry: Entry;
  lang: string;
  summary: string;
  definition?: string;
  exampleSentences?: string[];
  familiarityScore?: number;
  qualityScore?: number;
  translations: EntryTranslation;
}
