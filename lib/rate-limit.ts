/**
 * In-memory sliding-window rate limiter.
 * 
 * - Per-IP: 5 requests / 60 seconds
 * - Global: 100 requests / 60 seconds
 * - Auto-cleanup of expired entries every 60 seconds
 * - Zero external dependencies
 */

const WINDOW_MS = 60_000;       // 60 seconds
const PER_IP_LIMIT = 5;
const GLOBAL_LIMIT = 100;

const ipRequests = new Map<string, number[]>();
const globalRequests: number[] = [];

// Auto-cleanup expired entries every 60s
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(() => {
        const cutoff = Date.now() - WINDOW_MS;

        // Clean IP entries
        for (const [ip, timestamps] of ipRequests.entries()) {
            const filtered = timestamps.filter((t) => t > cutoff);
            if (filtered.length === 0) {
                ipRequests.delete(ip);
            } else {
                ipRequests.set(ip, filtered);
            }
        }

        // Clean global
        while (globalRequests.length > 0 && globalRequests[0] <= cutoff) {
            globalRequests.shift();
        }

        // Stop interval if no entries (restart on next check)
        if (ipRequests.size === 0 && globalRequests.length === 0) {
            clearInterval(cleanupInterval!);
            cleanupInterval = null;
        }
    }, WINDOW_MS);
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfter: number; // seconds until next slot opens
    reason?: "ip" | "global";
}

export function checkRateLimit(ip: string): RateLimitResult {
    ensureCleanup();

    const now = Date.now();
    const cutoff = now - WINDOW_MS;

    // --- Global check ---
    // Remove expired
    while (globalRequests.length > 0 && globalRequests[0] <= cutoff) {
        globalRequests.shift();
    }

    if (globalRequests.length >= GLOBAL_LIMIT) {
        const oldestGlobal = globalRequests[0];
        const retryAfter = Math.ceil((oldestGlobal + WINDOW_MS - now) / 1000);
        return { allowed: false, remaining: 0, retryAfter, reason: "global" };
    }

    // --- Per-IP check ---
    const ipTimestamps = ipRequests.get(ip) || [];
    const validTimestamps = ipTimestamps.filter((t) => t > cutoff);

    if (validTimestamps.length >= PER_IP_LIMIT) {
        const oldestIp = validTimestamps[0];
        const retryAfter = Math.ceil((oldestIp + WINDOW_MS - now) / 1000);
        return {
            allowed: false,
            remaining: 0,
            retryAfter,
            reason: "ip",
        };
    }

    // --- Allow and record ---
    validTimestamps.push(now);
    ipRequests.set(ip, validTimestamps);
    globalRequests.push(now);

    return {
        allowed: true,
        remaining: PER_IP_LIMIT - validTimestamps.length,
        retryAfter: 0,
    };
}
