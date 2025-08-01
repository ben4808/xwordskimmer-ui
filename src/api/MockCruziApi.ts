import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { Entry } from "../models/Entry";
import { EntryFilter } from "../models/EntryFilter";
import { EntryInfo } from "../models/EntryInfo";
import cluesData from "./crossword_clues.json";
import { ICruziApi } from "./ICruziApi";

export class MockCruziApi implements ICruziApi {
  // Mock implementation of the Cruzi API methods
  async getCrosswordList(date: Date): Promise<ClueCollection[]> {
    let clues = readCrosswordClues();

    let monday: ClueCollection = {
        id: "NYT-2025-05-05",
        name: "Monday 5/5",
        createdDate: date,
        source: "New York Times",
        clues: clues,
        author: "John Doe",
    };

    let laTimes: ClueCollection = {
      id: '2',
      name: 'The Sunday Challenge',
      createdDate: date,
      source: 'LA Times',
      clues: clues,
      author: "Jane Smith",
    };

    let wsj: ClueCollection = {
      id: '3',
      name: 'WSJ Daily',
      createdDate: date,
      source: 'Wall Street Journal',
      clues: clues,
      author: "Alice Johnson",
    };

    let newsday: ClueCollection = {
      id: '4',
      name: 'Saturday Stumper',
      createdDate: date,
      source: 'Newsday',
      clues: clues,
      author: "Bob Brown",
    };

    return [monday, laTimes, wsj, newsday];
  }

  async getCollectionList(): Promise<ClueCollection[]> {
    let clues = readCrosswordClues();

    let monday: ClueCollection = {
        id: "NYT-2025-05-05",
        name: "Monday 5/5",
        createdDate: new Date(2025, 5, 5),
        clues: clues,
    };

    let laTimes: ClueCollection = {
      id: '2',
      name: 'The Sunday Challenge',
      createdDate: new Date(2025, 5, 5),
      source: 'LA Times',
      clues: clues,
    };

    return [monday, laTimes];
  }

  async getCrossword(source: string, date: Date): Promise<ClueCollection> {
    let clues = readCrosswordClues();

    let monday: ClueCollection = {
        id: "NYT-2025-05-05",
        name: "Monday 5/5",
        createdDate: date,
        source: source,
        clues: clues,
    };

    return monday;
  }

  async getCollection(collectionId: string): Promise<ClueCollection> {
    let clues = readCrosswordClues();

    let monday: ClueCollection = {
      id: collectionId,
      name: "Monday 5/5",
      createdDate: new Date(2025, 5, 5),
      source: "NYT",
      clues: clues,
    };

    return monday;
  }

  async getClue(clueId: number): Promise<Clue> {
    //let clues = readCrosswordClues();

    let clue: Clue = {    
      id: "testid",
      clue: "The DeLorean in \"Back to the Future,\" e.g.",
      entry: {
        entry: "TIMEMACHINE",
        lang: "en",
        length: 11,
        displayText: "time machine",
        entryType: "Word",
        obscurityScore: 3.5,
        qualityScore: 4,
        crosswordScore: 4.5,
      } as Entry,
      lang: "en",
      source: "NYT",
      metadata1: "17A",
    } as Clue;

    return clue;
  }

  async getEntry(entry: string): Promise<EntryInfo> {
    throw new Error("Method not implemented.");
  }

  async generateEntryInfo(entry: string): Promise<EntryInfo> {
    throw new Error("Method not implemented.");
  }

  async queryEntries(query: string, filters: EntryFilter[]): Promise<Entry[]> {
    throw new Error("Method not implemented.");
  }

  async createClue(clue: string, entry: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
}

function readCrosswordClues(): Clue[] {
  let results : Clue[] = cluesData.map((clue) => {
    return {    
      id: clue.response.replace(/\s+/g, '').toUpperCase(),
      clue: clue.clue,
      entry: {
        entry: clue.response.replace(/\s+/g, '').toUpperCase(),
        lang: "en",
        length: clue.response.replace(/\s+/g, '').toUpperCase().length,
        displayText: clue.response,
        entryType: "Word",
        obscurityScore: 3,
        qualityScore: 3,
        crosswordScore: Math.round(Math.random() * 50),
      } as Entry,
      lang: "en",
      source: "NYT",
      metadata1: clue.number
    } as Clue;
  });

  return results;
}
