// Normalize string: trim, lowercase, collapse multiple spaces
export function normalize(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getUnitForMaterial(leadsData, materialName) {
  if (!leadsData || !materialName) return '';
  const normalizedInput = normalize(materialName);
  let matchedKey = null;
  for (const key of Object.keys(leadsData.materialToGroup || {})) {
    if (normalize(key) === normalizedInput) {
      matchedKey = key;
      break;
    }
  }
  if (!matchedKey) return '';
  const groupKey = leadsData.materialToGroup[matchedKey];
  return leadsData.groups?.[groupKey]?.unit || "";
}

export function interpolateRate(leadsData, materialParam, distance) {
  if (!leadsData || !materialParam || isNaN(distance) || distance <= 0) {
    return 0;
  }

  const normalizedInput = normalize(materialParam);

  // Find a matching material key in materialToGroup
  let matchedKey = null;
  for (const key of Object.keys(leadsData.materialToGroup || {})) {
    if (normalize(key) === normalizedInput) {
      matchedKey = key;
      break;
    }
  }

  if (!matchedKey) {
    return 0;
  }

  const groupKey = leadsData.materialToGroup[matchedKey];
  const group = leadsData.groups?.[groupKey];
  if (!group || !group.rates) {
    return 0;
  }

  const rates = group.rates;
  const entries = Object.entries(rates)
    .map(([k, v]) => [parseFloat(k), v])
    .sort((a, b) => a[0] - b[0]);

  if (!entries.length) return 0;
  if (distance <= entries[0][0]) return entries[0][1];
  if (distance >= entries[entries.length - 1][0]) return entries[entries.length - 1][1];

  for (let i = 0; i < entries.length - 1; i++) {
    const [k0, v0] = entries[i];
    const [k1, v1] = entries[i + 1];
    if (distance >= k0 && distance <= k1) {
      const t = (distance - k0) / (k1 - k0);
      return parseFloat((v0 + t * (v1 - v0)).toFixed(2));
    }
  }

  return 0;
}
