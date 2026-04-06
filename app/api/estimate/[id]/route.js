import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // ✅ Fixed path using absolute alias

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const estimate = await db.collection("estimates").findOne({
      _id: new ObjectId(id),
      userId: session.user.email,
    });

    if (!estimate) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: estimate,
    });

  } catch (error) {
    console.error("GET ONE ERROR:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const result = await db.collection("estimates").deleteOne({
      _id: new ObjectId(id),
      userId: session.user.email,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("DELETE ERROR:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}