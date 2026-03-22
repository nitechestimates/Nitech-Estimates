"use client";
import React, { useState, useRef, useEffect } from "react";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

export default function RateAnalysisPage() {
  const [rows, setRows] = useState([]);
  const [itemCode, setItemCode] = useState("");
  const [insertIndex, setInsertIndex] = useState(null);
  const [nameOfWork, setNameOfWork] = useState("");

  const addItem = async () => {
    if (!itemCode) return;

    const res = await fetch(`/api/get-item?code=${itemCode}`);
    const data = await res.json();

    const completedRate =
      parseFloat(
        data["Completed Rate for 2021-22 excluding GST In Rs."]
      ) || 0;

    const newRow = calculateRow({
      id: Date.now().toString(),
      srNo: 0,
      ssr: itemCode,
      description: data["Description of the item"] || "",
      unit: data["Unit"] || "",
      basicRate: completedRate,
      specs: data["Additional Specification"] || "",
      deduct: 0,
      materialType: "",
      qty: 0,
      lead: 0,
      tribal: 0,
    });

    let updated = [...rows];

    if (insertIndex !== null) updated.splice(insertIndex, 0, newRow);
    else updated.push(newRow);

    setRows(updated.map((r, i) => ({ ...r, srNo: i + 1 })));
    setInsertIndex(null);
    setItemCode("");
  };

  const calculateRow = (row) => {
    const netAfterDeduct = row.basicRate - row.deduct;
    const totalLead = row.qty * row.lead;
    const total = netAfterDeduct + totalLead;
    const netTotal = total + row.tribal;

    return { ...row, netAfterDeduct, totalLead, total, netTotal };
  };

  const handleNumber = (val) => val.replace(/[^0-9.]/g, "");

  const updateRow = (i, field, value) => {
    const updated = [...rows];

    if (["description", "unit", "materialType", "specs"].includes(field)) {
      updated[i][field] = value;
    } else {
      updated[i][field] = Number(handleNumber(value));
    }

    updated[i] = calculateRow(updated[i]);
    setRows(updated);
  };

  const deleteRow = (id) => {
    setRows(rows.filter(r => r.id !== id).map((r,i)=>({...r,srNo:i+1})));
  };

  const refreshRow = async (i) => {
    if (!confirm("Revert to default SSR values?")) return;

    const code = rows[i].ssr;
    const res = await fetch(`/api/get-item?code=${code}`);
    const data = await res.json();

    const completedRate =
      parseFloat(data["Completed Rate for 2021-22 excluding GST In Rs."]) || 0;

    const updated = [...rows];
    updated[i] = calculateRow({
      ...updated[i],
      description: data["Description of the item"],
      unit: data["Unit"],
      basicRate: completedRate,
      specs: data["Additional Specification"],
      deduct: 0,
      qty: 0,
      lead: 0,
      tribal: 0,
    });

    setRows(updated);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex(r => r.id === active.id);
    const newIndex = rows.findIndex(r => r.id === over.id);

    const newRows = arrayMove(rows, oldIndex, newIndex);
    setRows(newRows.map((r,i)=>({...r,srNo:i+1})));
  };

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">

      <div className="mb-4">
        <span className="font-bold">Name of Work: </span>
        <input
          value={nameOfWork}
          onChange={(e)=>setNameOfWork(e.target.value)}
          className="border p-1 w-[400px]"
        />
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={itemCode}
          onChange={(e)=>setItemCode(e.target.value)}
          onKeyDown={(e)=>e.key==="Enter" && addItem()}
          className="border p-2"
          placeholder="SSR Item No"
        />
        <button onClick={addItem} className="bg-black text-white px-4">
          Add Item
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map(r=>r.id)} strategy={verticalListSortingStrategy}>

          <table className="w-full border text-xs bg-white">

            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2 text-center">☰</th>
                <th className="border p-2 text-center">Sr</th>
                <th className="border p-2 text-center">SSR</th>
                <th className="border p-2 text-center w-[420px]">Description</th>
                <th className="border p-2 text-center">Unit</th>
                <th className="border p-2 text-center">Basic Rate</th>
                <th className="border p-2 text-center">Deduct</th>
                <th className="border p-2 text-center">Net</th>
                <th className="border p-2 text-center">Material</th>
                <th className="border p-2 text-center">Qty</th>
                <th className="border p-2 text-center">Lead</th>
                <th className="border p-2 text-center">Total Lead</th>
                <th className="border p-2 text-center">Total</th>
                <th className="border p-2 text-center">Tribal</th>
                <th className="border p-2 text-center">Net Total</th>
                <th className="border p-2 text-center">Specs</th>
                <th className="border text-center">🔄</th>
                <th className="border text-center">❌</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row,i)=>(
                <React.Fragment key={row.id}>
                  {/* Insert row */}
                  <tr>
                    <td colSpan={18} className="border text-center">
                      <button
                        onClick={()=>setInsertIndex(insertIndex===i?null:i)}
                        className={`px-4 ${
                          insertIndex===i
                            ? "bg-blue-500 text-white font-bold scale-110"
                            : "text-blue-600"
                        }`}
                      >
                        ➕ Insert Here
                      </button>
                    </td>
                  </tr>

                  <SortableRow
                    row={row}
                    index={i}
                    updateRow={updateRow}
                    deleteRow={deleteRow}
                    refreshRow={refreshRow}
                  />
                </React.Fragment>
              ))}
            </tbody>

          </table>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Auto-expand textarea with centered text
function AutoTextarea({ value, onChange }) {
  const ref = useRef(null);

  const adjustHeight = () => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleChange = (e) => {
    onChange(e);
    adjustHeight();
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      className="w-full resize-none overflow-hidden bg-transparent p-1 text-center"
    />
  );
}

function SortableRow({ row, index, updateRow, deleteRow, refreshRow }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: row.id });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="text-center"
    >
      <td {...attributes} {...listeners} className="border p-2">☰</td>
      <td className="border p-2">{row.srNo}</td>
      <td className="border p-2">{row.ssr}</td>

      <td className="border p-2">
        <AutoTextarea
          value={row.description}
          onChange={(e) => updateRow(index, "description", e.target.value)}
        />
      </td>

      <td className="border p-2">
        <AutoTextarea
          value={row.unit}
          onChange={(e) => updateRow(index, "unit", e.target.value)}
        />
      </td>

      <td className="border p-2">
        <input
          value={row.basicRate}
          onChange={(e) => updateRow(index, "basicRate", e.target.value)}
          className="text-center w-full"
        />
      </td>

      <td className="border p-2">
        <input
          value={row.deduct}
          onChange={(e) => updateRow(index, "deduct", e.target.value)}
          className="text-center w-full"
        />
      </td>

      <td className="border p-2">{row.netAfterDeduct}</td>

      <td className="border p-2">
        <AutoTextarea
          value={row.materialType}
          onChange={(e) => updateRow(index, "materialType", e.target.value)}
        />
      </td>

      <td className="border p-2">
        <input
          value={row.qty}
          onChange={(e) => updateRow(index, "qty", e.target.value)}
          className="text-center w-full"
        />
      </td>

      <td className="border p-2">
        <input
          value={row.lead}
          onChange={(e) => updateRow(index, "lead", e.target.value)}
          className="text-center w-full"
        />
      </td>

      <td className="border p-2">{row.totalLead}</td>
      <td className="border p-2">{row.total}</td>

      <td className="border p-2">
        <input
          value={row.tribal}
          onChange={(e) => updateRow(index, "tribal", e.target.value)}
          className="text-center w-full"
        />
      </td>

      <td className="border p-2">{row.netTotal}</td>

      <td className="border p-2">
        <AutoTextarea
          value={row.specs}
          onChange={(e) => updateRow(index, "specs", e.target.value)}
        />
      </td>

      <td className="border p-2">
        <button onClick={() => refreshRow(index)}>🔄</button>
      </td>

      <td className="border p-2">
        <button onClick={() => deleteRow(row.id)}>❌</button>
      </td>
    </tr>
  );
}