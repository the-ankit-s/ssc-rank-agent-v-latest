import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET_KEY || "your-secret-key-at-least-32-chars-long";
const key = new TextEncoder().encode(SECRET_KEY);

export async function middleware(request: NextRequest) {
    // Only run on /admin and /api/admin routes
    if (!request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/api/admin")) {
        return NextResponse.next();
    }

    // Exclude login page and auth API
    if (
        request.nextUrl.pathname === "/admin" ||
        request.nextUrl.pathname === "/api/admin/auth"
    ) {
        return NextResponse.next();
    }

    const session = request.cookies.get("admin_session")?.value;

    if (!session) {
        // If it's an API request, return 401
        if (request.nextUrl.pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Otherwise redirect to login
        return NextResponse.redirect(new URL("/admin", request.url));
    }

    try {
        // Verify JWT
        await jwtVerify(session, key, {
            algorithms: ["HS256"],
        });
        return NextResponse.next();
    } catch (error) {
        // If invalid, clear cookie and redirect/error
        const response = request.nextUrl.pathname.startsWith("/api/")
            ? NextResponse.json({ error: "Invalid session" }, { status: 401 })
            : NextResponse.redirect(new URL("/admin", request.url));

        response.cookies.delete("admin_session");
        return response;
    }
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
