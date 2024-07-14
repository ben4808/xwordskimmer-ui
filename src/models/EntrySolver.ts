export interface EntrySolver {
    entry: string;
    preSolved: boolean;



    row: number;
    col: number;
    number?: number;
    directions: string[];
    isBlack: boolean;
    content: string;
    isCircled: boolean;
}


