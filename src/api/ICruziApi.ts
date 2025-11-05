import { ClueCollection } from '../models/ClueCollection';
import { Clue } from '../models/Clue';
import { User } from '../models/User';
import { CollectionClueRow } from '../models/CollectionClueRow';

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthVerifyResponse {
  valid: boolean;
  user?: User;
  error?: string;
}

export interface ICruziApi {
  getCollectionList(): Promise<ClueCollection[]>;
  getCollectionBatch(collectionId: string): Promise<Clue[]>;
  getCollectionClues(
    collectionId: string,
    sortBy?: string,
    sortDirection?: string,
    progressFilter?: string,
    statusFilter?: string,
    page?: number
  ): Promise<CollectionClueRow[]>;
  submitUserResponse(clueId: string, isCorrect: boolean): Promise<void>;
  reopenCollection(collectionId: string): Promise<void>;
  addCluesToCollection(collectionId: string, clues: Clue[]): Promise<void>;
  removeClueFromCollection(collectionId: string, clueId: number): Promise<void>;
  authenticateWithGoogle(token: string): Promise<AuthResponse>;
  verifyAuth(): Promise<AuthVerifyResponse>;
};
