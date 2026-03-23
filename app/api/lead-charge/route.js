import { NextResponse } from 'next/server';
import leadsData from '@/app/lib/leads.json';

// Normalize string: trim, lowercase, collapse multiple spaces
function normalize(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const materialParam = searchParams.get('material');
  const distance = parseFloat(searchParams.get('distance'));

  if (!materialParam || isNaN(distance)) {
    return NextResponse.json({ error: 'Missing material or distance' }, { status: 400 });
  }

  const normalizedInput = normalize(materialParam);

  // Find a matching material key
  let matchedKey = null;
  for (const key of Object.keys(leadsData)) {
    if (normalize(key) === normalizedInput) {
      matchedKey = key;
      break;
    }
  }

  if (!matchedKey) {
    return NextResponse.json({ lead: null, message: 'Material not found' });
  }

  const materialData = leadsData[matchedKey];
  const distances = Object.keys(materialData)
    .map(Number)
    .sort((a, b) => a - b);

  let lead = null;

  if (distances.includes(distance)) {
    lead = materialData[distance];
  } else {
    // Interpolate
    let lower = null, upper = null;
    for (const d of distances) {
      if (d <= distance) lower = d;
      if (d >= distance && upper === null) upper = d;
    }
    if (lower !== null && upper !== null && lower !== upper) {
      const lowerVal = materialData[lower];
      const upperVal = materialData[upper];
      const ratio = (distance - lower) / (upper - lower);
      lead = lowerVal + ratio * (upperVal - lowerVal);
    } else if (lower !== null) {
      lead = materialData[lower];
    } else if (upper !== null) {
      lead = materialData[upper];
    }
  }

  return NextResponse.json({ lead: lead !== null ? parseFloat(lead.toFixed(2)) : null });
}