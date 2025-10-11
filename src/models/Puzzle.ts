export interface Puzzle {
    id?: string;
    title: string;
    publication?: string;
    date: Date;
    width: number;
    height: number;
    authors?: string[];
    copyright?: string;
    notes?: string;
    lang?: string;
    sourceLink?: string; // Link to the source of the puzzle
}
