import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";
import { authOptions } from "../../auth/[...nextauth]/route";

// ✅ Validation schema – ensures required fields exist
const estimateSchema = z.object({
  nameOfWork: z.string().min(1, "Name is required"),
  rows: z.array(z.any()).min(1, "At least one row required"),
  createdAt: z.string().optional(),   // optional on input, we'll generate a fresh date anyway
});

export async function POST(request) {
  try {
    // 🔐 Auth check
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Parse and validate the request body
    const body = await request.json();
    const data = estimateSchema.parse(body);

    // ✅ Connect to DB
    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // ✅ Build the document to insert
    const estimate = {
      userId: session.user.email,
      nameOfWork: data.nameOfWork.trim(),
      rows: data.rows,
      createdAt: new Date(),          // always use current server time
      updatedAt: new Date(),
    };

    // ✅ Insert into MongoDB
    const result = await db.collection("estimates").insertOne(estimate);

    return NextResponse.json({
      success: true,
      id: result.insertedId,
    });

  } catch (error) {
    // ✅ Handle Zod validation errors gracefully
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("SAVE ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}