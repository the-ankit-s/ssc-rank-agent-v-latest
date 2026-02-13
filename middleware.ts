import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const { pathname } = req.nextUrl;

    // Allow the login page itself
    if (pathname === "/admin") return NextResponse.next();

    // Allow Auth.js API routes
    if (pathname.startsWith("/api/auth")) return NextResponse.next();

    // Everything under /admin/* and /api/admin/* requires auth
    const isAdminRoute = pathname.startsWith("/admin/") || pathname.startsWith("/api/admin");

    if (isAdminRoute && !req.auth) {
        // API routes → 401
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Page routes → redirect to login
        return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*", "/api/auth/:path*"],
};
