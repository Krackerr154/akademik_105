import { google, drive_v3 } from "googleapis";

type DriveAccountId = "A" | "B";

interface DriveCredentials {
    refreshToken: string;
    folderId: string;
}

/**
 * GoogleDriveAdapter — per rules.md §6
 * - OAuth2 Refresh Token auth (Option 2)
 * - Never expose gdrive_file_id to client
 */
export class GoogleDriveAdapter {
    private driveClients = new Map<DriveAccountId, drive_v3.Drive>();

    private getCredentials(driveId: DriveAccountId): DriveCredentials {
        const prefix = `GDRIVE_${driveId}`;
        const refreshToken = process.env[`${prefix}_REFRESH_TOKEN`];
        const folderId = process.env[`${prefix}_FOLDER_ID`];

        if (!refreshToken || !folderId) {
            throw new Error(`Drive ${driveId} credentials belum dikonfigurasi (REFRESH_TOKEN / FOLDER_ID)`);
        }

        return { refreshToken, folderId };
    }

    private getDriveClient(driveId: DriveAccountId): drive_v3.Drive {
        if (!this.driveClients.has(driveId)) {
            const creds = this.getCredentials(driveId);
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

            if (!clientId || !clientSecret) {
                throw new Error("GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET wajib diisi");
            }

            const oauth2Client = new google.auth.OAuth2(
                clientId,
                clientSecret,
                "https://developers.google.com/oauthplayground" // Standard redirect URI for refresh token setups
            );

            oauth2Client.setCredentials({
                refresh_token: creds.refreshToken,
            });

            this.driveClients.set(driveId, google.drive({ version: "v3", auth: oauth2Client }));
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
        fileSize?: number,
        origin?: string
    ): Promise<{ uploadUri: string; gdriveFileId: string }> {
        const creds = this.getCredentials(driveId);
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({
            refresh_token: creds.refreshToken,
        });

        const { token: accessToken } = await oauth2Client.getAccessToken();
        if (!accessToken) {
            throw new Error(`Gagal mendapatkan access token untuk Drive ${driveId}`);
        }

        // Step 1: Initiate resumable upload session via raw HTTP
        const metadata = JSON.stringify({
            name: fileName,
            parents: [creds.folderId],
            mimeType,
        });

        const initUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id";
        const headers: Record<string, string> = {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": mimeType,
        };
        if (fileSize) {
            headers["X-Upload-Content-Length"] = String(fileSize);
        }
        if (origin) {
            headers["Origin"] = origin;
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
                supportsAllDrives: true,
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
            await drive.files.delete({
                fileId: gdriveFileId,
                supportsAllDrives: true,
            });
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
