export interface PuzzleSource {
  id: string;
  name: string;
}

export const PuzzleSources = {
  NYT: {id: "NYT", name: "New York Times"} as PuzzleSource,
  USA: {id: "USA", name: "USA Today"} as PuzzleSource,
  AVClub: {id: "AVClub", name: "AV Club"} as PuzzleSource,
  Newsday: {id: "Newsday", name: "Newsday"} as PuzzleSource,
  WSJ: {id: "WSJ", name: "Wall Street Journal"} as PuzzleSource,
  LAT: {id: "LAT", name: "Los Angeles Times"} as PuzzleSource,
  Universal: {id: "Universal", name: "Universal Crossword"} as PuzzleSource,
  BEQ: {id: "BEQ", name: "Brendan Emmett Quigley"} as PuzzleSource,
} as const;
