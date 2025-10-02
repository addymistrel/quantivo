import { NextRequest, NextResponse } from "next/server";
import { Alert } from "@/database/models/alert.model";
import { connectToDatabase } from "@/database/mongoose";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const { symbol, company, alertType, threshold } = body as {
      symbol?: string;
      company?: string;
      alertType?: "upper" | "lower";
      threshold?: number;
    };
    if (!symbol || !company || !alertType || typeof threshold !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 }
      );
    }
    await connectToDatabase();
    const alert = await Alert.create({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company,
      alertType,
      threshold,
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true, alert });
  } catch (e: any) {
    console.error("Create alert error", e);
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
