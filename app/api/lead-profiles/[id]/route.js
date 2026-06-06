import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { handleError } from '@/lib/errorHandler';
import { z } from 'zod';

const putSchema = z.object({
  name: z.string().trim().min(1).optional(),
  materials: z.array(z.string()).optional(),
  customLeads: z.array(z.object({
    name: z.string().trim().min(1),
    distance: z.number().min(0),
    leadCharge: z.number().min(0)
  })).optional()
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

    const updateData = {};
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.materials !== undefined) updateData.materials = validation.data.materials;
    if (validation.data.customLeads !== undefined) updateData.customLeads = validation.data.customLeads;

    const result = await db.collection("lead_profiles").updateOne(
      { id, userId: session.user.email },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Lead profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to update lead profile');
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

    const result = await db.collection("lead_profiles").deleteOne({
      id,
      userId: session.user.email
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Lead profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete lead profile');
  }
}
