import { scrapePuzzles } from './crosswordScraper';

console.log("Starting crossword scraper...");
scrapePuzzles().then(() => {
  console.log("Crossword scraper finished successfully."); 
}
).catch((error) => {
  console.error("Error in crossword scraper:", error);
});
