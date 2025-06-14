export interface ICruziDao {
    exploredQuery: (query: string, userId: string) => Promise<Entry[]>;
    frontierQuery: (query: string, dataSource: string, page: number, recordsPerPage: number) => Promise<Entry[]>;
    discoverEntries: (userId: string, entries: Entry[]) => Promise<string>;
    getAllExplored: (userId: string, minQuality: string, minObscurity: string) => Promise<Entry[]>;
}
