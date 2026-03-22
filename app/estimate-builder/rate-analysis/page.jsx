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

// Numeric Input with two-decimal formatting
function NumericInput({ value, onChange, onBlur }) {
  const [displayValue, setDisplayValue] = useState(() => 
    value !== undefined && value !== null ? value.toFixed(2) : "0.00"
  );
  const inputRef = useRef(null);

  useEffect(() => {
    // If the value changes externally (e.g., from calculation), update display
    if (document.activeElement !== inputRef.current) {
      setDisplayValue(value !== undefined && value !== null ? value.toFixed(2) : "0.00");
    }
  }, [value]);

  const handleFocus = () => {
    // Show raw number without trailing .00
    const raw = value !== undefined && value !== null ? value.toString() : "";
    setDisplayValue(raw);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    // Let parent know the raw number (preserve what user typed)
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(num);
    } else {
      onChange(0);
    }
  };

  const handleBlur = () => {
    // Format to two decimals
    let num = parseFloat(displayValue);
    if (isNaN(num)) num = 0;
    const formatted = num.toFixed(2);
    setDisplayValue(formatted);
    onChange(parseFloat(formatted));
    if (onBlur) onBlur();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className="text-center w-full"
    />
  );
}

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

  const updateRow = (i, field, value) => {
    const updated = [...rows];
    if (["description", "unit", "materialType", "specs"].includes(field)) {
      updated[i][field] = value;
    } else {
      updated[i][field] = value;
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

  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0.00";
    return num.toFixed(2);
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
                <th className="border p-2 text-center">Sr. No.</th>
                <th className="border p-2 text-center">S.S.R. Item No.</th>
                <th className="border p-2 text-center w-[420px]">Description of the Item in Brief</th>
                <th className="border p-2 text-center">Unit</th>
                <th className="border p-2 text-center">Basic Rate (Rs.Ps.)</th>
                <th className="border p-2 text-center">Deduct for scada</th>
                <th className="border p-2 text-center">Net amount after deducting scada (5-6)</th>
                <th className="border p-2 text-center">Type of material required</th>
                <th className="border p-2 text-center">Qty of material reqd</th>
                <th className="border p-2 text-center">Net lead charges</th>
                <th className="border p-2 text-center">Total lead charges (Rs.Ps)</th>
                <th className="border p-2 text-center">Total (Rs.-Ps.) (7+11)</th>
                <th className="border p-2 text-center">TRIBL 10% -Non Tribal 0%</th>
                <th className="border p-2 text-center">Net Total Amount (Rs.-Ps.) (12+13)</th>
                <th className="border p-2 text-center">specifications</th>
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
                        className={`px-4 transition-all duration-200 ${
                          insertIndex===i
                            ? "bg-blue-500 text-white font-bold scale-110"
                            : "text-blue-600 hover:scale-105"
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
                    formatNumber={formatNumber}
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

function SortableRow({ row, index, updateRow, deleteRow, refreshRow, formatNumber }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className="text-center hover:bg-yellow-50">
      <td
        {...attributes}
        {...listeners}
        className="border p-2 cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-colors"
      >
        ☰
      </td>
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
        <NumericInput
          value={row.basicRate}
          onChange={(val) => updateRow(index, "basicRate", val)}
        />
      </td>

      <td className="border p-2">
        <NumericInput
          value={row.deduct}
          onChange={(val) => updateRow(index, "deduct", val)}
        />
      </td>

      <td className="border p-2">{formatNumber(row.netAfterDeduct)}</td>

      <td className="border p-2">
        <AutoTextarea
          value={row.materialType}
          onChange={(e) => updateRow(index, "materialType", e.target.value)}
        />
      </td>

      <td className="border p-2">
        <NumericInput
          value={row.qty}
          onChange={(val) => updateRow(index, "qty", val)}
        />
      </td>

      <td className="border p-2">
        <NumericInput
          value={row.lead}
          onChange={(val) => updateRow(index, "lead", val)}
        />
      </td>

      <td className="border p-2">{formatNumber(row.totalLead)}</td>
      <td className="border p-2">{formatNumber(row.total)}</td>

      <td className="border p-2">
        <NumericInput
          value={row.tribal}
          onChange={(val) => updateRow(index, "tribal", val)}
        />
      </td>

      <td className="border p-2">{formatNumber(row.netTotal)}</td>

      <td className="border p-2">
        <AutoTextarea
          value={row.specs}
          onChange={(e) => updateRow(index, "specs", e.target.value)}
        />
      </td>

      <td className="border p-2">
        <button
          onClick={() => refreshRow(index)}
          className="hover:bg-gray-200 rounded p-1 transition-colors"
        >
          🔄
        </button>
      </td>

      <td className="border p-2">
        <button
          onClick={() => deleteRow(row.id)}
          className="hover:bg-red-100 rounded p-1 transition-colors"
        >
          ❌
        </button>
      </td>
    </tr>
  );
}