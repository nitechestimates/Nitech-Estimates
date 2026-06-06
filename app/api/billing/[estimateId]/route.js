import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { handleError } from "@/lib/errorHandler";
import { z } from "zod";

const postSchema = z.object({
  measurementItems: z.array(z.any()).max(1000).optional(),
  abstractCustomData: z.record(z.any()).optional(),
  nameOfWork: z.string().trim().optional(),
  yojana: z.string().trim().optional(),
  estAmount: z.string().trim().optional(),
  year: z.string().trim().optional(),
  dist: z.string().trim().optional(),
  taluka: z.string().trim().optional(),
  village: z.string().trim().optional(),
  headDivision: z.string().trim().optional(),
  subDivision: z.string().trim().optional(),
  deputyEngineer: z.string().trim().optional(),
  jrEngineer: z.string().trim().optional(),
  adminApprovalNo: z.string().trim().optional()
});

const putSchema = z.object({
  measurementItems: z.array(z.any()).max(1000),
  abstractCustomData: z.record(z.any()),
  extraBillingData: z.record(z.any())
});

// GET: Retrieve billing for an estimate
export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { estimateId } = await context.params;
    if (!ObjectId.isValid(estimateId)) {
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const billing = await db.collection("billings").findOne({
      estimateId: new ObjectId(estimateId),
      userId: session.user.email,
    });

    if (!billing) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    return NextResponse.json({ success: true, exists: true, data: billing });
  } catch (error) {
    return handleError(error, "Failed to retrieve billing");
  }
}

// POST: Finalize estimate & initialize billing
export async function POST(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { estimateId } = await context.params;
    if (!ObjectId.isValid(estimateId)) {
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const body = await request.json();
    const validation = postSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { 
      measurementItems, 
      abstractCustomData, 
      nameOfWork, 
      yojana, 
      estAmount, 
      year, 
      dist, 
      taluka, 
      village, 
      headDivision, 
      subDivision, 
      deputyEngineer, 
      jrEngineer, 
      adminApprovalNo 
    } = validation.data;

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // Check if billing already exists
    const existing = await db.collection("billings").findOne({
      estimateId: new ObjectId(estimateId),
      userId: session.user.email,
    });

    if (existing) {
      return NextResponse.json({ error: "Billing already exists" }, { status: 409 });
    }

    // Default extra billing data from estimate
    const extraBillingData = {
      agencyName: "",
      agreementRef: "",
      date: new Date().toLocaleDateString("en-GB"),
      commenceDate: "",
      dueDate: "",
      extensions: "",
      completionDate: "",
      purposeOfSupply: "Work in Done",
      serialNo: "I ST & Final Bill",
      // SD Details
      sdAsPerAgreement: "",
      sdPreviouslyRecovered: "0",
      sdToBeRecovered: "0",
      sdBalanceToRecover: "0",
      // Certificates
      sectionalEngineerName: jrEngineer || "",
      deputyEngineerName: deputyEngineer || "",
      certifiedDate: new Date().toLocaleDateString("en-GB"),
      deductPreviousBill: "0",
      notes: "",
      workPhoto: "",
      // Head division metadata
      nameOfWork: nameOfWork || "",
      yojana: yojana || "",
      estAmount: estAmount || "",
      year: year || "",
      dist: dist || "",
      taluka: taluka || "",
      village: village || "",
      headDivision: headDivision || "",
      subDivision: subDivision || "",
      deputyEngineer: deputyEngineer || "",
      jrEngineer: jrEngineer || "",
      adminApprovalNo: adminApprovalNo || "",
    };

    // Store absolute copy of original measurements and abstract rates
    const billingDoc = {
      estimateId: new ObjectId(estimateId),
      userId: session.user.email,
      measurementItems: measurementItems || [],
      originalMeasurementItems: measurementItems ? JSON.parse(JSON.stringify(measurementItems)) : [],
      abstractCustomData: abstractCustomData || {},
      extraBillingData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("billings").insertOne(billingDoc);

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    return handleError(error, "Failed to create billing");
  }
}

// PUT: Save updated billing measurements, abstract rates, and form fields
export async function PUT(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { estimateId } = await context.params;
    if (!ObjectId.isValid(estimateId)) {
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const body = await request.json();
    const validation = putSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { measurementItems, abstractCustomData, extraBillingData } = validation.data;

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const result = await db.collection("billings").updateOne(
      { estimateId: new ObjectId(estimateId), userId: session.user.email },
      {
        $set: {
          measurementItems: measurementItems || [],
          abstractCustomData: abstractCustomData || {},
          extraBillingData: extraBillingData || {},
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Billing not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to update billing");
  }
}

// DELETE: Remove billing document (for regeneration flow)
export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { estimateId } = await context.params;
    if (!ObjectId.isValid(estimateId)) {
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const result = await db.collection("billings").deleteOne({
      estimateId: new ObjectId(estimateId),
      userId: session.user.email,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Billing not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to delete billing");
  }
}
