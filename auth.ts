import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const allowedEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
        }),
    ],
    pages: {
        signIn: "/admin",
    },
    callbacks: {
        async signIn({ user }) {
            // "*" means allow anyone (dev mode)
            if (allowedEmails.includes("*")) return true;
            const email = user.email?.toLowerCase();
            if (!email) return false;
            return allowedEmails.includes(email);
        },
        async jwt({ token, user, profile }) {
            if (user) {
                token.role = "admin";
                token.picture = (profile as any)?.avatar_url || user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                session.user.image = token.picture as string;
            }
            return session;
        },
    },
    session: { strategy: "jwt" },
});
