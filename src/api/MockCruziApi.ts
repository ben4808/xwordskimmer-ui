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
        clues: clues,
    };

    return [monday];
  }

  async getCollectionList(): Promise<ClueCollection[]> {
    let clues = readCrosswordClues();

    let monday: ClueCollection = {
        id: "NYT-2025-05-05",
        name: "Monday 5/5",
        createdDate: new Date(2025, 5, 5),
        clues: clues,
    };

    return [monday];
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
      id: "1",
      entry: "TIMEMACHINE",
      lang: "en-US",
      clue: "The DeLorean in \"Back to the Future,\" e.g.",
      metadata1: "17A",
    };

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
        masterEntry: clue.response,
        entry: clue.response,
        lang: 'en-US',
        clue: clue.clue,
        metadata1: clue.number,
    } as Clue;
  });

  return results;
}
