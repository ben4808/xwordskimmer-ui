import {
  Clue,
  ClueCollection,
  ClueHydrated,
  ClueWithProgress,
  CollectionClueTableRow,
  CrosswordCalendarDay,
  CrosswordResponse,
  Puzzle,
  User,
} from "cruzi-models";
import cluesData from "./crossword_clues.json";
import countiesData from "./IdahoCounties.json";
import { ICruziApi, AuthResponse, AuthVerifyResponse } from "./ICruziApi";

const COLLECTION_CLUES_PAGE_SIZE = 100;

export class MockCruziApi implements ICruziApi {
  async getCrosswordList(_date: string): Promise<ClueCollection[]> {
    const collections = await this.getCollectionList();
    return collections.filter((c) => c.puzzle);
  }

  async getCrosswordCalendar(
    _publicationId: string,
    month: number,
    year: number
  ): Promise<CrosswordCalendarDay[]> {
    const daysInMonth = new Date(year, month, 0).getDate();
    return [
      {
        date: `${String(month).padStart(2, "0")}/05/${year}`,
        progressState: "completed",
        hintsUsed: 2,
      },
      {
        date: `${String(month).padStart(2, "0")}/12/${year}`,
        progressState: "in_progress",
        hintsUsed: 1,
      },
      {
        date: `${String(month).padStart(2, "0")}/${String(daysInMonth).padStart(2, "0")}/${year}`,
        progressState: "in_progress",
        hintsUsed: 0,
      },
    ];
  }

  async getCrossword(
    params: { id: string } | { publicationId: string; date: string }
  ): Promise<ClueCollection> {
    const collections = await this.getCollectionList();
    if ("id" in params) {
      const found = collections.find((c) => c.id === params.id);
      if (found) return found;
    } else {
      const found = collections.find(
        (c) =>
          c.puzzle &&
          c.source?.toLowerCase() === params.publicationId.toLowerCase()
      );
      if (found) return found;
    }
    return collections.find((c) => c.puzzle) ?? collections[0];
  }

  async submitCrosswordResponse(response: CrosswordResponse): Promise<void> {
    console.log("Mock crossword response:", response);
  }

  async getCollectionById(collectionId: string): Promise<ClueCollection | null> {
    const collections = await this.getCollectionList();
    return collections.find((c) => c.id === collectionId) || null;
  }

  async getCollectionList(): Promise<ClueCollection[]> {
    const idahoClues = readIdahoCounties();
    const crosswordClues = readCrosswordClues();

    const counties: ClueCollection = {
      id: "IdahoCounties",
      title: "Idaho Counties",
      createdDate: new Date(2025, 8, 5),
      modifiedDate: new Date(2025, 8, 5),
      source: "Lists",
      author: "Ben Zoon",
      isPrivate: false,
      clueCount: idahoClues.length,
      clues: idahoClues,
      lang: "en",
    };

    const monday: ClueCollection = {
      id: "NYT-2025-05-05",
      title: "Monday 5/5",
      createdDate: new Date(2025, 5, 5),
      modifiedDate: new Date(2025, 5, 6),
      source: "NYT",
      puzzle: mockCrosswordPuzzle(),
      isPrivate: false,
      clueCount: crosswordClues.length,
      clues: crosswordClues,
      lang: "en",
    };

    const laTimes: ClueCollection = {
      id: "2",
      title: "The Sunday Challenge",
      createdDate: new Date(2025, 5, 5),
      modifiedDate: new Date(2025, 5, 6),
      source: "LA Times",
      puzzle: mockCrosswordPuzzle(),
      isPrivate: false,
      clueCount: crosswordClues.length,
      clues: crosswordClues,
      lang: "en",
    };

    return [counties, monday, laTimes];
  }

  async getCollectionBatch(collectionId: string): Promise<ClueWithProgress[]> {
    const clues =
      collectionId === "IdahoCounties"
        ? readIdahoCounties()
        : readCrosswordClues();
    return clues.map(clueToBatchClue);
  }

  async getCollectionClues(
    collectionId: string,
    sortBy?: string,
    sortDirection?: string,
    progressFilter?: string,
    statusFilter?: string,
    page?: number
  ): Promise<CollectionClueTableRow[]> {
    const clues =
      collectionId === "IdahoCounties"
        ? readIdahoCounties()
        : readCrosswordClues();

    let rows = clues.map(clueToTableRow);

    if (progressFilter) {
      rows = rows.filter((row) => row.progress === progressFilter);
    }
    if (statusFilter) {
      rows = rows.filter((row) => row.status === statusFilter);
    }

    const direction = sortDirection === "desc" ? -1 : 1;
    if (sortBy === "Progress") {
      rows.sort((a, b) => a.progress.localeCompare(b.progress) * direction);
    } else {
      rows.sort((a, b) => a.answer.localeCompare(b.answer) * direction);
    }

    const pageIndex = Math.max(1, page ?? 1);
    const start = (pageIndex - 1) * COLLECTION_CLUES_PAGE_SIZE;
    return rows.slice(start, start + COLLECTION_CLUES_PAGE_SIZE);
  }

  async submitUserResponse(
    clueId: string,
    collectionId: string,
    isCorrect: boolean
  ): Promise<void> {
    console.log(
      `User response for clue ${clueId} in collection ${collectionId}: ${isCorrect ? "correct" : "incorrect"}`
    );
  }

  async reopenCollection(collectionId: string): Promise<void> {
    console.log(`Reopening collection: ${collectionId}`);
  }

  async addCluesToCollection(
    collectionId: string,
    clues: Clue[]
  ): Promise<void> {
    console.log(`Adding ${clues.length} clues to collection: ${collectionId}`);
  }

  async removeClueFromCollection(
    collectionId: string,
    clueId: string
  ): Promise<void> {
    console.log(`Removing clue ${clueId} from collection: ${collectionId}`);
  }

  async updateClueSense(clueId: string, senseId: string | null): Promise<void> {
    console.log(`Updating clue ${clueId} sense to ${senseId ?? "null"}`);
  }

  async authenticateWithGoogle(token: string): Promise<AuthResponse> {
    console.log(
      "Mock Google authentication with token:",
      token.substring(0, 20) + "..."
    );

    const mockUser: User = {
      id: "mock-user-123",
      firstName: "Mock",
      lastName: "User",
      email: "mock@example.com",
      nativeLang: "en",
    };

    return {
      token: "mock-jwt-token-" + Date.now(),
      user: mockUser,
    };
  }

  async verifyAuth(): Promise<AuthVerifyResponse> {
    const token = localStorage.getItem("token");

    if (!token || !token.startsWith("mock-jwt-token-")) {
      return { valid: false, error: "Invalid mock token" };
    }

    const mockUser: User = {
      id: "mock-user-123",
      firstName: "Mock",
      lastName: "User",
      email: "mock@example.com",
      nativeLang: "en",
    };

    return {
      valid: true,
      user: mockUser,
    };
  }
}

function mockCrosswordPuzzle(): Puzzle {
  return {
    title: "Mock puzzle",
    date: new Date(),
    width: 15,
    height: 15,
  };
}

function clueToBatchClue(clue: ClueHydrated): ClueWithProgress {
  return {
    id: clue.id,
    lang: clue.lang,
    entry: clue.entry,
    sense: clue.sense,
    customClue: clue.customClue,
    customDisplayText: clue.customDisplayText,
  };
}

function clueToTableRow(clue: ClueHydrated): CollectionClueTableRow {
  return {
    id: clue.id ?? "",
    answer: clue.entry.displayText ?? clue.entry.entry,
    sense: "N/A",
    clue: clue.customClue ?? "N/A",
    progress: "Unseen",
    status: "Ready",
    senses: [],
  };
}

function readCrosswordClues(): ClueHydrated[] {
  return cluesData.map((clue) => {
    const entry = clue.response.replace(/\s+/g, "").toUpperCase();
    return {
      id: entry,
      lang: "en",
      customClue: clue.clue,
      entry: {
        entry,
        lang: "en",
        displayText: clue.response,
        entryType: "Word",
        familiarityScore: 3,
        qualityScore: 3,
      },
    };
  });
}

function readIdahoCounties(): ClueHydrated[] {
  const clues: ClueHydrated[] = [];
  let idIdx = 0;

  countiesData.counties.forEach((county) => {
    clues.push({
      id: idIdx++ + "",
      lang: "en",
      customClue: county.name,
      entry: {
        entry: county.capital.replace(/\s+/g, "").toUpperCase(),
        lang: "en",
        displayText: county.capital,
        entryType: "Word",
        familiarityScore: 3,
        qualityScore: 3,
      },
    });

    clues.push({
      id: idIdx++ + "",
      lang: "en",
      customClue: county.code,
      entry: {
        entry: county.name.replace(/\s+/g, "").toUpperCase(),
        lang: "en",
        displayText: county.name,
        entryType: "Word",
        familiarityScore: 3,
        qualityScore: 3,
      },
    });
  });

  return clues;
}
