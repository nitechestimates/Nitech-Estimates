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
import Tabs from "../components/Tabs";

// Numeric Input (3 decimals, Enter key)
function NumericInput({ value, onChange, disabled = false }) {
  const [displayValue, setDisplayValue] = useState(
    value !== undefined && value !== null ? value.toString() : "0"
  );
  const inputRef = useRef(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      const formatted = (value || 0).toFixed(3);
      setDisplayValue(formatted);
    }
  }, [value]);

  const handleFocus = () => {
    setDisplayValue((value || 0).toString());
  };

  const handleChange = (e) => {
    let raw = e.target.value;
    raw = raw.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 3)
      raw = parts[0] + "." + parts[1].slice(0, 3);
    setDisplayValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num)) onChange(num);
    else if (raw === "") onChange(0);
  };

  const handleBlur = () => {
    let num = parseFloat(displayValue);
    if (isNaN(num)) num = 0;
    const formatted = num.toFixed(3);
    setDisplayValue(formatted);
    onChange(num);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`text-center w-full border rounded px-1 py-0.5 ${disabled ? "bg-gray-100" : ""}`}
    />
  );
}

// Auto-expand textarea
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
      className="w-full resize-none overflow-hidden bg-transparent p-1 text-left"
    />
  );
}

export default function RateAnalysisPage() {
  const [rows, setRows] = useState([]);
  const [itemCode, setItemCode] = useState("");
  const [insertIndex, setInsertIndex] = useState(null);
  const [nameOfWork, setNameOfWork] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ra_rows");
    if (saved) setRows(JSON.parse(saved));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem("ra_rows", JSON.stringify(rows));
  }, [rows, isLoaded]);

  const addItem = async () => {
    if (!itemCode) return;
    const res = await fetch(`/api/get-item?code=${itemCode}`);
    const data = await res.json();
    const completedRate =
      parseFloat(data["Completed Rate for 2021-22 excluding GST In Rs."]) || 0;

    const newRow = calculateRow({
      id: Date.now().toString(),
      srNo: 0,
      ssr: itemCode,
      description: data["Description of the item"] || "",
      unit: data["Unit"] || "",
      basicRate: completedRate,
      specs: data["Additional Specification"] || "",
      deduct: 0,
      materials: [{ id: Date.now().toString() + "-mat1", name: "", qty: 0, lead: 0 }],
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
    const totalLead = row.materials.reduce((sum, m) => sum + (m.qty * m.lead), 0);
    const total = netAfterDeduct + totalLead;
    const netTotal = total + row.tribal;
    return { ...row, netAfterDeduct, totalLead, total, netTotal };
  };

  const updateRow = (i, field, value) => {
    const updated = [...rows];
    updated[i][field] = value;
    updated[i] = calculateRow(updated[i]);
    setRows(updated);
  };

  const updateMaterial = (rowIndex, matIndex, field, value) => {
    const updated = [...rows];
    updated[rowIndex].materials[matIndex][field] = value;
    updated[rowIndex] = calculateRow(updated[rowIndex]);
    setRows(updated);
  };

  const addMaterial = (rowIndex) => {
    const updated = [...rows];
    updated[rowIndex].materials.push({
      id: Date.now().toString() + "-mat" + Math.random(),
      name: "",
      qty: 0,
      lead: 0,
    });
    setRows(updated);
  };

  const removeMaterial = (rowIndex, matIndex) => {
    const updated = [...rows];
    updated[rowIndex].materials.splice(matIndex, 1);
    if (updated[rowIndex].materials.length === 0) {
      updated[rowIndex].materials.push({
        id: Date.now().toString() + "-mat-empty",
        name: "",
        qty: 0,
        lead: 0,
      });
    }
    updated[rowIndex] = calculateRow(updated[rowIndex]);
    setRows(updated);
  };

  const deleteRow = (id) => {
    setRows(rows.filter((r) => r.id !== id).map((r, i) => ({ ...r, srNo: i + 1 })));
  };

  const refreshRow = async (i) => {
    if (!confirm("Revert to default SSR values? Your edits will be lost.")) return;
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
      materials: [{ id: Date.now().toString() + "-mat1", name: "", qty: 0, lead: 0 }],
      tribal: 0,
    });
    setRows(updated);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    const newRows = arrayMove(rows, oldIndex, newIndex);
    setRows(newRows.map((r, i) => ({ ...r, srNo: i + 1 })));
  };

  const formatNumber = (num) => (num !== undefined && num !== null ? num.toFixed(3) : "0.000");

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <Tabs />
      <div className="mb-4">
        <span className="font-bold">Name of Work: </span>
        <input
          value={nameOfWork}
          onChange={(e) => setNameOfWork(e.target.value)}
          className="border p-1 w-[400px]"
        />
      </div>
      <div className="flex gap-2 mb-4">
        <input
          value={itemCode}
          onChange={(e) => setItemCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          className="border p-2"
          placeholder="SSR Item No"
        />
        <button onClick={addItem} className="bg-black text-white px-4">
          Add Item
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="overflow-x-auto">
            <table className="w-full border text-xs bg-white" style={{ minWidth: "1200px" }}>
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">☰</th>
                  <th className="border p-2">Sr</th>
                  <th className="border p-2">SSR</th>
                  <th className="border p-2 w-[420px]">Description</th>
                  <th className="border p-2">Unit</th>
                  <th className="border p-2">Basic Rate</th>
                  <th className="border p-2">Deduct</th>
                  <th className="border p-2">Net (5-6)</th>
                  <th className="border p-2" colSpan="3">Type of material required</th>
                  <th className="border p-2">Total Lead</th>
                  <th className="border p-2">Total (7+11)</th>
                  <th className="border p-2">Tribal</th>
                  <th className="border p-2">Net Total</th>
                  <th className="border p-2">Specs</th>
                  <th className="border p-2">🔄</th>
                  <th className="border p-2">❌</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <React.Fragment key={row.id}>
                    {/* Insert row */}
                    <tr>
                      <td colSpan="18" className="border text-center">
                        <button
                          onClick={() => setInsertIndex(insertIndex === i ? null : i)}
                          className={`px-4 transition-all ${
                            insertIndex === i ? "bg-blue-500 text-white font-bold scale-110" : "text-blue-600"
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
                      updateMaterial={updateMaterial}
                      addMaterial={addMaterial}
                      removeMaterial={removeMaterial}
                      deleteRow={deleteRow}
                      refreshRow={refreshRow}
                      formatNumber={formatNumber}
                    />
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  row,
  index,
  updateRow,
  updateMaterial,
  addMaterial,
  removeMaterial,
  deleteRow,
  refreshRow,
  formatNumber,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-yellow-50">
      <td {...attributes} {...listeners} className="border p-2 text-center cursor-grab">☰</td>
      <td className="border p-2 text-center">{row.srNo}</td>
      <td className="border p-2 text-center">{row.ssr}</td>
      <td className="border p-2">
        <AutoTextarea value={row.description} onChange={(e) => updateRow(index, "description", e.target.value)} />
      </td>
      <td className="border p-2">
        <AutoTextarea value={row.unit} onChange={(e) => updateRow(index, "unit", e.target.value)} />
      </td>
      <td className="border p-2">
        <NumericInput value={row.basicRate} onChange={(val) => updateRow(index, "basicRate", val)} />
      </td>
      <td className="border p-2">
        <NumericInput value={row.deduct} onChange={(val) => updateRow(index, "deduct", val)} />
      </td>
      <td className="border p-2 text-center">{formatNumber(row.netAfterDeduct)}</td>
      <td className="border p-2" colSpan="3">
        <div className="space-y-2">
          {row.materials.map((mat, matIdx) => (
            <div key={mat.id} className="flex gap-1 items-center border-b pb-1">
              <input
                type="text"
                placeholder="Material"
                value={mat.name}
                onChange={(e) => updateMaterial(index, matIdx, "name", e.target.value)}
                className="w-28 p-1 border text-center"
              />
              <NumericInput value={mat.qty} onChange={(val) => updateMaterial(index, matIdx, "qty", val)} />
              <NumericInput value={mat.lead} onChange={(val) => updateMaterial(index, matIdx, "lead", val)} />
              <button onClick={() => removeMaterial(index, matIdx)} className="text-red-500 hover:text-red-700">✕</button>
            </div>
          ))}
          <button onClick={() => addMaterial(index)} className="text-xs text-blue-600 hover:text-blue-800">+ Add material</button>
        </div>
      </td>
      <td className="border p-2 text-center">{formatNumber(row.totalLead)}</td>
      <td className="border p-2 text-center">{formatNumber(row.total)}</td>
      <td className="border p-2">
        <NumericInput value={row.tribal} onChange={(val) => updateRow(index, "tribal", val)} />
      </td>
      <td className="border p-2 text-center">{formatNumber(row.netTotal)}</td>
      <td className="border p-2">
        <AutoTextarea value={row.specs} onChange={(e) => updateRow(index, "specs", e.target.value)} />
      </td>
      <td className="border p-2 text-center">
        <button onClick={() => refreshRow(index)}>🔄</button>
      </td>
      <td className="border p-2 text-center">
        <button onClick={() => deleteRow(row.id)}>❌</button>
      </td>
    </tr>
  );
}