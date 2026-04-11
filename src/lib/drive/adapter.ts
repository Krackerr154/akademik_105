import { google, drive_v3 } from "googleapis";

type DriveAccountId = "A" | "B";

interface DriveCredentials {
    clientEmail: string;
    privateKey: string;
    folderId: string;
}

/**
 * GoogleDriveAdapter — per rules.md §6
 * - Service accounts only, lazy credential loading
 * - Never expose gdrive_file_id to client
 */
export class GoogleDriveAdapter {
    private driveClients = new Map<DriveAccountId, drive_v3.Drive>();

    private getCredentials(driveId: DriveAccountId): DriveCredentials {
        const prefix = `GDRIVE_${driveId}`;
        const clientEmail = process.env[`${prefix}_CLIENT_EMAIL`];
        const privateKey = process.env[`${prefix}_PRIVATE_KEY`]?.replace(
            /\\n/g,
            "\n"
        );
        const folderId = process.env[`${prefix}_FOLDER_ID`];

        if (!clientEmail || !privateKey || !folderId) {
            throw new Error(`Drive ${driveId} credentials belum dikonfigurasi`);
        }

        return { clientEmail, privateKey, folderId };
    }

    private getDriveClient(driveId: DriveAccountId): drive_v3.Drive {
        if (!this.driveClients.has(driveId)) {
            const creds = this.getCredentials(driveId);
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: creds.clientEmail,
                    private_key: creds.privateKey,
                },
                scopes: ["https://www.googleapis.com/auth/drive"],
            });

            this.driveClients.set(driveId, google.drive({ version: "v3", auth }));
        }
        return this.driveClients.get(driveId)!;
    }

    /**
     * Initialize a resumable upload session.
     * Returns the resumable upload URI that the client uploads to directly.
     * Uses Google Drive API v3 resumable upload protocol:
     * 1. POST metadata to initiate session
     * 2. Google responds with Location header containing the resumable URI
     * 3. Client uploads file bytes directly to that URI (bypasses Vercel)
     */
    async initResumableUpload(
        driveId: DriveAccountId,
        fileName: string,
        mimeType: string,
        fileSize?: number
    ): Promise<{ uploadUri: string; gdriveFileId: string }> {
        const creds = this.getCredentials(driveId);
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: creds.clientEmail,
                private_key: creds.privateKey,
            },
            scopes: ["https://www.googleapis.com/auth/drive"],
        });

        const accessToken = await auth.getAccessToken();
        if (!accessToken) {
            throw new Error(`Gagal mendapatkan access token untuk Drive ${driveId}`);
        }

        // Step 1: Initiate resumable upload session via raw HTTP
        const metadata = JSON.stringify({
            name: fileName,
            parents: [creds.folderId],
            mimeType,
        });

        const initUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id";
        const headers: Record<string, string> = {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": mimeType,
        };
        if (fileSize) {
            headers["X-Upload-Content-Length"] = String(fileSize);
        }

        const initResponse = await fetch(initUrl, {
            method: "POST",
            headers,
            body: metadata,
        });

        if (!initResponse.ok) {
            const errText = await initResponse.text();
            throw new Error(`Drive resumable upload init failed: ${initResponse.status} ${errText}`);
        }

        const uploadUri = initResponse.headers.get("Location");
        if (!uploadUri) {
            throw new Error("Drive did not return a resumable upload URI (Location header missing)");
        }

        // We don't have the file ID yet — it's assigned after upload completes
        // Return the URI for client-side upload
        return { uploadUri, gdriveFileId: "" };
    }

    /** Verify a file exists on Drive and return its metadata */
    async getFile(
        driveId: DriveAccountId,
        gdriveFileId: string
    ): Promise<{ id: string; name: string; size: number } | null> {
        try {
            const drive = this.getDriveClient(driveId);
            const response = await drive.files.get({
                fileId: gdriveFileId,
                fields: "id,name,size",
            });

            return {
                id: response.data.id ?? "",
                name: response.data.name ?? "",
                size: parseInt(response.data.size ?? "0", 10),
            };
        } catch {
            return null;
        }
    }

    /**
     * Delete a file from Drive.
     * Per rules.md §6.2: delete from Drive first, then DB.
     * If Drive delete fails, do NOT delete from DB.
     */
    async deleteFile(driveId: DriveAccountId, gdriveFileId: string): Promise<boolean> {
        try {
            const drive = this.getDriveClient(driveId);
            await drive.files.delete({ fileId: gdriveFileId });
            return true;
        } catch (err) {
            console.error(
                `[DriveAdapter] Failed to delete file ${gdriveFileId} from Drive ${driveId}:`,
                err
            );
            return false;
        }
    }

    /** Get usage statistics for a drive */
    async getUsage(
        driveId: DriveAccountId
    ): Promise<{ used: number; total: number } | null> {
        try {
            const drive = this.getDriveClient(driveId);
            const response = await drive.about.get({
                fields: "storageQuota",
            });

            const quota = response.data.storageQuota;
            if (!quota) {
                console.warn(`[DriveAdapter] Drive ${driveId}: no storageQuota returned`);
                return null;
            }

            const used = parseInt(quota.usageInDrive ?? quota.usage ?? "0", 10);
            // Service accounts often return limit=0 or no limit
            // Default to 15 GB free tier if limit is 0 or missing
            let total = parseInt(quota.limit ?? "0", 10);
            if (total === 0) {
                total = 15 * 1024 * 1024 * 1024; // 15 GB default
            }

            return { used, total };
        } catch (err) {
            console.error(
                `[DriveAdapter] Failed to get usage for Drive ${driveId}:`,
                err instanceof Error ? err.message : err
            );
            return null;
        }
    }

    /**
     * Generate a direct download link (webContentLink).
     * This acts as a "signed URL" — expires naturally with Google's token.
     */
    async getDownloadUrl(
        driveId: DriveAccountId,
        gdriveFileId: string
    ): Promise<string | null> {
        try {
            const drive = this.getDriveClient(driveId);
            const response = await drive.files.get({
                fileId: gdriveFileId,
                fields: "webContentLink",
            });
            return response.data.webContentLink ?? null;
        } catch {
            return null;
        }
    }
}

// Singleton — lazy initialized
let _adapter: GoogleDriveAdapter | null = null;

export function getDriveAdapter(): GoogleDriveAdapter {
    if (!_adapter) {
        _adapter = new GoogleDriveAdapter();
    }
    return _adapter;
}
