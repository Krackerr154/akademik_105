import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
    const rs = await turso.execute("SELECT id, title, created_at, datetime(created_at/1000, 'unixepoch', 'localtime') as ts, authors, abstract FROM files");
    console.log(JSON.stringify(rs.rows, null, 2));
}

run().catch(console.error);
