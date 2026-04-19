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

  const allRaRows = [...raRows, ...raBottomRows];
  const msMap = new Map(measurementItems.map(item => [item.id, item]));

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
    };
  });

  const totalAmount = abstractRows.reduce((sum, r) => sum + r.amount, 0);

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
            <tr className="text-center">
              <th className="border p-2">Sr. No.</th>
              <th className="border p-2 w-[350px]">DESCRIPTION OF ITEM</th>
              <th className="border p-2 w-[200px]">SPECIFICATIONS</th>
              <th className="border p-2 w-[80px]">No.</th>
              <th className="border p-2 w-[100px]">L (R.M.)</th>
              <th className="border p-2">QTY</th>
              <th className="border p-2">UNIT</th>
              <th className="border p-2">RATE (Rs.)</th>
              <th className="border p-2">AMOUNT (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {abstractRows.map((row) => (
              <tr key={row.id} className="hover:bg-yellow-50">
                <td className="border p-2 text-center">{row.srNo}</td>
                <td className="border p-2 text-left">{row.description}</td>
                <td className="border p-2 text-left">{row.specs}</td>
                <td className="border p-2 text-center">
                  <input
                    type="text"
                    className="w-full text-center border p-1 rounded"
                    value={row.no}
                    onChange={(e) => updateAbstractCustomField(row.id, "no", e.target.value)}
                    placeholder="-"
                  />
                </td>
                <td className="border p-2 text-center">
                  <input
                    type="text"
                    className="w-full text-center border p-1 rounded"
                    value={row.l}
                    onChange={(e) => updateAbstractCustomField(row.id, "l", e.target.value)}
                    placeholder="-"
                  />
                </td>
                <td className="border p-2 text-right">{row.qty.toFixed(3)}</td>
                <td className="border p-2 text-center">{row.unit}</td>
                <td className="border p-2 text-right">{formatMoney(row.rate)}</td>
                <td className="border p-2 text-right">{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold">
            <tr>
              <td colSpan="8" className="border p-2 text-right">Total Amount:</td>
              <td className="border p-2 text-right">{formatMoney(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}