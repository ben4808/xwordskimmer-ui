import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { Puzzle } from './models/Puzzle';
import { PuzzleSource, Sources } from './models/PuzzleSource';

/* 
npx tsc
npx serverless offline
npx serverless invoke local --function crosswordScraper
*/

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log('Daily crossword scraper started at:', new Date().toISOString());

    return {
      statusCode: 200,
      body: JSON.stringify('Daily task completed successfully'),
    };

    let scrapedPuzzles = [] as Puzzle[]
    let sources = [] as PuzzleSource[]; // Add other sources as needed

    sources.forEach(async (source) => {
      try {
          let date = new Date(); // Use today's date or modify as needed
          let puzzle = await source.getPuzzle(date);
          scrapedPuzzles.push(puzzle);
          console.log(`Scraped puzzle from ${source.name} for date ${date.toISOString()}`);
      } catch (error) {
          console.error(`Error scraping puzzle from ${source.name}:`, error);
      }
    });

    return {
        statusCode: 200,
        body: JSON.stringify('Daily task completed successfully'),
    };
};
