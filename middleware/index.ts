import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { connectToDatabase } from "@/database/mongoose";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  // Check cookie presence - prevents obviously unauthorized users
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Skip checks for auth and static routes and completion page itself
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/_next") ||
    pathname === "/complete-profile"
  ) {
    return NextResponse.next();
  }

  try {
    // Decode session cookie (Better Auth sets JSON). Fallback if shape changes.
    let parsed: any = null;
    try {
      parsed = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      // silently ignore malformed cookie
    }
    const userId = parsed?.session?.user?.id;
    if (!userId) return NextResponse.next();

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.next();
    const user = await db
      .collection("user")
      .findOne({ _id: new mongoose.mongo.ObjectId(userId) });
    if (!user) return NextResponse.next();

    const requiredFields = [
      "country",
      "investmentGoals",
      "riskTolerance",
      "preferredIndustry",
    ];
    const missing = requiredFields.filter((f) => !user[f]);

    if (missing.length > 0) {
      const url = new URL("/complete-profile", request.url);
      url.searchParams.set("missing", missing.join(","));
      return NextResponse.redirect(url);
    }
  } catch (e) {
    // Fail open to avoid blocking legitimate users if parsing fails
    console.error("Middleware profile completion check failed", e);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|assets).*)",
  ],
};
