import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function GET() {
    try {
        const allSettings = await db.select().from(systemSettings);

        // Transform array to object for frontend
        const settingsObject: Record<string, any> = {};
        allSettings.forEach((setting) => {
            settingsObject[setting.key] = setting.value;
        });

        return NextResponse.json({ settings: settingsObject });
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { settings } = body;

        // We process each key-value pair and upsert it
        // In a real high-traffic scenario, we might want to bulk upsert or optimize this
        // But for admin settings, sequential processing is fine and safer for logic
        const updates = Object.entries(settings).map(async ([key, value]) => {
            // Determine category based on key prefix or manual mapping
            // For simplicity, we'll default to 'general' if not found, 
            // or we can rely on existing keys if we want to be strict.
            // Here we blindly upsert.

            let category = "general";
            if (key.startsWith("default")) category = "exam";
            if (["allowMultipleSubmissions", "enableDuplicateDetection", "autoCalculateRanks"].includes(key)) category = "submission";
            if (["maxRetries", "requestTimeout", "enableMockParser"].includes(key)) category = "parsing";
            if (["rankingMethod", "percentileMethod"].includes(key)) category = "calculation";
            if (["enableCache", "cacheDuration"].includes(key)) category = "performance";
            if (["sessionTimeout", "enableTwoFactor"].includes(key)) category = "security";

            return db
                .insert(systemSettings)
                .values({
                    key,
                    value: value as any,
                    category,
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: systemSettings.key,
                    set: {
                        value: value as any,
                        updatedAt: new Date(),
                    },
                });
        });

        await Promise.all(updates);

        // Revalidate cache if needed
        revalidatePath("/admin/settings");

        return NextResponse.json({ success: true, message: "Settings updated successfully" });
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
