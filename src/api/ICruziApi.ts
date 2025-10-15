import { ClueCollection } from '../models/ClueCollection';
import { Clue } from '../models/Clue';

export interface ICruziApi {
  getCollectionList(): Promise<ClueCollection[]>;
  getCollectionBatch(collectionId: string): Promise<Clue[]>;
  submitUserResponse(clueId: string, isCorrect: boolean): Promise<void>;
  reopenCollection(collectionId: string): Promise<void>;
  addCluesToCollection(collectionId: string, clues: Clue[]): Promise<void>;
  removeClueFromCollection(collectionId: string, clueId: number): Promise<void>;
};
