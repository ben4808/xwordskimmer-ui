import  { Pool } from 'pg';
import { PostgresParameter } from './PostgresParameter';
import settings from '../../settings.json';

let pool = new Pool({
    user: settings.db_user,
    host: settings.db_host,
    database: 'cruzi',
    password: settings.db_password,
    port: 5432,
});

export async function sqlQuery(isSP: boolean, sqlOrSP: string, parameters?: PostgresParameter[]): Promise<any[]> {
    let sqlText = "";
    let paramsArray = [] as any[];
    if (parameters)
        paramsArray = parameters.map(p => p.value);

    if (isSP) {
        let paramsStr = paramsArray.map(x => {
          if (x === undefined || x === null) return "null";
          if (x instanceof Date) return `'${x.toISOString()}'`;
          if (typeof x === "number" || typeof x === "boolean") return x.toString();
          return "'" + x.replace(/'/g, "''") + "'";
        }).join(", ");
        paramsArray = [];
        sqlText = `select * from ${sqlOrSP}(${paramsStr})`;
    }

    try {
        const res = await pool.query(sqlText, paramsArray);
        return res.rows;
    } catch (err: any) {
        console.log("Postgres error: " + err.stack);
        return [];
    }
}
