import { describe, it, expect } from "vitest";
import { calculateBilling } from "./billingMath";

describe("calculateBilling", () => {
  const sampleEstimateRows = [
    { id: "item1", netTotal: 100, isRoyalty: false, description: "Standard excavation", unit: "cum" },
    { id: "item2", netTotal: 250, isRoyalty: false, description: "Concrete work", unit: "cum" },
    { id: "item3", netTotal: 50, isRoyalty: true, description: "Royalty fee", unit: "ton" }
  ];

  const sampleOriginalMeasurement = [
    { id: "item1", totalQty: 10 },
    { id: "item2", totalQty: 20 },
    { id: "item3", totalQty: 5 }
  ];

  it("should calculate correct standard totals, GST, and default insurance (0.5% for <= 25L)", () => {
    const executedMeasurement = [
      { id: "item1", totalQty: 10 }, // standard: 10 * 100 = 1000
      { id: "item2", totalQty: 20 }, // standard: 20 * 250 = 5000
      { id: "item3", totalQty: 5 }   // royalty: 5 * 50 = 250
    ];

    const result = calculateBilling(
      executedMeasurement,
      sampleEstimateRows,
      {},
      sampleOriginalMeasurement
    );

    // executedStandardTotal = 1000 + 5000 = 6000
    expect(result.executedStandardTotal).toBe(6000);
    // GST = 18% of 6000 = 1080
    expect(result.gstAmount).toBe(1080);
    // insuranceRate <= 2,500,000 should be 0.5%
    expect(result.insuranceRate).toBe(0.5);
    // insuranceAmount = 0.5% of 6000 = 30
    expect(result.insuranceAmount).toBe(30);
    // executedSubtotal = 6000 (standard) + 1080 (gst) + 30 (insurance) = 7110
    expect(result.executedSubtotal).toBe(7110);
    // executedRoyaltyTotal = 250
    expect(result.executedRoyaltyTotal).toBe(250);
    // executedGrandTotal = 7110 + 250 = 7360
    expect(result.executedGrandTotal).toBe(7360);
  });

  it("should auto-apply 1.0% insurance rate when standard subtotal exceeds 25L", () => {
    const executedMeasurement = [
      { id: "item1", totalQty: 30000 }, // standard: 30000 * 100 = 3,000,000
      { id: "item2", totalQty: 0 },
      { id: "item3", totalQty: 0 }
    ];

    const result = calculateBilling(
      executedMeasurement,
      sampleEstimateRows,
      {},
      sampleOriginalMeasurement
    );

    // standard total is 3,000,000 (> 2,500,000)
    expect(result.executedStandardTotal).toBe(3000000);
    expect(result.insuranceRate).toBe(1.0);
    expect(result.insuranceAmount).toBe(30000); // 1.0% of 3M
  });

  it("should respect manual labourInsurance rate override", () => {
    const executedMeasurement = [
      { id: "item1", totalQty: 10 }, // standard: 1000
      { id: "item2", totalQty: 20 }, // standard: 5000
      { id: "item3", totalQty: 0 }
    ];

    const result = calculateBilling(
      executedMeasurement,
      sampleEstimateRows,
      {},
      sampleOriginalMeasurement,
      "1.5" // Manual insurance rate override (1.5%)
    );

    expect(result.executedStandardTotal).toBe(6000);
    expect(result.insuranceRate).toBe(1.5);
    expect(result.insuranceAmount).toBe(90); // 1.5% of 6000
  });

  it("should support custom billing rates and reduced rate overrides", () => {
    const executedMeasurement = [
      { id: "item1", totalQty: 10 },
      { id: "item2", totalQty: 20 },
      { id: "item3", totalQty: 0 }
    ];

    // Override item1 to custom rate 120 and item2 to use a reduced rate of 200
    const customData = {
      item1: { rate: "120" },
      item2: { useReducedRate: true, reducedRate: "200" }
    };

    const result = calculateBilling(
      executedMeasurement,
      sampleEstimateRows,
      customData,
      sampleOriginalMeasurement
    );

    // item1 amount: 10 * 120 = 1200
    // item2 amount: 20 * 200 = 4000
    // Total standard: 1200 + 4000 = 5200
    expect(result.executedStandardTotal).toBe(5200);
    expect(result.abstractRows[0].executedRate).toBe(120);
    expect(result.abstractRows[1].executedRate).toBe(200);
  });
});
