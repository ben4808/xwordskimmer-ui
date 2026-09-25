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

export interface ClassifySenseOption {
  senseId: string;
  summary: string;
  displayText: string;
  entryType: string;
  unityBucket: string;
  familiarityBucket: string;
  qualityBucket: string;
  domain: string;
  regionality: string;
  isVulgar: boolean;
  isSensitive: boolean;
}

export interface ClassifyEntry {
  fillWord: string;
  entry: string | null;
  lang: string | null;
  displayText: string | null;
  entryType: string | null;
  unityBucket: string | null;
  familiarityBucket: string | null;
  qualityBucket: string | null;
  domain?: string | null;
  regionality?: string | null;
  isVulgar: boolean | null;
  isCrosswordese?: boolean;
  isBreakfast?: boolean;
  isSensitive?: boolean;
  baseForm?: string | null;
  nytValue?: string | null;
  senses?: ClassifySenseOption[];
}

export interface ClassifyRowPayload {
  rowId: string;
  kind: 'entry' | 'sense';
  isNew?: boolean;
  parentRowId?: string;
  fillWord: string;
  entry: string | null;
  lang: string | null;
  baseForm: string;
  displayText: string;
  entryType: string;
  unityBucket: string;
  familiarityBucket: string;
  qualityBucket: string;
  domain: string;
  regionality: string;
  isVulgar: boolean;
  isCrosswordese: boolean;
  isBreakfast: boolean;
  isSensitive: boolean;
  nytValue: string;
  senseId?: string | null;
  clueIds?: string[];
  senses?: ClassifySenseOption[];
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
  getClassifyEntries(fillWords: string[]): Promise<ClassifyEntry[]>;
  saveClassifyEntries(originals: ClassifyRowPayload[], rows: ClassifyRowPayload[]): Promise<void>;
  deleteClassifyEntry(entry: string, lang: string): Promise<void>;
  authenticateWithGoogle(token: string): Promise<AuthResponse>;
  verifyAuth(): Promise<AuthVerifyResponse>;
};
