import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hasMinRole } from "@/types";

/**
 * GET /api/admin/drives/diagnostic — Superadmin-only endpoint
 * Shows Drive credential diagnostics WITHOUT exposing secrets.
 * Attempts to connect to each Drive and reports the exact error if any.
 */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { role?: string; status?: string };
    if (user.status !== "active" || !hasMinRole(user.role ?? "", "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const driveIds = ["A", "B"] as const;
    const results: Array<{
        driveId: string;
        envCheck: {
            refreshToken: boolean;
            refreshTokenLength: number;
            refreshTokenStartsWith: string;
            folderId: boolean;
        };
        connectionTest: {
            success: boolean;
            error?: string;
            storageQuota?: {
                usage?: string;
                usageInDrive?: string;
                limit?: string;
            };
        };
    }> = [];

    for (const driveId of driveIds) {
        const prefix = `GDRIVE_${driveId}`;
        const refreshToken = process.env[`${prefix}_REFRESH_TOKEN`] ?? "";
        const folderId = process.env[`${prefix}_FOLDER_ID`] ?? "";

        const envCheck = {
            refreshToken: !!refreshToken,
            refreshTokenLength: refreshToken.length,
            refreshTokenStartsWith: refreshToken.substring(0, 15) + "...",
            folderId: !!folderId,
        };

        let connectionTest: (typeof results)[number]["connectionTest"];

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!refreshToken || !folderId || !clientId || !clientSecret) {
            connectionTest = {
                success: false,
                error: `Missing env vars: ${[
                    !refreshToken && `${prefix}_REFRESH_TOKEN`,
                    !folderId && `${prefix}_FOLDER_ID`,
                    !clientId && `GOOGLE_CLIENT_ID`,
                    !clientSecret && `GOOGLE_CLIENT_SECRET`,
                ].filter(Boolean).join(", ")}`,
            };
        } else {
            try {
                const { google } = await import("googleapis");
                const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
                oauth2Client.setCredentials({ refresh_token: refreshToken });

                const drive = google.drive({ version: "v3", auth: oauth2Client });
                const response = await drive.about.get({
                    fields: "storageQuota",
                });

                connectionTest = {
                    success: true,
                    storageQuota: {
                        usage: response.data.storageQuota?.usage,
                        usageInDrive: response.data.storageQuota?.usageInDrive,
                        limit: response.data.storageQuota?.limit,
                    },
                };
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                connectionTest = {
                    success: false,
                    error: errMsg.substring(0, 500),
                };
            }
        }

        results.push({ driveId, envCheck, connectionTest });
    }

    return NextResponse.json({ diagnostics: results });
}
