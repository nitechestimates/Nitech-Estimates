import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { handleError } from '@/lib/errorHandler';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const putSchema = z.object({
  description: z.string().trim().min(1).optional(),
  quantity: z.number().optional(),
  unit: z.string().trim().min(1).optional(),
  date: z.preprocess((val) => val ? new Date(val) : undefined, z.date().optional())
});

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = putSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const query = { userId: session.user.email };
    if (ObjectId.isValid(id)) {
      query._id = new ObjectId(id);
    } else {
      query.itemId = id;
    }

    const updateData = {};
    if (validation.data.description !== undefined) updateData.description = validation.data.description;
    if (validation.data.quantity !== undefined) updateData.quantity = validation.data.quantity;
    if (validation.data.unit !== undefined) updateData.unit = validation.data.unit;
    if (validation.data.date !== undefined) updateData.date = validation.data.date;

    const result = await db.collection("mb_records").updateOne(query, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'MB record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to update MB record');
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const query = { userId: session.user.email };
    if (ObjectId.isValid(id)) {
      query._id = new ObjectId(id);
    } else {
      query.itemId = id;
    }

    const result = await db.collection("mb_records").deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'MB record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete MB record');
  }
}
