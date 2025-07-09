import { generatePuzFile } from './lib/puzFiles';
import { Puzzle } from './models/Puzzle';
import { PuzzleSource, Sources } from './models/PuzzleSource';
import { writeFile } from 'fs/promises';

let scrapePuzzle = async (source: PuzzleSource, date: Date): Promise<Puzzle> => {
  try {
    let puzzle = await source.getPuzzle(date);
    return puzzle;
  } catch (error) {
    throw error; // Re-throw to handle it in the calling function
  }
}

let savePuzzle = async (puzzle: Puzzle, directory: string, filename: string): Promise<void> => {
  let filePath = `${directory}\\${filename}`;
  let blob = generatePuzFile(puzzle);
  await writeBlobToFile(blob, filePath);
}

async function writeBlobToFile(blob: Blob, filePath: string): Promise<void> {
  try {
    // Convert Blob to Buffer
    const buffer = Buffer.from(await blob.arrayBuffer());
    await writeFile(filePath, buffer);
    console.log('File written successfully');
  } catch (error) {
    console.error('Error writing file:', error);
  }
}

export const scrapePuzzles = async (): Promise<Puzzle[]> => {
  let scrapedPuzzles = [] as Puzzle[]
  let sources = [
    Sources.NYT, 
    //Sources.WSJ, 
    //Sources.Newsday
  ] as PuzzleSource[]; // Add other sources as needed
  let date = new Date(); // Use today's date or modify as needed

  await Promise.all(sources.map(async (source) => {
    try {
        let puzzle = await scrapePuzzle(source, date);
        scrapedPuzzles.push(puzzle);

        let directory = "C:\\Users\\ben_z\\Desktop\\puzzles";
        let fileName = `${source.id}-${date.toISOString().split('T')[0]}.puz`;
        await savePuzzle(puzzle, directory, fileName);

        console.log(`Scraped puzzle from ${source.name} for date ${date.toISOString()}`);
    } catch (error) {
        console.error(`Error scraping puzzle from ${source.name} for date ${date.toISOString()}: `, error);
    }
  }));

  return scrapedPuzzles;
}
