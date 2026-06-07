/**
 * Pure function performing calculations for a bill.
 * 
 * @param {Array} measurementItems - Executed quantity items
 * @param {Array} eRows - Estimate items/rows
 * @param {Object} abstractCustomData - Custom rate/reduced rate adjustments
 * @param {Array} originalMeasurementItems - Original/Tender quantity items
 * @param {number|string|null} labourInsurance - Optional manual insurance percentage
 * @returns {Object} Calculated billing figures
 */
export function calculateBilling(measurementItems = [], eRows = [], abstractCustomData = {}, originalMeasurementItems = [], labourInsurance = null) {
  const msMap = new Map(measurementItems.map(item => [item.id, item]));
  const msOrigMap = new Map(originalMeasurementItems.map(item => [item.id, item]));

  const abstractRows = eRows.map((raItem, idx) => {
    const msItem = msMap.get(raItem.id);
    const executedQty = msItem?.totalQty !== undefined ? msItem.totalQty : 0;
    
    const custom = abstractCustomData[raItem.id] || {};
    const useReducedRate = custom.useReducedRate || false;
    const reducedRateVal = custom.reducedRate !== undefined && custom.reducedRate !== "" ? parseFloat(custom.reducedRate) : null;
    
    const baseEstimateRate = raItem.netTotal || raItem.netAfterDeduct || 0;
    const customBillingRate = custom.rate !== undefined && custom.rate !== "" ? parseFloat(custom.rate) : baseEstimateRate;
    
    const activeRate = useReducedRate && reducedRateVal !== null ? reducedRateVal : customBillingRate;
    const executedAmount = executedQty * activeRate;

    const origMsItem = msOrigMap.get(raItem.id);
    const tenderQty = origMsItem?.totalQty || 0;
    const tenderRate = baseEstimateRate;
    const tenderAmount = tenderQty * tenderRate;
    
    return {
      id: raItem.id,
      srNo: idx + 1,
      ssr: raItem.ssr || "",
      description: raItem.description,
      specs: raItem.specs || "",
      unit: raItem.unit,
      isRoyalty: raItem.isRoyalty,
      tenderQty,
      tenderRate,
      tenderAmount,
      executedQty,
      executedRate: activeRate,
      executedAmount,
      useReducedRate,
      reducedRate: reducedRateVal,
      baseRate: customBillingRate,
    };
  });

  const standardRows = abstractRows.filter(r => !r.isRoyalty);
  const royaltyRows = abstractRows.filter(r => r.isRoyalty);

  const executedStandardTotal = standardRows.reduce((sum, r) => sum + r.executedAmount, 0);
  const GST_RATE = 18;
  const gstAmount = (executedStandardTotal * GST_RATE) / 100;
  
  let insuranceRate = 0.5;
  if (labourInsurance && !isNaN(parseFloat(labourInsurance))) {
    insuranceRate = parseFloat(labourInsurance);
  } else {
    insuranceRate = executedStandardTotal > 2500000 ? 1.0 : 0.5;
  }
  const insuranceAmount = (executedStandardTotal * insuranceRate) / 100;
  const executedSubtotal = executedStandardTotal + gstAmount + insuranceAmount;
  
  const executedRoyaltyTotal = royaltyRows.reduce((sum, r) => sum + r.executedAmount, 0);
  const executedGrandTotal = executedSubtotal + executedRoyaltyTotal;

  const tenderStandardTotal = standardRows.reduce((sum, r) => sum + r.tenderAmount, 0);
  const tenderGst = (tenderStandardTotal * GST_RATE) / 100;
  const tenderInsurance = (tenderStandardTotal * insuranceRate) / 100;
  const tenderSubtotal = tenderStandardTotal + tenderGst + tenderInsurance;
  const tenderRoyaltyTotal = royaltyRows.reduce((sum, r) => sum + r.tenderAmount, 0);
  const tenderGrandTotal = tenderSubtotal + tenderRoyaltyTotal;

  return {
    abstractRows,
    standardRows,
    royaltyRows,
    executedStandardTotal,
    gstAmount,
    insuranceRate,
    insuranceAmount,
    executedSubtotal,
    executedRoyaltyTotal,
    executedGrandTotal,
    tenderGrandTotal,
  };
}
