"use client";
import React, { useState, useEffect } from "react";
import Tabs from "../components/Tabs";

// Helper to format currency (2 decimals)
const formatMoney = (num) => (num || 0).toFixed(2);

export default function AbstractPage() {
  const [abstractRows, setAbstractRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load and merge RA, MS, and custom abstract data
  const loadAbstract = () => {
    const raRows = localStorage.getItem("ra_rows");
    const msItems = localStorage.getItem("measurement_items");
    const customData = JSON.parse(localStorage.getItem("abstract_custom_data") || "{}");

    if (!raRows) {
      setAbstractRows([]);
      setLoading(false);
      return;
    }

    const parsedRA = JSON.parse(raRows);
    const parsedMS = msItems ? JSON.parse(msItems) : [];

    // Create a map of MS items by id for quick lookup
    const msMap = new Map();
    parsedMS.forEach((item) => {
      msMap.set(item.id, item);
    });

    // Build abstract rows in RA order
    const rows = parsedRA.map((raItem, idx) => {
      const msItem = msMap.get(raItem.id);
      const totalQty = msItem?.totalQty || 0;
      // Use netTotal (basic rate - deduct + lead + tribal)
      const rate = raItem.netTotal || raItem.netAfterDeduct || 0;
      const amount = totalQty * rate;

      // Fetch saved custom typable fields (No. and L)
      const savedCustom = customData[raItem.id] || { no: "", l: "" };

      return {
        id: raItem.id,
        srNo: idx + 1,
        description: raItem.description,
        specs: raItem.specs || "",
        no: savedCustom.no || "", // Typable No. column
        l: savedCustom.l || "",   // Typable L / R.M. column
        qty: totalQty,
        unit: raItem.unit,
        rate: rate,
        amount: amount,
      };
    });

    setAbstractRows(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadAbstract();
  }, []);

  // Handle typing in the custom columns
  const handleCustomInputChange = (id, field, value) => {
    // Update local state
    const updatedRows = abstractRows.map((row) => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });
    setAbstractRows(updatedRows);

    // Persist to localStorage
    const customData = JSON.parse(localStorage.getItem("abstract_custom_data") || "{}");
    customData[id] = { ...customData[id], [field]: value };
    localStorage.setItem("abstract_custom_data", JSON.stringify(customData));
  };

  if (loading) {
    return (
      <div className="p-4 bg-yellow-50 min-h-screen text-black">
        <Tabs />
        <div className="flex justify-center items-center h-64">Loading...</div>
      </div>
    );
  }

  const totalAmount = abstractRows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <Tabs />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Abstract of Estimate</h1>
        <button
          onClick={loadAbstract}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh from RA/MS
        </button>
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
              <tr key={row.srNo} className="hover:bg-yellow-50">
                <td className="border p-2 text-center">{row.srNo}</td>
                <td className="border p-2 text-left">{row.description}</td>
                <td className="border p-2 text-left">{row.specs}</td>
                
                {/* Typable No. Column */}
                <td className="border p-2 text-center">
                  <input
                    type="text"
                    className="w-full text-center border p-1 rounded"
                    value={row.no}
                    onChange={(e) => handleCustomInputChange(row.id, "no", e.target.value)}
                    placeholder="-"
                  />
                </td>
                
                {/* Typable L / R.M. Column */}
                <td className="border p-2 text-center">
                  <input
                    type="text"
                    className="w-full text-center border p-1 rounded"
                    value={row.l}
                    onChange={(e) => handleCustomInputChange(row.id, "l", e.target.value)}
                    placeholder="-"
                  />
                </td>

                <td className="border p-2 text-right">{row.qty.toFixed(3)}</td>
                <td className="border p-2 text-center">{row.unit}</td>
                <td className="border p-2 text-right">{formatMoney(row.rate)}</td>
                <td className="border p-2 text-right">{formatMoney(row.amount)}</td>
              </tr>
            ))}
            {abstractRows.length === 0 && (
              <tr>
                <td colSpan="9" className="border p-2 text-center text-gray-500">
                  No data. Please add items in Rate Analysis and Measurement Sheet.
                </td>
              </tr>
            )}
          </tbody>
          {abstractRows.length > 0 && (
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan="8" className="border p-2 text-right">Total Amount:</td>
                <td className="border p-2 text-right">{formatMoney(totalAmount)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}