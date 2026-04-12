import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
    const fileId = "test-manual-file-id";
    const now = Date.now();
    await turso.execute({
        sql: `INSERT INTO files (id, title, subject, tags, abstract, year, authors, mime_type, size_bytes, sha256, drive_id, gdrive_file_id, visibility, uploader_id, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            fileId,
            "Test File Metadata",
            "Test Subject",
            JSON.stringify(["tag1", "tag2"]),
            "Test Abstract",
            2026,
            "Author 1, Author 2",
            "image/jpeg",
            1000,
            "test-sha-256",
            "A",
            "test-gdrive-id",
            "members",
            "test-user",
            now,
            now
        ]
    });

    const rs = await turso.execute("SELECT * FROM files WHERE id = 'test-manual-file-id'");
    console.log(JSON.stringify(rs.rows, null, 2));

    // cleanup
    await turso.execute("DELETE FROM files WHERE id = 'test-manual-file-id'");
}

run().catch(console.error);
