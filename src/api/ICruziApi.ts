import { ClueCollection } from '../models/ClueCollection';
import { Clue } from '../models/Clue';
import { EntryInfo } from '../models/EntryInfo';
import { Entry } from '../models/Entry';
import { EntryFilter } from '../models/EntryFilter';

export interface ICruziApi {
  getCrosswordList(date: Date): Promise<ClueCollection[]>;
  getCollectionList(): Promise<ClueCollection[]>;
  getCrossword(source: string, date: Date): Promise<ClueCollection>;
  getCollection(collectionId: string): Promise<ClueCollection>;
  getClue(clueId: number): Promise<Clue>;
  getEntry(entry: string): Promise<EntryInfo>;
  generateEntryInfo(entry: string): Promise<EntryInfo>;
  queryEntries(query: string, filters: EntryFilter[]): Promise<Entry[]>;
  createClue(clue: string, entry: string): Promise<string>;
};
