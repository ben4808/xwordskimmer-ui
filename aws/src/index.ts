import { GeminiAiProvider } from './ai/gemini';
import { IAiProvider } from './ai/IAiProvider';
import { scrapePuzzles } from './crosswordScraper';
import { ILoaderDao } from './daos/ILoaderDao';
import LoaderDao from './daos/LoaderDao';
import { mapValues } from './lib/utils';
import { ClueCollection } from './models/ClueCollection';
import { Entry } from './models/Entry';
import { Puzzle } from './models/Puzzle';


let runCrosswordLoadingTasks = async () => {
  let scrapedPuzzles = [] as Puzzle[];
  let dao: ILoaderDao = new LoaderDao();
  let aiProvider: IAiProvider = new GeminiAiProvider();

  console.log("Starting crossword loading tasks...");
  try {
    scrapedPuzzles = await scrapePuzzles();
    
    for (let puzzle of scrapedPuzzles) {
      await dao.savePuzzle(puzzle);
      let clueCollection = puzzleToClueCollection(puzzle);
      await dao.saveClueCollection(clueCollection);

      //let entries = clueCollection.clues.map(clue => clue.entry.get(clue.lang) as Entry);
      //let langToTranslateTo = "es";

      //let translateResults = await aiProvider.getTranslateResultsAsync(clueCollection.clues, langToTranslateTo);
      //await dao.addTranslateResults(translateResults);

      //let obscurityResults = await aiProvider.getObscurityResultsAsync(entries, langToTranslateTo);
      //let qualityResults = await aiProvider.getQualityResultsAsync(entries, langToTranslateTo);
      //await dao.addObscurityQualityResults(obscurityResults, qualityResults);
    }
  } catch (error) {
    console.error("Error in crossword loading tasks: ", error);
  }
};

let puzzleToClueCollection = (puzzle: Puzzle): ClueCollection => {
  let lang = puzzle.lang || 'en';

  let clueCollection = {
    name:  puzzle.title,
    puzzleId:  puzzle.id,
    createdDate: new Date(),
    clues: mapValues(puzzle.entries).map(puzEntry => ({
      entry: new Map<string, Entry>([[lang, {
        entry: puzEntry.entry,
        lang: lang,
      }]]),
      lang: puzzle.lang || 'en',
      clue: puzEntry.clue
    })),
  } as ClueCollection;

  return clueCollection;
}

runCrosswordLoadingTasks()
  .then(() => console.log("Crossword loading tasks completed successfully."))
  .catch(error => console.error("Error in crossword loading tasks: ", error));
