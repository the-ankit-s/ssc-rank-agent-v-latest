import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET_KEY || "your-secret-key-at-least-32-chars-long";
const key = new TextEncoder().encode(SECRET_KEY);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function login(formData: FormData) {
  // Verify credentials
  const email = formData.get("email");
  const password = formData.get("password");

  // TODO: Check against database
  if (email === "admin@rankifyai.com" && password === "admin123") {
    // Create session
    const user = { email, name: "Admin User", role: "admin" };
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const session = await encrypt({ user, expires });

    // Save session in a cookie
    const cookieStore = await cookies();
    cookieStore.set("admin_session", session, { expires, httpOnly: true });
    return true;
  }
  return false;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set("admin_session", "", { expires: new Date(0) });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!session) return null;
  return await decrypt(session);
}
