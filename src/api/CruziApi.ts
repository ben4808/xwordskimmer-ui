import { Clue, ClueCollection, ClueWithProgress, CollectionClueTableRow, CrosswordCalendarDay, CrosswordResponse, Entry } from "cruzi-models";
import { ICruziApi, AuthResponse, AuthVerifyResponse } from "./ICruziApi";
const apiOrigin = (import.meta.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const baseUrl = `${apiOrigin}/api`;

class CruziApi implements ICruziApi {
  async getCrosswordList(date: string): Promise<ClueCollection[]> {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams({ date });
      const response = await fetch(`${baseUrl}/getCrosswordList?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching crossword list:', error);
      throw error;
    }
  }

  async getCrosswordCalendar(publicationId: string, month: number, year: number): Promise<CrosswordCalendarDay[]> {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const monthYear = `${String(month).padStart(2, '0')}-${year}`;
      const params = new URLSearchParams({
        publicationId,
        monthYear,
      });
      const response = await fetch(`${baseUrl}/getCrosswordCalendar?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching crossword calendar:', error);
      throw error;
    }
  }

  async getCrossword(
    lookup: { id: string } | { publicationId: string; date: string }
  ): Promise<ClueCollection> {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();
      if ('id' in lookup) {
        params.set('id', lookup.id);
      } else {
        params.set('publicationId', lookup.publicationId);
        params.set('date', lookup.date);
      }
      const response = await fetch(`${baseUrl}/getCrossword?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching crossword:', error);
      throw error;
    }
  }

  async submitCrosswordResponse(crosswordResponse: CrosswordResponse): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/submitCrosswordResponse`, {
        method: 'POST',
        headers,
        body: JSON.stringify(crosswordResponse),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error submitting crossword response:', error);
      throw error;
    }
  }

  async completeCrossword(collectionId: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/completeCrossword`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ collectionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error completing crossword:', error);
      throw error;
    }
  }

  async getCollectionList(): Promise<ClueCollection[]> {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/getCollectionList`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching collection list:', error);
      throw error;
    }
  }

  async getCollectionById(collectionId: string): Promise<ClueCollection | null> {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/getCollectionById/${encodeURIComponent(collectionId)}`, {
        method: 'GET',
        headers,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching collection:', error);
      throw error;
    }
  }

  async getCollectionBatch(collectionId: string): Promise<ClueWithProgress[]> {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/getCollectionBatch?collection_id=${encodeURIComponent(collectionId)}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      
      // Transform raw API response to Clue objects
      return rawData.map((raw: any) => {
        const tagsFromRaw = (tags: any): Map<string, string> | undefined => {
          if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
            return undefined;
          }
          return new Map(
            Object.entries(tags).map(([k, v]) => [k, v == null ? '' : String(v)])
          );
        };

        const toOptionalString = (value: any): string | undefined => {
          if (value == null) return undefined;
          if (typeof value === 'string') return value;
          if (typeof value === 'object' && !Array.isArray(value)) {
            const keys = Object.keys(value);
            const preferred =
              value.en ??
              (keys.length > 0 ? (value as Record<string, unknown>)[keys[0]] : undefined);
            return typeof preferred === 'string' ? preferred : undefined;
          }
          return undefined;
        };

        const buildEntry = (rawEntry: any): Entry => ({
          entry: rawEntry.entry ?? '',
          lang: rawEntry.lang ?? 'en',
          rootEntry: rawEntry.rootEntry,
          displayText: rawEntry.displayText,
          entryType: rawEntry.entryType,
          familiarityScore: rawEntry.familiarityScore,
          qualityScore: rawEntry.qualityScore,
          loadingStatus: rawEntry.loadingStatus,
        });

        const transformExampleSentences = (exampleSentences: any[], senseId?: string): any[] => {
          if (!exampleSentences || !Array.isArray(exampleSentences)) {
            return [];
          }

          return exampleSentences.map((ex: any) => {
            const translations: Record<string, string> = {};
            Object.keys(ex).forEach((key) => {
              if (
                key === '_id' ||
                key === 'id' ||
                key === 'source_ai' ||
                key === 'sourceAi' ||
                key === 'senseId' ||
                key === 'translations' ||
                ex[key] === null ||
                ex[key] === undefined
              ) {
                return;
              }
              translations[key] = String(ex[key]);
            });

            if (ex.translations && typeof ex.translations === 'object' && !Array.isArray(ex.translations)) {
              Object.entries(ex.translations).forEach(([lang, text]) => {
                if (text != null) {
                  translations[lang] = String(text);
                }
              });
            }

            return {
              id: ex._id ?? ex.id,
              senseId: senseId || '',
              translations: Object.keys(translations).length > 0 ? translations : undefined,
              sourceAi: ex.source_ai ?? ex.sourceAi,
            };
          });
        };

        const entry: Entry = raw.entry ? buildEntry(raw.entry) : { entry: '', lang: raw.lang || 'en' };

        const clue: ClueWithProgress = {
          id: raw.id,
          lang: raw.lang || entry.lang,
          entry,
          customClue: raw.customClue,
          customDisplayText: raw.customDisplayText,
        };

        if (raw.sense) {
          clue.sense = {
            id: raw.sense.id,
            entry: raw.sense.entry ?? '',
            partOfSpeech: raw.sense.partOfSpeech,
            frequency: raw.sense.frequency,
            summary: toOptionalString(raw.sense.summary),
            definition: toOptionalString(raw.sense.definition),
            exampleSentences: transformExampleSentences(raw.sense.exampleSentences || [], raw.sense.id),
            familiarityScore: raw.sense.familiarityScore,
            qualityScore: raw.sense.qualityScore,
            sourceAi: raw.sense.sourceAi,
            similarEntries: Array.isArray(raw.sense.similarEntries)
              ? raw.sense.similarEntries.map((e: any) => buildEntry(e))
              : undefined,
          };
        }

        if (raw.progressData) {
          clue.progressData = {
            correctSolvesNeeded: raw.progressData.correctSolvesNeeded,
            correctSolves: raw.progressData.correctSolves || 0,
            incorrectSolves: raw.progressData.incorrectSolves || 0,
            lastSolveDate: raw.progressData.lastSolve
              ? typeof raw.progressData.lastSolve === 'string'
                ? new Date(raw.progressData.lastSolve)
                : raw.progressData.lastSolve
              : undefined,
          };
        }

        return clue;
      });
    } catch (error) {
      console.error('Error fetching collection batch:', error);
      throw error;
    }
  }

  async getCollectionClues(
    collectionId: string,
    sortBy?: string,
    sortDirection?: string,
    progressFilter?: string,
    statusFilter?: string,
    page?: number
  ): Promise<CollectionClueTableRow[]> {
    try {
      const params = new URLSearchParams();
      params.append('collection_id', collectionId);
      if (sortBy) params.append('sort_by', sortBy);
      if (sortDirection) params.append('sort_direction', sortDirection);
      if (progressFilter && progressFilter !== 'All') params.append('progress_filter', progressFilter);
      if (statusFilter && statusFilter !== 'All') params.append('status_filter', statusFilter);
      if (page) params.append('page', page.toString());

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/getCollectionClues?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching collection clues:', error);
      throw error;
    }
  }

  async submitUserResponse(clueId: string, collectionId: string, isCorrect: boolean): Promise<void> {
    try {
      const userResponse: any = {
        clueId: clueId.toString(),
        collectionId: collectionId.toString(),
        isCorrect: isCorrect,
      };

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/submitUserResponse`, {
        method: 'POST',
        headers,
        body: JSON.stringify(userResponse),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error submitting user response:', error);
      throw error;
    }
  }

  async reopenCollection(collectionId: string): Promise<void> {
    try {
      const response = await fetch(`${baseUrl}/reopenCollection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collectionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error reopening collection:', error);
      throw error;
    }
  }

  async addCluesToCollection(collectionId: string, clues: Clue[]): Promise<void> {
    try {
      // Transform Clue objects to the format expected by the handler
      const transformedClues = clues.map(clue => {
        const transformed: any = {
          entry: clue.entry,
        };

        // If sense exists, put it in an array under 'senses'
        if (clue.sense) {
          transformed.senses = [clue.sense];
        }

        // If any custom clue properties exist, put them in a 'clue' object
        const customClueProps: any = {};
        if (clue.customClue !== undefined) customClueProps.customClue = clue.customClue;
        if (clue.customDisplayText !== undefined) customClueProps.customDisplayText = clue.customDisplayText;

        if (Object.keys(customClueProps).length > 0) {
          transformed.clue = customClueProps;
        }

        return transformed;
      });

      const response = await fetch(`${baseUrl}/addCluesToCollection?id=${encodeURIComponent(collectionId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedClues),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding clues to collection:', error);
      throw error;
    }
  }

  async removeClueFromCollection(collectionId: string, clueId: string): Promise<void> {
    try {
      const response = await fetch(`${baseUrl}/removeClueFromCollection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collectionId, clueId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error removing clue from collection:', error);
      throw error;
    }
  }

  async updateClueSense(clueId: string, senseId: string | null): Promise<void> {
    try {
      const response = await fetch(`${baseUrl}/updateClueSense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clueId, senseId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating clue sense:', error);
      throw error;
    }
  }

  async authenticateWithGoogle(token: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error authenticating with Google:', error);
      throw error;
    }
  }

  async verifyAuth(): Promise<AuthVerifyResponse> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { valid: false, error: 'No token found' };
      }

      const response = await fetch(`${baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { valid: false, error: `HTTP error! status: ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      console.error('Error verifying auth:', error);
      return { valid: false, error: 'Network error during verification' };
    }
  }
}

export default new CruziApi();

