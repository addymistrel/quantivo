import { NextResponse } from "next/server";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { connectToDatabase } from "@/database/mongoose";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      fullName,
      country,
      investmentGoals,
      riskTolerance,
      preferredIndustry,
    } = body || {};
    if (
      !fullName ||
      !country ||
      !investmentGoals ||
      !riskTolerance ||
      !preferredIndustry
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, error: "DB not available" },
        { status: 500 }
      );
    }

    await db.collection("user").updateOne(
      { _id: new mongoose.mongo.ObjectId(session.user.id) },
      {
        $set: {
          name: fullName,
          country,
          investmentGoals,
          riskTolerance,
          preferredIndustry,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("complete-profile error", e);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
