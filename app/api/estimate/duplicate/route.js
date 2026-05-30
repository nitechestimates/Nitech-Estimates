import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Estimate ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");
    const estimatesCollection = db.collection("estimates");

    const originalEstimate = await estimatesCollection.findOne({
      _id: new ObjectId(id),
      userId: session.user.email,
    });

    if (!originalEstimate) {
      return NextResponse.json({ error: "Estimate not found or access denied" }, { status: 404 });
    }

    // Create duplicate
    const duplicateEstimate = { ...originalEstimate };
    delete duplicateEstimate._id;
    
    // Append (Copy) to names to distinguish them
    if (duplicateEstimate.estimateName) {
      duplicateEstimate.estimateName += " (Copy)";
    }
    if (duplicateEstimate.nameOfWork) {
      duplicateEstimate.nameOfWork += " (Copy)";
    }
    
    // Reset timestamps
    duplicateEstimate.createdAt = new Date();
    duplicateEstimate.updatedAt = new Date();

    const result = await estimatesCollection.insertOne(duplicateEstimate);

    return NextResponse.json({
      success: true,
      id: result.insertedId,
      message: "Estimate duplicated successfully"
    });
  } catch (error) {
    console.error("DUPLICATE ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
