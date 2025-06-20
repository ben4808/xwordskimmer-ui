import { scrapePuzzles } from './crosswordScraper';
import { Puzzle } from './models/Puzzle';


let runCrosswordLoadingTasks = async () => {
  let scrapedPuzzles = [] as Puzzle[];
  let dao = require('./daos/LoaderDao');

  console.log("Starting crossword loading tasks...");
  try {
    scrapedPuzzles = await scrapePuzzles();

    

    await dao.savePuzzles(scrapedPuzzles);
  } catch (error) {
    console.error("Error in crossword loading tasks: ", error);
  }
};

