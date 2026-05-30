"use client";
import React from "react";
import Tabs from "../components/Tabs";
import { useStore } from "@/lib/store";

const formatMoney = (num) => (num || 0).toFixed(2);

export default function AbstractPage() {
  const raRows = useStore((state) => state.raRows);
  const raBottomRows = useStore((state) => state.raBottomRows);
  const measurementItems = useStore((state) => state.measurementItems);
  const abstractCustomData = useStore((state) => state.abstractCustomData);
  const updateAbstractCustomField = useStore((state) => state.updateAbstractCustomField);
  const labourInsurance = useStore((state) => state.labourInsurance);

  const allRaRows = [...raRows, ...raBottomRows];
  const msMap = new Map((Array.isArray(measurementItems) ? measurementItems : []).map(item => [item.id, item]));

  const abstractRows = allRaRows.map((raItem, idx) => {
    const msItem = msMap.get(raItem.id);
    const totalQty = msItem?.totalQty || 0;
    const rate = raItem.netTotal || raItem.netAfterDeduct || 0;
    const amount = totalQty * rate;
    const custom = abstractCustomData[raItem.id] || { no: "", l: "" };
    return {
      id: raItem.id,
      srNo: idx + 1,
      description: raItem.description,
      specs: raItem.specs || "",
      no: custom.no || "",
      l: custom.l || "",
      qty: totalQty,
      unit: raItem.unit,
      rate,
      amount,
      isRoyalty: raItem.isRoyalty
    };
  });

  const standardRows = abstractRows.filter(r => !r.isRoyalty);
  const royaltyRows = abstractRows.filter(r => r.isRoyalty);

  const standardTotal = standardRows.reduce((sum, r) => sum + r.amount, 0);
  const gstAmount = (standardTotal * 18) / 100;
  const insuranceRate = labourInsurance && !isNaN(parseFloat(labourInsurance))
    ? parseFloat(labourInsurance)
    : (standardTotal > 2500000 ? 1.0 : 0.5);
  const insuranceAmount = (standardTotal * insuranceRate) / 100;
  const subTotalWithTax = standardTotal + gstAmount + insuranceAmount;
  const royaltyTotal = royaltyRows.reduce((sum, r) => sum + r.amount, 0);
  const grandTotal = subTotalWithTax + royaltyTotal;

  if (allRaRows.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 min-h-screen text-black">
        <Tabs />
        <div className="text-center text-gray-500 mt-20">No items in Rate Analysis. Add items first.</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <Tabs />
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Abstract of Estimate</h1>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border text-sm bg-white">
          <thead className="bg-gray-200">
            <tr className="text-center font-bold">
              <th className="border p-2">Sr. No.</th>
              <th className="border p-2 w-[450px]">DESCRIPTION OF ITEM</th>
              <th className="border p-2 w-[250px]">SPECIFICATIONS</th>
              <th className="border p-2">QTY</th>
              <th className="border p-2">UNIT</th>
              <th className="border p-2">RATE (Rs.)</th>
              <th className="border p-2">AMOUNT (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {standardRows.map((row) => (
              <tr key={row.id} className="hover:bg-yellow-50">
                <td className="border p-2 text-center font-semibold text-gray-700">{row.srNo}</td>
                <td className="border p-2 text-left">{row.description}</td>
                <td className="border p-2 text-left">{row.specs}</td>
                <td className="border p-2 text-right">{row.qty.toFixed(3)}</td>
                <td className="border p-2 text-center">{row.unit}</td>
                <td className="border p-2 text-right">{formatMoney(row.rate)}</td>
                <td className="border p-2 text-right">{formatMoney(row.amount)}</td>
              </tr>
            ))}

            {/* Standard Items subtotal */}
            <tr className="bg-gray-50 font-bold text-gray-800 border-t-2 border-gray-300">
              <td colSpan="6" className="border p-2 text-right uppercase tracking-wider text-[11px]">TOTAL (Cost of work proper):</td>
              <td className="border p-2 text-right">{formatMoney(standardTotal)}</td>
            </tr>

            {/* Add For GST */}
            <tr className="bg-blue-50/10 text-blue-950 font-bold text-[13px]">
              <td colSpan="3" className="border p-2 text-right">Add For GST</td>
              <td className="border p-2 text-center">18.00 %</td>
              <td colSpan="2" className="border"></td>
              <td className="border p-2 text-right">{formatMoney(gstAmount)}</td>
            </tr>

            {/* Add Labour Insurance */}
            <tr className="bg-blue-50/10 text-blue-950 font-bold text-[13px]">
              <td colSpan="3" className="border p-2 text-right">Add Labour Insurance</td>
              <td className="border p-2 text-center">{insuranceRate.toFixed(2)} %</td>
              <td colSpan="2" className="border"></td>
              <td className="border p-2 text-right">{formatMoney(insuranceAmount)}</td>
            </tr>

            {/* Subtotal with taxes */}
            <tr className="bg-gray-100 font-bold text-gray-800 border-t border-b border-gray-300">
              <td colSpan="6" className="border p-2 text-right uppercase tracking-wider text-[11px]">TOTAL:</td>
              <td className="border p-2 text-right">{formatMoney(subTotalWithTax)}</td>
            </tr>

            {/* Royalty & Lab charges rows */}
            {royaltyRows.map((row) => (
              <tr key={row.id} className="bg-blue-50/5 hover:bg-yellow-50 group font-semibold text-blue-950">
                <td className="border p-2 text-center">{row.srNo}</td>
                <td className="border p-2 text-left">{row.description}</td>
                <td className="border p-2 text-left">{row.specs}</td>
                <td className="border p-2 text-right">{row.qty.toFixed(3)}</td>
                <td className="border p-2 text-center">{row.unit}</td>
                <td className="border p-2 text-right">{formatMoney(row.rate)}</td>
                <td className="border p-2 text-right">{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-250 font-black text-blue-950 border-t-2 border-gray-400">
            <tr className="bg-gray-200 text-[14px]">
              <td colSpan="6" className="border p-2.5 text-right uppercase tracking-wider font-extrabold text-blue-950">TOTAL RS. (Grand Total):</td>
              <td className="border p-2.5 text-right font-black text-blue-950">{formatMoney(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}