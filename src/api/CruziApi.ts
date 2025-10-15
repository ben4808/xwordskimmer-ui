
import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { UserResponse } from "../models/UserResponse";
import { ICruziApi } from "./ICruziApi";
import settings from "../settings.json";

const baseUrl = settings.api_base_url;

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
      const response = await fetch(`${baseUrl}/getCollectionBatch?id=${encodeURIComponent(collectionId)}`, {
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
      console.error('Error fetching collection batch:', error);
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
}

export default new CruziApi();

