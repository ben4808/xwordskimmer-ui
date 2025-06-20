import { Entry } from "@entities/Entry";
import { TYPES } from "tedious";
import { sqlQuery } from "./sqlServer";
import { ILoaderDao } from "./ILoaderDao";

class LoaderDao implements ILoaderDao {
    exploredQuery = async (query: string, userId: string) => {
        let results = await sqlQuery(true, "ExploredQuery", [
            {name: "Query", type: TYPES.NVarChar, value: query},
            {name: "UserId", type: TYPES.NVarChar, value: userId},
        ]) as any[];

        return results.map(x => ({
            entry: x.entry,
            displayText: x.displayText,
            qualityScore: +x.qualityScore,
            obscurityScore: +x.obscurityScore,
            breakfastTestFailure: x.breakfastTestFailure === 1,
        }) as Entry);
    }

    frontierQuery = async (query: string, dataSource: string, page: number, recordsPerPage: number) => {
        let results = await sqlQuery(true, "FrontierQuery", [
            {name: "Query", type: TYPES.NVarChar, value: query},
            {name: "DataSource", type: TYPES.NVarChar, value: dataSource},
            {name: "Page", type: TYPES.Int, value: page},
            {name: "RecordsPerPage", type: TYPES.Int, value: recordsPerPage},
        ]) as Entry[];

        return results;
    }

    discoverEntries = async (userId: string, entries: Entry[]) => {
        await sqlQuery(true, "DiscoverEntries", [
            {name: "UserId", type: TYPES.NVarChar, value: userId},
            {name: "Entries", type: TYPES.TVP, value: {
                columns: [
                    { name: "entry", type: TYPES.NVarChar },
                    { name: "displayText", type: TYPES.NVarChar },
                    { name: "qualityScore", type: TYPES.Decimal, precision: 3, scale: 2 },
                    { name: "obscurityScore", type: TYPES.Decimal, precision: 3, scale: 2 },
                    { name: "breakfastTestFailure", type: TYPES.TinyInt },
                ],
                rows: entries.map(entry => [
                    entry.entry.toUpperCase().replace(/[^A-Z]/g, ""),
                    entry.displayText,
                    entry.qualityScore,
                    entry.obscurityScore,
                    entry.breakfastTestFailure,
                ]),
            }}
        ]);

        return "Done";
    }

    getAllExplored = async (userId: string, minQuality: string, minObscurity: string) => {
        let results = await sqlQuery(true, "GetAllExplored", [
            {name: "UserId", type: TYPES.NVarChar, value: userId},
            {name: "MinQuality", type: TYPES.Int, value: minQuality},
            {name: "MinObscurity", type: TYPES.Int, value: minObscurity},
        ]) as any[];

        return results.map(x => ({
            entry: x.entry,
            displayText: x.displayText,
            qualityScore: +x.qualityScore,
            obscurityScore: +x.obscurityScore,
            breakfastTestFailure: x.breakfastTestFailure === 1,
        }) as Entry);
    }
}

export default LoaderDao;
