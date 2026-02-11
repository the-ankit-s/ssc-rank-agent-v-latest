import { NextRequest, NextResponse } from "next/server";
import { login, logout } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const success = await login(formData);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    await logout();
    return NextResponse.json({ success: true });
}
