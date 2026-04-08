import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "@/db/schema";

// Lazy initialization — never connect at module load time
let _db: ReturnType<typeof drizzle> | null = null;

function getClient() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) throw new Error("TURSO_DATABASE_URL is not set");

    return createClient({
        url,
        authToken,
    });
}

export function getDb() {
    if (!_db) {
        _db = drizzle(getClient(), { schema });
    }
    return _db;
}
