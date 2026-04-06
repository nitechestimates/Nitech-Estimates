import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // ✅ Only fetch this user's data + projection (IMPORTANT)
    const estimates = await db
      .collection("estimates")
      .find(
        { userId: session.user.email },
        {
          projection: {
            nameOfWork: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 }) // latest first
      .toArray();

    return NextResponse.json(estimates);

  } catch (error) {
    console.error("FETCH ERROR:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}