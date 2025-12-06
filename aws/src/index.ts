import { runTasks } from './crosswordScraper';
import { entryInfoGenerator } from './entryInfoGenerator';

export { entryInfoGenerator };

runTasks()
  .then(() => console.log("Crossword loading tasks completed successfully."))
  .catch(error => console.error("Error in crossword loading tasks: ", error));
