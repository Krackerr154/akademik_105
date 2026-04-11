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
            clientEmail: boolean;
            privateKey: boolean;
            privateKeyLength: number;
            privateKeyStartsWith: string;
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
        const clientEmail = process.env[`${prefix}_CLIENT_EMAIL`] ?? "";
        const rawPrivateKey = process.env[`${prefix}_PRIVATE_KEY`] ?? "";
        const privateKey = rawPrivateKey.replace(/\\n/g, "\n");
        const folderId = process.env[`${prefix}_FOLDER_ID`] ?? "";

        const envCheck = {
            clientEmail: !!clientEmail,
            privateKey: !!rawPrivateKey,
            privateKeyLength: rawPrivateKey.length,
            privateKeyStartsWith: rawPrivateKey.substring(0, 27) + "...",
            folderId: !!folderId,
        };

        let connectionTest: (typeof results)[number]["connectionTest"];

        if (!clientEmail || !rawPrivateKey || !folderId) {
            connectionTest = {
                success: false,
                error: `Missing env vars: ${[
                    !clientEmail && `${prefix}_CLIENT_EMAIL`,
                    !rawPrivateKey && `${prefix}_PRIVATE_KEY`,
                    !folderId && `${prefix}_FOLDER_ID`,
                ].filter(Boolean).join(", ")}`,
            };
        } else {
            try {
                const { google } = await import("googleapis");
                const auth = new google.auth.GoogleAuth({
                    credentials: {
                        client_email: clientEmail,
                        private_key: privateKey,
                    },
                    scopes: ["https://www.googleapis.com/auth/drive"],
                });

                const drive = google.drive({ version: "v3", auth });
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
