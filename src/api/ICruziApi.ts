import { Clue, ClueCollection, ClueWithProgress, CollectionClueTableRow, CrosswordCalendarDay, CrosswordResponse, User } from 'cruzi-models';

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
  getCrosswordList(date: string): Promise<ClueCollection[]>;
  getCrosswordCalendar(publicationId: string, month: number, year: number): Promise<CrosswordCalendarDay[]>;
  getCrossword(
    params: { id: string } | { publicationId: string; date: string }
  ): Promise<ClueCollection>;
  submitCrosswordResponse(response: CrosswordResponse): Promise<void>;

  getCollectionList(): Promise<ClueCollection[]>;
  getCollectionById(collectionId: string): Promise<ClueCollection | null>;
  getCollectionBatch(collectionId: string): Promise<ClueWithProgress[]>;
  getCollectionClues(
    collectionId: string,
    sortBy?: string,
    sortDirection?: string,
    progressFilter?: string,
    statusFilter?: string,
    page?: number
  ): Promise<CollectionClueTableRow[]>;
  submitUserResponse(clueId: string, collectionId: string, isCorrect: boolean): Promise<void>;
  reopenCollection(collectionId: string): Promise<void>;
  addCluesToCollection(collectionId: string, clues: Clue[]): Promise<void>;
  removeClueFromCollection(collectionId: string, clueId: string): Promise<void>;
  updateClueSense(clueId: string, senseId: string | null): Promise<void>;
  authenticateWithGoogle(token: string): Promise<AuthResponse>;
  verifyAuth(): Promise<AuthVerifyResponse>;
};
