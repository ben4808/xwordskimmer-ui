import { Clue, ClueCollection, ClueWithProgress, CollectionClueTableRow, CrosswordCalendarDay, CrosswordResponse, User, UserSettings } from 'cruzi-models';

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthVerifyResponse {
  valid: boolean;
  user?: User;
  error?: string;
}

export interface ClassifyRequestItem {
  fillWord: string;
  senseId?: string | null;
}

export interface ClassifyEntry {
  fillWord: string;
  entry: string | null;
  lang: string | null;
  displayText: string | null;
  classification: string | null;
  unityBucket: string | null;
  familiarityBucket: string | null;
  qualityBucket: string | null;
  isVulgar: boolean | null;
  isCrosswordese?: boolean;
  isBreakfast?: boolean;
  isSensitive?: boolean;
  nytValue?: string | null;
  senseId?: string | null;
  senseSummary?: string | null;
}

export interface ClassifyRowPayload {
  rowId: string;
  fillWord: string;
  entry: string | null;
  lang: string | null;
  displayText: string;
  classification: string;
  unityBucket: string;
  familiarityBucket: string;
  qualityBucket: string;
  isVulgar: boolean;
  isCrosswordese: boolean;
  isBreakfast: boolean;
  isSensitive: boolean;
  nytValue: string;
  senseId?: string | null;
  senseSummary?: string;
}

export interface ICruziApi {
  getCrosswordList(date: string): Promise<ClueCollection[]>;
  getCrosswordCalendar(publicationId: string, month: number, year: number): Promise<CrosswordCalendarDay[]>;
  getCrossword(
    params: { id: string } | { publicationId: string; date: string }
  ): Promise<ClueCollection>;
  submitCrosswordResponse(response: CrosswordResponse): Promise<void>;
  completeCrossword(collectionId: string): Promise<void>;
  getUserSettings(): Promise<UserSettings>;
  updateUserSettings(settings: UserSettings): Promise<UserSettings>;

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
  getClassifyEntries(items: ClassifyRequestItem[]): Promise<ClassifyEntry[]>;
  saveClassifyEntries(originals: ClassifyRowPayload[], rows: ClassifyRowPayload[]): Promise<void>;
  authenticateWithGoogle(token: string): Promise<AuthResponse>;
  verifyAuth(): Promise<AuthVerifyResponse>;
};
