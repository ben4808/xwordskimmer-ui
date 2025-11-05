
import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { UserResponse } from "../models/UserResponse";
import { CollectionClueRow } from "../models/CollectionClueRow";
import { ICruziApi, AuthResponse, AuthVerifyResponse } from "./ICruziApi";
import settings from "../settings.json";

const baseUrl = settings.api_base_url + "/api";

class CruziApi implements ICruziApi {
  async getCollectionList(): Promise<ClueCollection[]> {
    try {
      const response = await fetch(`${baseUrl}/getCollectionList`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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

  async getCollectionBatch(collectionId: string): Promise<Clue[]> {
    try {
      const response = await fetch(`${baseUrl}/getCollectionBatch?collection_id=${encodeURIComponent(collectionId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      
      // Transform raw API response to Clue objects
      return rawData.map((raw: any) => {
        // Convert object to Map helper
        const objectToMap = (obj: any): Map<string, string> | undefined => {
          if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            return undefined;
          }
          return new Map(Object.entries(obj));
        };

        // Transform example sentences from { _id, en, es, gn, ... } format
        // to { id, senseId, translations: Map } format
        const transformExampleSentences = (exampleSentences: any[], senseId?: string): any[] => {
          if (!exampleSentences || !Array.isArray(exampleSentences)) {
            return [];
          }
          
          return exampleSentences.map((ex: any) => {
            const translations = new Map<string, string>();
            // Copy all properties except _id to the translations map
            Object.keys(ex).forEach(key => {
              if (key !== '_id' && ex[key] !== null && ex[key] !== undefined) {
                translations.set(key, ex[key]);
              }
            });
            
            return {
              id: ex._id,
              senseId: senseId || '',
              translations: translations.size > 0 ? translations : undefined,
            };
          });
        };

        const clue: Clue = {
          id: raw.id,
          customClue: raw.customClue,
          customDisplayText: raw.customDisplayText,
          source: raw.source,
        };

        // Construct Entry object if present
        if (raw.entry) {
          clue.entry = {
            entry: raw.entry.entry,
            lang: raw.entry.lang,
            displayText: raw.entry.displayText,
            loadingStatus: raw.entry.loadingStatus,
          };
        }

        // Construct Sense object if present
        if (raw.sense) {
          clue.sense = {
            id: raw.sense.id,
            partOfSpeech: raw.sense.partOfSpeech,
            commonness: raw.sense.commonness,
            summary: objectToMap(raw.sense.summary),
            definition: objectToMap(raw.sense.definition),
            exampleSentences: transformExampleSentences(raw.sense.exampleSentences || [], raw.sense.id),
            familiarityScore: raw.sense.familiarityScore,
            qualityScore: raw.sense.qualityScore,
            sourceAi: raw.sense.sourceAi,
            // translations not returned by populate_collection_batch stored procedure
          };
        }

        // Construct progressData if present
        // Note: DAO returns progressData with totalSolves, correctSolves, incorrectSolves, lastSolve (Date serialized as string)
        // The model expects userId, clueId, correctSolvesNeeded, correctSolves, incorrectSolves, lastSolveDate
        if (raw.progressData) {
          clue.progressData = {
            userId: '', // Not available in API response
            clueId: raw.id || '',
            correctSolvesNeeded: raw.progressData.correctSolvesNeeded, // May not be in response
            correctSolves: raw.progressData.correctSolves || 0,
            incorrectSolves: raw.progressData.incorrectSolves || 0,
            lastSolveDate: raw.progressData.lastSolve ? (typeof raw.progressData.lastSolve === 'string' ? new Date(raw.progressData.lastSolve) : raw.progressData.lastSolve) : undefined,
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
  ): Promise<CollectionClueRow[]> {
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

  async submitUserResponse(clueId: string, isCorrect: boolean): Promise<void> {
    try {
      const userResponse: Partial<UserResponse> = {
        clueId: clueId.toString(),
        isCorrect: isCorrect,
      };

      const response = await fetch(`${baseUrl}/submitUserResponse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${baseUrl}/addCluesToCollection?id=${encodeURIComponent(collectionId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clues),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding clues to collection:', error);
      throw error;
    }
  }

  async removeClueFromCollection(collectionId: string, clueId: number): Promise<void> {
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

