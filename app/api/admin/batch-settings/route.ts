import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Default batch processing settings
const DEFAULTS: Record<string, unknown> = {
    batch_norm_mode: "both",              // "scheduled" | "threshold" | "both"
    batch_norm_schedule: "0 2 * * *",     // Daily at 2 AM
    batch_norm_min_submissions: 50,       // Trigger when 50+ pending
    batch_norm_time_window: { start: "00:00", end: "06:00" },
    batch_norm_enabled: true,             // Master switch
    result_poll_interval_ms: 21600000,    // 6 hours — how often result page polls
};

const SETTING_KEYS = Object.keys(DEFAULTS);
const CATEGORY = "batch_processing";

/**
 * GET /api/admin/batch-settings
 * Returns current batch processing settings (fills defaults for missing keys)
 */
export async function GET() {
    try {
        const rows = await db
            .select({ key: systemSettings.key, value: systemSettings.value })
            .from(systemSettings)
            .where(eq(systemSettings.category, CATEGORY));

        const settings: Record<string, unknown> = { ...DEFAULTS };
        for (const row of rows) {
            settings[row.key] = row.value;
        }

        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error fetching batch settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

/**
 * PUT /api/admin/batch-settings
 * Update batch processing settings
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { settings } = body as { settings: Record<string, unknown> };

        if (!settings || typeof settings !== "object") {
            return NextResponse.json({ error: "Missing 'settings' object" }, { status: 400 });
        }

        // Validate keys
        const invalidKeys = Object.keys(settings).filter((k) => !SETTING_KEYS.includes(k));
        if (invalidKeys.length > 0) {
            return NextResponse.json(
                { error: `Invalid setting keys: ${invalidKeys.join(", ")}` },
                { status: 400 }
            );
        }

        // Validate types
        if (settings.batch_norm_mode !== undefined) {
            const valid = ["scheduled", "threshold", "both"];
            if (!valid.includes(settings.batch_norm_mode as string)) {
                return NextResponse.json(
                    { error: `batch_norm_mode must be one of: ${valid.join(", ")}` },
                    { status: 400 }
                );
            }
        }

        if (settings.batch_norm_min_submissions !== undefined) {
            const val = Number(settings.batch_norm_min_submissions);
            if (isNaN(val) || val < 1 || val > 10000) {
                return NextResponse.json(
                    { error: "batch_norm_min_submissions must be 1-10000" },
                    { status: 400 }
                );
            }
        }

        // Upsert each setting
        for (const [key, value] of Object.entries(settings)) {
            await db
                .insert(systemSettings)
                .values({
                    key,
                    value: value as any,
                    category: CATEGORY,
                    description: getDescription(key),
                })
                .onConflictDoUpdate({
                    target: systemSettings.key,
                    set: {
                        value: value as any,
                        updatedAt: new Date(),
                    },
                });
        }

        // Return updated settings
        const rows = await db
            .select({ key: systemSettings.key, value: systemSettings.value })
            .from(systemSettings)
            .where(eq(systemSettings.category, CATEGORY));

        const updatedSettings: Record<string, unknown> = { ...DEFAULTS };
        for (const row of rows) {
            updatedSettings[row.key] = row.value;
        }

        return NextResponse.json({ settings: updatedSettings, message: "Settings updated" });
    } catch (error) {
        console.error("Error updating batch settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}

function getDescription(key: string): string {
    const descriptions: Record<string, string> = {
        batch_norm_mode: "Trigger mode: scheduled, threshold, or both",
        batch_norm_schedule: "Cron expression for scheduled batch runs",
        batch_norm_min_submissions: "Minimum pending submissions to trigger auto-batch",
        batch_norm_time_window: "Time window (IST) during which auto-batches may run",
        batch_norm_enabled: "Master switch for automatic batch processing",
        result_poll_interval_ms: "How often (ms) the result page auto-refreshes while pending",
    };
    return descriptions[key] || key;
}
