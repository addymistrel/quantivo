import { auth } from "@/lib/better-auth/auth";
import { connectToDatabase } from "@/database/mongoose";

// Better Auth current build exposes a single `handler` that internally multiplexes methods.
// We intercept after it runs to apply custom Google OAuth new-user redirect logic.
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const response = await auth.handler(request);

  try {
    // Only act on successful redirects (OAuth callbacks often return 302) or JSON session responses.
    // We inspect Set-Cookie for session cookie: 'better-auth.session'.
    const setCookie = response.headers.get("set-cookie") || "";
    const isSessionSet = /better-auth\.session=/i.test(setCookie);

    if (!isSessionSet) return response; // Not a login-producing call.

    // Decode session cookie value if present to get user id/email.
    // (Cookie format: better-auth.session=<encoded JSON>; we approximate parsing.)
    const sessionMatch = setCookie.match(/better-auth\.session=([^;]+)/);
    if (!sessionMatch) return response;
    let raw = sessionMatch[1];
    try {
      raw = decodeURIComponent(raw);
    } catch {}
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {}
    const email = parsed?.session?.user?.email;
    const userId = parsed?.session?.user?.id;
    if (!email || !userId) return response;

    // Check DB for existing full user profile fields; if user record missing (race) or created via social w/out signup
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return response;
    const user = await db
      .collection("user")
      .findOne({ _id: new mongoose.mongo.ObjectId(userId) });

    if (!user) {
      // If session cookie exists but DB user doesn't (edge case), force sign-up.
      const redirect = new Response(null, {
        status: 302,
        headers: {
          Location: `/sign-up?email=${encodeURIComponent(email)}&oauth=google`,
        },
      });
      redirect.headers.append(
        "set-cookie",
        `pending_oauth_email=${encodeURIComponent(
          email
        )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`
      );
      return redirect;
    }

    // Determine if this is a 'new' social user: missing any of our profile fields we require post sign-up.
    const required = [
      "country",
      "investmentGoals",
      "riskTolerance",
      "preferredIndustry",
    ];
    const missing = required.filter((f) => !user[f]);
    if (missing.length > 0) {
      const redirect = new Response(null, {
        status: 302,
        headers: {
          Location: `/sign-up?email=${encodeURIComponent(email)}&oauth=google`,
        },
      });
      redirect.headers.append(
        "set-cookie",
        `pending_oauth_email=${encodeURIComponent(
          email
        )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`
      );
      return redirect;
    }
  } catch (e) {
    console.error("OAuth intercept logic failed", e);
    return response; // Fail open
  }

  return response;
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}
