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
};
