import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import cluesData from "./crossword_clues.json";

export async function getCrosswordList(date: Date): Promise<ClueCollection[]> {
  let clues = readCrosswordClues();

  let monday: ClueCollection = {
      id: "NYT-2025-05-05",
      name: "Monday 5/5",
      date: date,
      clues: clues,
  };

  return [monday];
}

export async function getCollectionList(listId: string): Promise<ClueCollection[]> {
  let clues = readCrosswordClues();

  let monday: ClueCollection = {
      id: listId,
      name: "Monday 5/5",
      date: new Date(2025, 5, 5),
      clues: clues,
  };

  return [monday];
}

export async function getCrossword(source: string, date: Date): Promise<ClueCollection> {
  let clues = readCrosswordClues();

  let monday: ClueCollection = {
      id: "NYT-2025-05-05",
      name: "Monday 5/5",
      date: date,
      source: source,
      clues: clues,
  };

  return monday;
}

export async function getCollection(collectionId: string): Promise<ClueCollection> {
  let clues = readCrosswordClues();

  let monday: ClueCollection = {
    id: collectionId,
    name: "Monday 5/5",
    date: new Date(2025, 5, 5),
    source: "NYT",
    clues: clues,
  };

  return monday;
}

export async function getClue(clueId: number): Promise<Clue> {
  //let clues = readCrosswordClues();

  let clue: Clue = {
    masterEntry: "TIMEMACHINE",
    entry: "TIMEMACHINE",
    lang: "en-US",
    clue: "The DeLorean in \"Back to the Future,\" e.g.",
    metadata1: "17A",
  };

  return clue;
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
