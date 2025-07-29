import { Definition } from "./Definition";
import { Entry } from "./Entry";
import { TranslateResult } from "./TranslateResult";

export interface EntryInfo {
  entry: Entry;
  definitions: Definition[];
  crosswordClues?: string[];
  translateResult?: TranslateResult;
}
