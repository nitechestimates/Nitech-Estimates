import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";
import { authOptions } from "../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb"; // ← Add this import

// Validation schema
const estimateSchema = z.object({
  nameOfWork: z.string().min(1, "Name is required"),
  rows: z.array(z.any()).optional().default([]),  // Allow empty rows
  isTribal: z.boolean().optional(),
  estimateName: z.string().optional(),
  tribalPercent: z.string().optional(),
  yojana: z.string().optional(),
  estAmount: z.string().optional(),
  labourInsurance: z.string().optional(),
  year: z.string().optional(),
  dist: z.string().optional(),
  taluka: z.string().optional(),
  village: z.string().optional(),
  headDivision: z.string().optional(),
  subDivision: z.string().optional(),
  deputyEngineer: z.string().optional(),
  jrEngineer: z.string().optional(),
  adminApprovalNo: z.string().optional(),
});

export async function POST(request) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = estimateSchema.parse(body);

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // ✅ Check if we're updating an existing estimate
    const estimateId = body.estimateId;

    if (estimateId) {
      // Attempt to update existing document
      let objectId;
      try {
        objectId = new ObjectId(estimateId);
      } catch {
        return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
      }

      // Verify ownership before update
      const existing = await db.collection("estimates").findOne({
        _id: objectId,
        userId: session.user.email,
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Estimate not found or access denied" },
          { status: 404 }
        );
      }

      // Perform update
      const updateResult = await db.collection("estimates").updateOne(
        { _id: objectId },
        {
          $set: {
            estimateName: body.estimateName || "",
            nameOfWork: data.nameOfWork.trim(),
            rows: data.rows,
            isTribal: body.isTribal || false,
            tribalPercent: body.tribalPercent || "",
            yojana: body.yojana || "",
            estAmount: body.estAmount || "",
            labourInsurance: body.labourInsurance || "",
            year: body.year || "",
            dist: body.dist || "",
            taluka: body.taluka || "",
            village: body.village || "",
            headDivision: body.headDivision || "",
            subDivision: body.subDivision || "",
            deputyEngineer: body.deputyEngineer || "",
            jrEngineer: body.jrEngineer || "",
            adminApprovalNo: body.adminApprovalNo || "",
            updatedAt: new Date(),
          },
        }
      );

      if (updateResult.modifiedCount === 0) {
        // No changes made, but still success
        return NextResponse.json({ success: true, updated: true });
      }

      return NextResponse.json({ success: true, updated: true });
    }

    // No estimateId → Insert new document
    const estimate = {
      userId: session.user.email,
      estimateName: body.estimateName || "",
      nameOfWork: data.nameOfWork.trim(),
      rows: data.rows,
      isTribal: body.isTribal || false,
      tribalPercent: body.tribalPercent || "",
      yojana: body.yojana || "",
      estAmount: body.estAmount || "",
      labourInsurance: body.labourInsurance || "",
      year: body.year || "",
      dist: body.dist || "",
      taluka: body.taluka || "",
      village: body.village || "",
      headDivision: body.headDivision || "",
      subDivision: body.subDivision || "",
      deputyEngineer: body.deputyEngineer || "",
      jrEngineer: body.jrEngineer || "",
      adminApprovalNo: body.adminApprovalNo || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("estimates").insertOne(estimate);

    return NextResponse.json({
      success: true,
      id: result.insertedId,
    });
  } catch (error) {
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