import { NextResponse } from 'next/server';
import { z } from 'zod';
import leadsData from '@/lib/leads.json';
import { interpolateRate } from '@/lib/leadUtils';
import { handleError } from '@/lib/errorHandler';

const querySchema = z.object({
  material: z.string().trim().min(1, 'Material parameter is required'),
  distance: z.preprocess(
    (val) => (val === null || val === undefined ? NaN : parseFloat(val)),
    z.number().min(0, 'Distance must be a non-negative number')
  ),
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = querySchema.safeParse({
      material: searchParams.get('material'),
      distance: searchParams.get('distance'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { material, distance } = validation.data;
    const lead = interpolateRate(leadsData, material, distance);

    if (lead === null) {
      return NextResponse.json({ lead: null, message: 'Material not found or unable to calculate lead' });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return handleError(error, 'Failed to calculate lead charge');
  }
}