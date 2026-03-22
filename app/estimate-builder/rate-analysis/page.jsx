"use client";
import { useState } from "react";

export default function RateAnalysisPage() {
  const [nameOfWork, setNameOfWork] = useState("");
  const [rows, setRows] = useState([]);
  const [itemCode, setItemCode] = useState("");

  // 🔹 Add Item (API fetch + correct mapping)
  const addItem = async () => {
    if (!itemCode) return;

    try {
      const res = await fetch(`/api/get-item?code=${itemCode}`);
      const data = await res.json();

      console.log(data); // 🔍 debug (optional)

      const newRow = {
        srNo: rows.length + 1,
        ssr: itemCode,

        // ✅ FIXED mapping (important)
        description: data["Description of the item"] || "",
        unit: data["Unit"] || "",
        basicRate: data["Completed Rate"] || 0,
        specs: data["Additional Specification"] || "",

        deduct: 0,
        netAfterDeduct: 0,
        materialType: "",
        qty: 0,
        lead: 0,
        totalLead: 0,
        total: 0,
        tribal: 0,
        netTotal: 0,
      };

      setRows((prev) => [...prev, newRow]);
      setItemCode("");
    } catch (err) {
      console.error("Error fetching item:", err);
    }
  };

  // 🔹 Calculation
  const calculateRow = (row) => {
    const netAfterDeduct = row.basicRate - row.deduct;
    const totalLead = row.qty * row.lead;
    const total = netAfterDeduct + totalLead;
    const netTotal = total + row.tribal;

    return {
      ...row,
      netAfterDeduct,
      totalLead,
      total,
      netTotal,
    };
  };

  // 🔹 Update Row
  const updateRow = (index, field, value) => {
    const updated = [...rows];

    updated[index][field] = Number(value);
    updated[index] = calculateRow(updated[index]);

    setRows(updated);
  };

  return (
    <div className="p-6 bg-yellow-50 min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-4">Rate Analysis</h1>

      {/* Name of Work */}
      <input
        className="border border-black p-2 w-full mb-4 bg-white text-black"
        placeholder="Name of Work"
        value={nameOfWork}
        onChange={(e) => setNameOfWork(e.target.value)}
      />

      {/* ➕ Add Item */}
      <div className="flex gap-2 mb-4">
        <input
          className="border border-black p-2 bg-white text-black"
          placeholder="Enter SSR Item No (e.g. 2.11)"
          value={itemCode}
          onChange={(e) => setItemCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addItem();
            }
          }}
        />

        <button
          onClick={addItem}
          className="bg-black text-white px-4"
        >
          Add Item
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full border border-black text-sm bg-white text-black">
          <thead className="bg-yellow-200">
            <tr>
              {[
                "Sr No",
                "SSR No",
                "Description",
                "Unit",
                "Basic Rate",
                "Deduct",
                "Net After Deduct",
                "Material Type",
                "Qty",
                "Lead",
                "Total Lead",
                "Total",
                "Tribal",
                "Net Total",
                "Specifications",
              ].map((h, i) => (
                <th
                  key={i}
                  className="border border-black px-2 py-1"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="border border-black text-center">
                  {row.srNo}
                </td>

                <td className="border border-black text-center">
                  {row.ssr}
                </td>

                <td className="border border-black px-1">
                  {row.description}
                </td>

                <td className="border border-black text-center">
                  {row.unit}
                </td>

                {/* Basic Rate */}
                <td className="border border-black">
                  <input
                    type="number"
                    className="w-full text-center outline-none bg-transparent text-black"
                    value={row.basicRate}
                    onChange={(e) =>
                      updateRow(i, "basicRate", e.target.value)
                    }
                  />
                </td>

                {/* Deduct */}
                <td className="border border-black">
                  <input
                    type="number"
                    className="w-full text-center outline-none bg-transparent text-black"
                    value={row.deduct}
                    onChange={(e) =>
                      updateRow(i, "deduct", e.target.value)
                    }
                  />
                </td>

                {/* Net After Deduct */}
                <td className="border border-black text-center">
                  {row.netAfterDeduct}
                </td>

                {/* Material Type */}
                <td className="border border-black">
                  <input
                    className="w-full text-center outline-none bg-transparent text-black"
                    value={row.materialType}
                    onChange={(e) => {
                      const updated = [...rows];
                      updated[i].materialType = e.target.value;
                      setRows(updated);
                    }}
                  />
                </td>

                {/* Qty */}
                <td className="border border-black">
                  <input
                    type="number"
                    className="w-full text-center outline-none bg-transparent text-black"
                    value={row.qty}
                    onChange={(e) =>
                      updateRow(i, "qty", e.target.value)
                    }
                  />
                </td>

                {/* Lead */}
                <td className="border border-black">
                  <input
                    type="number"
                    className="w-full text-center outline-none bg-transparent text-black"
                    value={row.lead}
                    onChange={(e) =>
                      updateRow(i, "lead", e.target.value)
                    }
                  />
                </td>

                {/* Total Lead */}
                <td className="border border-black text-center">
                  {row.totalLead}
                </td>

                {/* Total */}
                <td className="border border-black text-center">
                  {row.total}
                </td>

                {/* Tribal */}
                <td className="border border-black">
                  <input
                    type="number"
                    className="w-full text-center outline-none bg-transparent text-black"
                    value={row.tribal}
                    onChange={(e) =>
                      updateRow(i, "tribal", e.target.value)
                    }
                  />
                </td>

                {/* Net Total */}
                <td className="border border-black text-center">
                  {row.netTotal}
                </td>

                {/* Specs */}
                <td className="border border-black px-1">
                  {row.specs}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}