import { describe, it, expect } from "vitest";
import { normalize, getUnitForMaterial, interpolateRate } from "./leadUtils";

const mockLeadsData = {
  materialToGroup: {
    "Cement": "groupA",
    "Sand (fine aggregate)": "groupB"
  },
  groups: {
    groupA: {
      unit: "tonne",
      rates: {
        "5": 100,
        "10": 180,
        "20": 320
      }
    },
    groupB: {
      unit: "cum",
      rates: {
        "1": 50,
        "5": 150
      }
    }
  }
};

describe("leadUtils", () => {
  describe("normalize", () => {
    it("should clean and lowercase strings", () => {
      expect(normalize("  Cement  ")).toBe("cement");
      expect(normalize("Sand   (fine   aggregate)")).toBe("sand (fine aggregate)");
      expect(normalize(null)).toBe("");
    });
  });

  describe("getUnitForMaterial", () => {
    it("should return correct unit for matching material name", () => {
      expect(getUnitForMaterial(mockLeadsData, "Cement")).toBe("tonne");
      expect(getUnitForMaterial(mockLeadsData, "cement")).toBe("tonne");
      expect(getUnitForMaterial(mockLeadsData, "Sand (fine aggregate)")).toBe("cum");
    });

    it("should return empty string for unknown material", () => {
      expect(getUnitForMaterial(mockLeadsData, "Brick")).toBe("");
    });
  });

  describe("interpolateRate", () => {
    it("should return 0 for invalid inputs", () => {
      expect(interpolateRate(null, "Cement", 5)).toBe(0);
      expect(interpolateRate(mockLeadsData, "", 5)).toBe(0);
      expect(interpolateRate(mockLeadsData, "Cement", -1)).toBe(0);
    });

    it("should return exact rate if distance matches key", () => {
      expect(interpolateRate(mockLeadsData, "Cement", 5)).toBe(100);
      expect(interpolateRate(mockLeadsData, "Cement", 10)).toBe(180);
    });

    it("should cap at boundary values", () => {
      expect(interpolateRate(mockLeadsData, "Cement", 2)).toBe(100);
      expect(interpolateRate(mockLeadsData, "Cement", 30)).toBe(320);
    });

    it("should interpolate intermediate values", () => {
      // (10 - 5) / (10 - 5) = 1/2 of way between 100 and 180 = 140
      expect(interpolateRate(mockLeadsData, "Cement", 7.5)).toBe(140);
    });
  });
});
