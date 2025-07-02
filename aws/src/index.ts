import { GeminiAiProvider } from './ai/gemini';
import { scrapePuzzles } from './crosswordScraper';
import { ILoaderDao } from './daos/ILoaderDao';
import LoaderDao from './daos/LoaderDao';
import { generateId, mapValues } from './lib/utils';
import { ClueCollection } from './models/ClueCollection';
import { Puzzle } from './models/Puzzle';
import { TranslateResult } from './models/TranslateResult';


let runCrosswordLoadingTasks = async () => {
  let scrapedPuzzles = [] as Puzzle[];
  let dao: ILoaderDao = new LoaderDao();
  let aiProvider = new GeminiAiProvider();

  console.log("Starting crossword loading tasks...");
  try {
    scrapedPuzzles = await scrapePuzzles();
    
    for (let puzzle of scrapedPuzzles) {
      await dao.savePuzzle(puzzle);
      let clueCollection = puzzleToClueCollection(puzzle);
      await dao.saveClueCollection(clueCollection);

      await aiProvider.populateTranslateResultsAsync(clueCollection.clues, "es");
      let obscurityResults = await aiProvider.getObscurityResultsAsync(clueCollection.clues, "es");
      let qualityResults = await aiProvider.getQualityResultsAsync(clueCollection.clues, "es");

      await dao.saveClues(clueCollection.id, clueCollection.clues);
      await dao.saveAIData(
        clueCollection.clues.map(clue => clue.translateResults.get("es") || new TranslateResult()),
        obscurityResults,
        qualityResults
      );
    }
  } catch (error) {
    console.error("Error in crossword loading tasks: ", error);
  }
};

let puzzleToClueCollection = (puzzle: Puzzle): ClueCollection => {
  let clueCollection = {
    id: generateId(),
    name:  puzzle.title,
    puzzleId:  puzzle.id,
    createdDate: new Date(),
    clues: mapValues(puzzle.entries).map(puzEntry => ({
      id: generateId(),
      entry: puzEntry.entry,
      lang: puzzle.lang || 'en',
      clue: puzEntry.clue,
      translateResults: new Map<string, TranslateResult>(),
    })),
  } as ClueCollection;

  return clueCollection;
}
