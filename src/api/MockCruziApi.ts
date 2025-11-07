import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { Entry } from "../models/Entry";
import { User } from "../models/User";
import cluesData from "./crossword_clues.json";
import countiesData from "./IdahoCounties.json";
import { ICruziApi, AuthResponse, AuthVerifyResponse } from "./ICruziApi";

export class MockCruziApi implements ICruziApi {
  // Mock implementation of the Cruzi API methods
  
  async getCollectionList(): Promise<ClueCollection[]> {
    let clues = readIdahoCounties();

    let counties: ClueCollection = {
        id: "IdahoCounties",
        title: "Idaho Counties",
        createdDate: new Date(2025, 8, 5),
        modifiedDate: new Date(2025, 8, 5),
        source: "Lists",
        author: "Ben Zoon",
        isCrosswordCollection: false,
        isPrivate: false,
        clueCount: clues.length,
        clues: clues,
    };

    let monday: ClueCollection = {
        id: "NYT-2025-05-05",
        title: "Monday 5/5",
        createdDate: new Date(2025, 5, 5),
        modifiedDate: new Date(2025, 5, 6),
        source: "NYT",
        isCrosswordCollection: true,
        isPrivate: false,
        clueCount: readCrosswordClues().length,
        clues: readCrosswordClues(),
    };

    let laTimes: ClueCollection = {
      id: '2',
      title: 'The Sunday Challenge',
      createdDate: new Date(2025, 5, 5),
      modifiedDate: new Date(2025, 5, 6),
      source: "LA Times",
      isCrosswordCollection: true,
      isPrivate: false,
      clueCount: readCrosswordClues().length,
      clues: readCrosswordClues(),
    };

    return [counties, monday, laTimes];
  }

  async getCollectionBatch(collectionId: string): Promise<Clue[]> {
    if (collectionId === "IdahoCounties") {
      return readIdahoCounties();
    } else {
      return readCrosswordClues();
    }
  }

  async submitUserResponse(clueId: string, collectionId: string, isCorrect: boolean): Promise<void> {
    // Mock implementation - in a real API this would update the database
    console.log(`User response for clue ${clueId} in collection ${collectionId}: ${isCorrect ? 'correct' : 'incorrect'}`);
  }

  async reopenCollection(collectionId: string): Promise<void> {
    // Mock implementation - in a real API this would reset the collection progress
    console.log(`Reopening collection: ${collectionId}`);
  }

  async addCluesToCollection(collectionId: string, clues: Clue[]): Promise<void> {
    // Mock implementation - in a real API this would add clues to the collection
    console.log(`Adding ${clues.length} clues to collection: ${collectionId}`);
  }

  async removeClueFromCollection(collectionId: string, clueId: number): Promise<void> {
    // Mock implementation - in a real API this would remove the clue from the collection
    console.log(`Removing clue ${clueId} from collection: ${collectionId}`);
  }

  async authenticateWithGoogle(token: string): Promise<AuthResponse> {
    // Mock implementation - simulate successful Google authentication
    console.log('Mock Google authentication with token:', token.substring(0, 20) + '...');
    
    const mockUser: User = {
      id: 'mock-user-123',
      firstName: 'Mock',
      lastName: 'User',
      email: 'mock@example.com',
      nativeLang: 'en',
    };

    return {
      token: 'mock-jwt-token-' + Date.now(),
      user: mockUser,
    };
  }

  async verifyAuth(): Promise<AuthVerifyResponse> {
    // Mock implementation - simulate token verification
    const token = localStorage.getItem('token');
    
    if (!token || !token.startsWith('mock-jwt-token-')) {
      return { valid: false, error: 'Invalid mock token' };
    }

    const mockUser: User = {
      id: 'mock-user-123',
      firstName: 'Mock',
      lastName: 'User',
      email: 'mock@example.com',
      nativeLang: 'en',
    };

    return {
      valid: true,
      user: mockUser,
    };
  }
}

function readCrosswordClues(): Clue[] {
  let results : Clue[] = cluesData.map((clue) => {
    return {    
      id: clue.response.replace(/\s+/g, '').toUpperCase(),
      customClue: clue.clue,
      entry: {
        entry: clue.response.replace(/\s+/g, '').toUpperCase(),
        lang: "en",
        length: clue.response.replace(/\s+/g, '').toUpperCase().length,
        displayText: clue.response,
        entryType: "Word",
        obscurityScore: 3,
        qualityScore: 3,
        cruziScore: Math.round(Math.random() * 50),
      } as Entry,
      source: "NYT",
    } as Clue;
  });

  return results;
}

function readIdahoCounties(): Clue[] {
  let clues = [] as Clue[];
  let idIdx = 0;

  countiesData.counties.forEach((county) => {
    // Clue: county name -> answer: county capital
    clues.push({    
      id: idIdx++ + "",
      customClue: county.name,
      entry: {
        entry: county.capital.replace(/\s+/g, '').toUpperCase(),
        lang: "en",
        length: county.capital.replace(/\s+/g, '').toUpperCase().length,
        displayText: county.capital,
        entryType: "Word",
        obscurityScore: 3,
        qualityScore: 3,
        cruziScore: Math.round(Math.random() * 50),
      } as Entry,
      source: "IdahoCounties",
    });

    // Clue: county code -> answer: county name
    clues.push({    
      id: idIdx++ + "",
      customClue: county.code,
      entry: {
        entry: county.name.replace(/\s+/g, '').toUpperCase(),
        lang: "en",
        length: county.name.replace(/\s+/g, '').toUpperCase().length,
        displayText: county.name,
        entryType: "Word",
        obscurityScore: 3,
        qualityScore: 3,
        cruziScore: Math.round(Math.random() * 50),
      } as Entry,
      source: "IdahoCounties",
    });
  });

  return clues;
}
