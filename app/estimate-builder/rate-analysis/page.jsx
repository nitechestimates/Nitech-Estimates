"use client";
import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Tabs from "../components/Tabs";
import DownloadPdfButton from "../components/DownloadPdfButton";

// ========== Helper: map material name to category ==========
function getCategoryFromMaterial(materialName) {
  if (!materialName) return null;
  const normalized = materialName.toLowerCase().trim();
  const mapping = {
    "Concrete Blocks  (Form)": ["concrete block", "form", "hollow block"],
    "Murum, Building Rubish, Earth": ["murrum", "building rubbish", "earth"],
    "Excavated Rock    soling stone": ["excavated rock", "soling stone"],
    "Sand, (crush metal)  Stone below 40 mm, Normal Brick sider aggre. Timber": [
      "sand", "stone below 40", "brick", "aggregate", "timber", "cr. metal", "brick sider"
    ],
    "Stone aggregate 40mm Normal size and above": ["stone aggregate 40mm", "stone aggregate above"],
    "Cement, Lime, Stone Block, GI, CI, CC & AC Pipes /  Sheet& Plate,  Glass in packs, Distemper, AC Sheet, Fitting Iron Sheet": [
      "cement", "lime", "stone block", "pipe", "sheet", "plate", "glass", "distemper", "ac sheet", "fitting iron"
    ],
    "Bricks           1000 nos      1cum=500 Bricks": ["brick"],
    "Tiles Half Round Tiles / Roofing Tiles / Manglore Tiles": ["tile", "roofing", "half round", "manlore"],
    "Steel        (MS, TMT, H.Y.S.D.) Structural Steel": ["steel", "ms", "tmt", "hysd", "structural"],
    "Flooring Tiles Ceramic/ Marbonate": ["ceramic", "marble", "granite", "flooring tile"],
  };

  for (const [category, keywords] of Object.entries(mapping)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return category;
    }
  }
  return null;
}

// ========== Helper: Get default materials based on description ==========
function getDefaultMaterialsForDescription(description, leadSettings) {
  const defaultMaterials = [];

  if (!description) return defaultMaterials;

  const gradeMappings = {
    5:   { cement: 0.140, sand: 0.460, metal: 0.920 },
    7.5: { cement: 0.180, sand: 0.480, metal: 0.960 },
    10:  { cement: 0.220, sand: 0.450, metal: 0.910 },
    15:  { cement: 0.280, sand: 0.440, metal: 0.880 },
    20:  { cement: 0.310, sand: 0.420, metal: 0.840 },
    25:  { cement: 0.390, sand: 0.380, metal: 0.760 },
    30:  { cement: 0.420, sand: 0.360, metal: 0.720 },
    35:  { cement: 0.480, sand: 0.340, metal: 0.680 },
    40:  { cement: 0.500, sand: 0.320, metal: 0.640 },
    45:  { cement: 0.550, sand: 0.300, metal: 0.600 },
    50:  { cement: 0.600, sand: 0.280, metal: 0.560 },
  };

  const gradePattern = /M\s*[-]?\s*(\d+(?:\.\d+)?)/i;
  const match = description.match(gradePattern);
  if (match) {
    const gradeNum = parseFloat(match[1]);
    const data = gradeMappings[gradeNum];
    if (data) {
      const materials = [
        { name: "Cement", qty: data.cement },
        { name: "Sand", qty: data.sand },
        { name: "Stone Below 40 Mm (Cr. Metal)", qty: data.metal }
      ];
      return materials.map((mat, index) => {
        const category = getCategoryFromMaterial(mat.name);
        const leadCharge = leadSettings[category]?.leadCharge || 0;
        return {
          id: Date.now().toString() + `-mat-${index}-${Math.random().toString(36).slice(2, 7)}`,
          name: mat.name,
          qty: mat.qty,
          lead: leadCharge
        };
      });
    }
  }

  return defaultMaterials;
}

// ========== Numeric Input ==========
function NumericInput({ value, onChange, disabled = false, placeholder = "" }) {
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
      placeholder={placeholder}
      className={`text-center w-full border rounded px-1 py-0.5 h-[26px] ${disabled ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-white"}`}
    />
  );
}

// ========== Auto-expand textarea ==========
function AutoTextarea({ value, onChange, className = "text-left" }) {
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
      className={`w-full resize-none overflow-hidden bg-transparent p-1 break-keep ${className}`}
    />
  );
}

const defaultBottomRows = [
  { id: "royalty-sand", isRoyalty: true, ssr: "", description: "Royalty Charges ( sand)", unit: "", basicRate: 0, deduct: 0, materials: [{ id: "mat-r1", name: "", qty: 0, lead: 0 }], totalLead: 0, total: 0, tribal: 0, netTotal: 0, specs: "" },
  { id: "royalty-others", isRoyalty: true, ssr: "", description: "Royalty Charges ( others)", unit: "", basicRate: 0, deduct: 0, materials: [{ id: "mat-r2", name: "", qty: 0, lead: 0 }], totalLead: 0, total: 0, tribal: 0, netTotal: 0, specs: "" }
];

export default function RateAnalysisPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const loadId = searchParams.get("load");
  const nameFromURL = searchParams.get("name");
  const tribalFromURL = searchParams.get("tribal") === "true";

  const [rows, setRows] = useState([]);
  const [bottomRows, setBottomRows] = useState(defaultBottomRows);
  const [itemCode, setItemCode] = useState("");
  const [insertIndex, setInsertIndex] = useState(null);
  const [nameOfWork, setNameOfWork] = useState(nameFromURL || "");
  const [isTribal, setIsTribal] = useState(tribalFromURL);
  const [isLoaded, setIsLoaded] = useState(false);
  const [materialList, setMaterialList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [currentEstimateId, setCurrentEstimateId] = useState(null);
  const [leadSettings, setLeadSettings] = useState({});

  // ====== SEARCH FEATURE STATES ======
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("leadSettings");
    if (saved) {
      setLeadSettings(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    fetch("/api/material-list")
      .then((res) => res.json())
      .then((data) => setMaterialList(data))
      .catch((err) => console.error("Failed to load material list", err));
  }, []);

  // ====== SEARCH EFFECTS ======
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        fetch(`/api/search-items?q=${encodeURIComponent(searchQuery)}`)
          .then((res) => res.json())
          .then((data) => {
            setSearchResults(data.data || []);
            setIsDropdownOpen(true);
          })
          .catch((err) => console.error("Search error:", err));
      } else {
        setSearchResults([]);
        setIsDropdownOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const highlightText = (text, highlight) => {
    if (!highlight.trim() || !text) return text;
    const terms = highlight.trim().split(/\s+/).filter((t) => t.length > 0);
    const regex = new RegExp(`(${terms.join("|")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-300 font-bold">{part}</span>
      ) : (
        part
      )
    );
  };

  useEffect(() => {
    if (loadId) {
      setIsLoaded(true);
      return;
    }
    const saved = localStorage.getItem("ra_rows");
    const savedBottom = localStorage.getItem("ra_bottom_rows");
    if (saved) setRows(JSON.parse(saved));
    if (savedBottom) setBottomRows(JSON.parse(savedBottom));
    setIsLoaded(true);
  }, [loadId]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("ra_rows", JSON.stringify(rows));
      localStorage.setItem("ra_bottom_rows", JSON.stringify(bottomRows));
    }
  }, [rows, bottomRows, isLoaded]);

  useEffect(() => {
    if (!loadId) return;
    setLoadingEstimate(true);

    fetch(`/api/estimate/${loadId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const loadedRows = data.data.rows || [];
          const bRows = loadedRows.filter((r) => r.isRoyalty);
          const standardRows = loadedRows.filter((r) => !r.isRoyalty).map((r, i) => ({ ...r, srNo: i + 1 }));

          setRows(standardRows);
          setBottomRows(bRows.length > 0 ? bRows : defaultBottomRows);

          setNameOfWork(data.data.nameOfWork);
          if (data.data.isTribal !== undefined) setIsTribal(data.data.isTribal);
          setCurrentEstimateId(data.data._id);

          localStorage.setItem("ra_rows", JSON.stringify(standardRows));
          localStorage.setItem("ra_bottom_rows", JSON.stringify(bRows.length > 0 ? bRows : defaultBottomRows));
        }
      })
      .catch((err) => console.error("Load error:", err))
      .finally(() => {
        setLoadingEstimate(false);
      });
  }, [loadId]);

  useEffect(() => {
    if (nameFromURL) setNameOfWork(nameFromURL);
  }, [nameFromURL]);

  const calculateRow = (row, currentIsTribal = isTribal) => {
    const netAfterDeduct = row.basicRate - row.deduct;
    const totalLead = row.materials.reduce((sum, m) => sum + ((m.qty || 0) * (m.lead || 0)), 0);
    const total = netAfterDeduct + totalLead;

    const tribalAmount = currentIsTribal ? (row.basicRate * 0.10) : 0;

    const netTotal = total + tribalAmount;
    return { ...row, netAfterDeduct, totalLead, total, tribal: tribalAmount, netTotal };
  };

  // ✅ Updated addItem with duplicate SSR check
  const addItem = async (specificCode) => {
    const codeToUse = typeof specificCode === "string" ? specificCode : itemCode;
    if (!codeToUse) return;

    // Check if SSR already exists in current rows
    const existingRow = rows.find((r) => r.ssr === codeToUse.trim());
    if (existingRow) {
      const userConfirmed = window.confirm(
        `Item with SSR No. ${codeToUse} is already present in this estimate.\n\nDo you want to add another copy?`
      );
      if (!userConfirmed) {
        if (typeof specificCode !== "string") setItemCode("");
        return;
      }
    }

    try {
      const code = codeToUse.trim();
      const res = await fetch(`/api/get-item?code=${code}`);
      const data = await res.json();

      if (!data || data.error) {
        alert("Item not found!");
        return;
      }

      const completedRate = parseFloat(data["Completed Rate for 2021-22 excluding GST In Rs."]) || 0;
      const description = data["Description of the item"] || "";

      const unitFormatted = (data["Unit"] || "").trim().split(/\s+/).join("\n");
      const autoMaterials = getDefaultMaterialsForDescription(description, leadSettings);

      const newRow = calculateRow({
        id: Date.now().toString(),
        srNo: 0,
        ssr: code,
        description: description,
        unit: unitFormatted,
        basicRate: completedRate,
        specs: data["Additional Specification"] || "",
        deduct: 0,
        materials: autoMaterials,
        tribal: 0,
      }, isTribal);

      let updated = [...rows];
      if (insertIndex !== null) updated.splice(insertIndex, 0, newRow);
      else updated.push(newRow);

      setRows(updated.map((r, i) => ({ ...r, srNo: i + 1 })));
      setInsertIndex(null);

      if (typeof specificCode !== "string") {
        setItemCode("");
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const updateRow = (i, field, value) => {
    const updated = [...rows];
    updated[i][field] = value;
    updated[i] = calculateRow(updated[i], isTribal);
    setRows(updated);
  };

  const updateMaterial = (rowIndex, matIndex, field, value) => {
    const updated = [...rows];
    const mat = updated[rowIndex].materials[matIndex];
    mat[field] = value;

    if (field === "name") {
      const category = getCategoryFromMaterial(mat.name);
      if (category) {
        mat.lead = leadSettings[category]?.leadCharge || 0;
      }
    }
    updated[rowIndex] = calculateRow(updated[rowIndex], isTribal);
    setRows(updated);
  };

  const addMaterial = (rowIndex) => {
    const updated = [...rows];
    updated[rowIndex].materials.push({ id: Date.now().toString() + "-mat" + Math.random(), name: "", qty: 0, lead: 0 });
    setRows(updated);
  };

  const removeMaterial = (rowIndex, matIndex) => {
    const updated = [...rows];
    updated[rowIndex].materials.splice(matIndex, 1);
    updated[rowIndex] = calculateRow(updated[rowIndex], isTribal);
    setRows(updated);
  };

  const deleteRow = (id) => {
    setRows(rows.filter((r) => r.id !== id).map((r, i) => ({ ...r, srNo: i + 1 })));
  };

  const refreshRow = async (i) => {
    if (!confirm("Revert to default SSR values? Your edits will be lost.")) return;
    const code = rows[i].ssr.trim();
    const res = await fetch(`/api/get-item?code=${code}`);
    const data = await res.json();
    if (!data || data.error) return;

    const completedRate = parseFloat(data["Completed Rate for 2021-22 excluding GST In Rs."]) || 0;
    const description = data["Description of the item"] || "";
    const unitFormatted = (data["Unit"] || "").trim().split(/\s+/).join("\n");
    const autoMaterials = getDefaultMaterialsForDescription(description, leadSettings);

    const updated = [...rows];
    updated[i] = calculateRow({
      ...updated[i],
      description: description,
      unit: unitFormatted,
      basicRate: completedRate,
      specs: data["Additional Specification"] || "",
      deduct: 0,
      materials: autoMaterials,
      tribal: 0,
    }, isTribal);

    setRows(updated);
  };

  // ----- BOTTOM ROWS LOGIC -----
  const updateBottomRow = (i, field, value) => {
    const updated = [...bottomRows];
    updated[i][field] = value;
    updated[i] = calculateRow(updated[i], isTribal);
    setBottomRows(updated);
  };

  const updateBottomMaterial = (rowIndex, matIndex, field, value) => {
    const updated = [...bottomRows];
    const mat = updated[rowIndex].materials[matIndex];
    mat[field] = value;
    if (field === "name") {
      const category = getCategoryFromMaterial(mat.name);
      if (category) mat.lead = leadSettings[category]?.leadCharge || 0;
    }
    updated[rowIndex] = calculateRow(updated[rowIndex], isTribal);
    setBottomRows(updated);
  };

  const addBottomMaterial = (rowIndex) => {
    const updated = [...bottomRows];
    updated[rowIndex].materials.push({ id: Date.now().toString() + "-mat", name: "", qty: 0, lead: 0 });
    setBottomRows(updated);
  };

  const removeBottomMaterial = (rowIndex, matIndex) => {
    const updated = [...bottomRows];
    updated[rowIndex].materials.splice(matIndex, 1);
    updated[rowIndex] = calculateRow(updated[rowIndex], isTribal);
    setBottomRows(updated);
  };

  const clearBottomRow = (i) => {
    if (!confirm("Clear this royalty row?")) return;
    const updated = [...bottomRows];
    updated[i] = { ...defaultBottomRows[i], id: updated[i].id };
    setBottomRows(updated);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    const newRows = arrayMove(rows, oldIndex, newIndex);
    setRows(newRows.map((r, i) => ({ ...r, srNo: i + 1 })));
  };

  const formatNumber = (num) => (num !== undefined && num !== null && !isNaN(num) ? Number(num).toFixed(3) : "0.000");

  const saveEstimate = async () => {
    if (!session) {
      alert("You must be logged in to save an estimate.");
      return;
    }
    if (!nameOfWork.trim()) {
      alert("Please enter a Name of Work.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/estimate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameOfWork,
          isTribal,
          rows: [...rows, ...bottomRows],
          estimateId: currentEstimateId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.updated) alert("Estimate updated!");
        else {
          alert("Estimate saved!");
          if (data.id) setCurrentEstimateId(data.id);
        }
      } else {
        alert(data.error || "Failed to save.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const refreshLeadCharges = () => {
    const saved = localStorage.getItem("leadSettings");
    if (!saved) {
      alert("No lead settings found. Please set distances in the Leads page first.");
      return;
    }
    const freshSettings = JSON.parse(saved);
    setLeadSettings(freshSettings);

    const updatedRows = rows.map((row) => {
      const updatedMaterials = row.materials.map((mat) => {
        if (mat.name) {
          const category = getCategoryFromMaterial(mat.name);
          if (category && freshSettings[category]) {
            return { ...mat, lead: freshSettings[category].leadCharge || 0 };
          }
        }
        return mat;
      });
      return calculateRow({ ...row, materials: updatedMaterials }, isTribal);
    });
    setRows(updatedRows);

    const updatedBottom = bottomRows.map((row) => {
      const updatedMaterials = row.materials.map((mat) => {
        if (mat.name) {
          const category = getCategoryFromMaterial(mat.name);
          if (category && freshSettings[category]) {
            return { ...mat, lead: freshSettings[category].leadCharge || 0 };
          }
        }
        return mat;
      });
      return calculateRow({ ...row, materials: updatedMaterials }, isTribal);
    });
    setBottomRows(updatedBottom);

    alert("Lead charges refreshed from Leads page.");
  };

  if (loadingEstimate) {
    return (
      <div className="p-4 bg-yellow-50 min-h-screen text-black">
        <Tabs />
        <div className="flex justify-center items-center h-[70vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium animate-pulse">Loading Project Data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black animate-fade-in-up">
      <Tabs />

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="font-bold">Name of Work: </span>
          <input
            value={nameOfWork}
            onChange={(e) => setNameOfWork(e.target.value)}
            className="border p-2 w-[400px] rounded"
            placeholder="Enter Name of Work"
          />
          {isTribal && (
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              Tribal Estimate
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <DownloadPdfButton
            estimateId={currentEstimateId}
            nameOfWork={nameOfWork}
            isTribal={isTribal}
            rows={[...rows, ...bottomRows]}
            leadSettings={leadSettings}
          />

          <button
            onClick={refreshLeadCharges}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-md"
          >
            Refresh Lead Charges
          </button>
          <button
            onClick={saveEstimate}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 shadow-md transition-all"
          >
            {saving ? "Saving..." : "Save Estimate"}
          </button>
        </div>
      </div>

      {/* ====== SEARCH BAR ====== */}
      <div className="flex gap-4 mb-4 items-center">
        <div className="flex gap-2">
          <input
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="border p-2 w-[150px] shadow-sm rounded-md"
            placeholder="SSR Item No"
          />
          <button
            onClick={() => addItem()}
            className="bg-black text-white px-4 py-2 hover:bg-gray-800 transition-colors rounded-md shadow-md"
          >
            Add Item
          </button>
        </div>

        <div className="text-gray-400 font-bold">OR</div>

        <div className="relative flex-1 max-w-3xl" ref={searchRef}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setIsDropdownOpen(true);
            }}
            className="border p-2 w-full shadow-sm rounded-md"
            placeholder="Search words in description..."
          />

          {isDropdownOpen && searchResults.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-gray-300 mt-1 max-h-[400px] overflow-y-auto shadow-xl rounded-md">
              {searchResults.map((res, idx) => (
                <li
                  key={`${res.code}-${idx}`}
                  onClick={() => {
                    setSearchQuery("");
                    setIsDropdownOpen(false);
                    addItem(res.code);
                  }}
                  className="p-3 border-b hover:bg-yellow-50 cursor-pointer text-sm transition-colors"
                >
                  <div className="font-bold text-blue-700 mb-1">SSR: {res.code}</div>
                  <div className="text-gray-800">
                    {highlightText(res.description, searchQuery)}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {isDropdownOpen && searchQuery.length > 2 && searchResults.length === 0 && (
            <div className="absolute z-50 w-full bg-white border border-gray-300 mt-1 p-3 shadow-lg rounded-md text-gray-500">
              No items found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="overflow-x-auto relative shadow-sm border rounded">
            <table className="w-full border text-xs bg-white relative" style={{ minWidth: "1400px" }}>
              <thead className="bg-gray-200 border-b-2 border-gray-300">
                <tr className="text-center font-bold text-gray-700">
                  <th className="border p-2">☰</th>
                  <th className="border p-2 w-[40px]">Sr</th>
                  <th className="border p-2 w-[80px]">SSR</th>
                  <th className="border p-2 min-w-[350px]">Description</th>
                  <th className="border p-2 w-[120px]">Unit</th>
                  <th className="border p-2 w-[90px]">Basic Rate</th>
                  <th className="border p-2 w-[100px]">Deduct (SCADA)</th>
                  <th className="border p-2 w-[90px]">Net (5-6)</th>
                  <th className="border p-2 w-[140px]">Material</th>
                  <th className="border p-2 w-[70px]">Qty</th>
                  <th className="border p-2 w-[90px]">Lead (Rs.)</th>
                  <th className="border p-2 w-[90px]">Total Lead</th>
                  <th className="border p-2 w-[100px]">Total (7+11)</th>
                  <th className="border p-2 w-[70px]">Tribal</th>
                  <th className="border p-2 w-[100px]">Net Total</th>
                  <th className="border p-2 w-[150px]">Specs</th>
                  <th className="border p-2 sticky right-0 bg-gray-200 z-10 shadow-[-3px_0_5px_rgba(0,0,0,0.1)] w-[80px]">Actions</th>
                </tr>
                <tr className="bg-gray-100 text-[11px] font-bold text-gray-500 text-center">
                  <td className="border p-1"></td>
                  <td className="border p-1">1</td>
                  <td className="border p-1">2</td>
                  <td className="border p-1">3</td>
                  <td className="border p-1">4</td>
                  <td className="border p-1">5</td>
                  <td className="border p-1">6</td>
                  <td className="border p-1">7</td>
                  <td className="border p-1">8</td>
                  <td className="border p-1">9</td>
                  <td className="border p-1">10</td>
                  <td className="border p-1">11</td>
                  <td className="border p-1">12</td>
                  <td className="border p-1">13</td>
                  <td className="border p-1">14</td>
                  <td className="border p-1">15</td>
                  <td className="border p-1 sticky right-0 bg-gray-100 z-10"></td>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td colSpan="17" className="border text-center bg-gray-50/50">
                        <button
                          onClick={() => setInsertIndex(insertIndex === i ? null : i)}
                          className={`px-4 py-0.5 text-[10px] rounded transition-all ${
                            insertIndex === i ? "bg-blue-500 text-white font-bold scale-110" : "text-blue-500 hover:bg-blue-100"
                          }`}
                        >
                          ➕ Insert Here
                        </button>
                      </td>
                    </tr>

                    <SortableRow
                      row={row}
                      index={i}
                      isTribal={isTribal}
                      updateRow={updateRow}
                      updateMaterial={updateMaterial}
                      addMaterial={addMaterial}
                      removeMaterial={removeMaterial}
                      deleteRow={deleteRow}
                      refreshRow={refreshRow}
                      formatNumber={formatNumber}
                      materialList={materialList}
                    />
                  </React.Fragment>
                ))}

                {bottomRows.map((row, i) => (
                  <StaticRow
                    key={row.id}
                    row={row}
                    index={i}
                    globalIndex={rows.length + i + 1}
                    isTribal={isTribal}
                    updateRow={updateBottomRow}
                    updateMaterial={updateBottomMaterial}
                    addMaterial={addBottomMaterial}
                    removeMaterial={removeBottomMaterial}
                    clearRow={() => clearBottomRow(i)}
                    formatNumber={formatNumber}
                    materialList={materialList}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Draggable Standard Row
function SortableRow({
  row,
  index,
  isTribal,
  updateRow,
  updateMaterial,
  addMaterial,
  removeMaterial,
  deleteRow,
  refreshRow,
  formatNumber,
  materialList,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-yellow-50 group transition-colors">
      <td {...attributes} {...listeners} className="border p-2 text-center cursor-grab text-gray-400 hover:text-black">☰</td>
      <td className="border p-2 text-center font-semibold">{row.srNo}</td>
      <td className="border p-2 text-center font-medium">{row.ssr}</td>
      <td className="border p-2">
        <AutoTextarea value={row.description} onChange={(e) => updateRow(index, "description", e.target.value)} />
      </td>
      <td className="border p-2">
        <AutoTextarea value={row.unit} onChange={(e) => updateRow(index, "unit", e.target.value)} className="text-center text-xs whitespace-pre-wrap" />
      </td>
      <td className="border p-2">
        <NumericInput value={row.basicRate} onChange={(val) => updateRow(index, "basicRate", val)} />
      </td>
      <td className="border p-2">
        <NumericInput value={row.deduct} onChange={(val) => updateRow(index, "deduct", val)} />
      </td>
      <td className="border p-2 text-center text-gray-700">{formatNumber(row.netAfterDeduct)}</td>

      {/* ✅ Material column with delete button for every material + add on last */}
      <td className="border py-1 px-1 align-top">
        {row.materials.length === 0 ? (
          <button
            onClick={() => addMaterial(index)}
            className="text-green-600 text-xs px-1 hover:scale-110 transition font-bold"
            title="Add material"
          >
            + Add Material
          </button>
        ) : (
          row.materials.map((mat, matIdx) => (
            <div key={mat.id} className="flex items-center gap-1 leading-none mb-1">
              <input
                list={`material-options-${row.id}-${matIdx}`}
                value={mat.name}
                onChange={(e) => updateMaterial(index, matIdx, "name", e.target.value)}
                className="w-full h-[26px] border text-xs px-1 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                placeholder="Select/type"
              />
              <datalist id={`material-options-${row.id}-${matIdx}`}>
                {materialList.map((matName) => (
                  <option key={matName} value={matName} />
                ))}
              </datalist>

              <button
                onClick={() => removeMaterial(index, matIdx)}
                className="text-red-600 text-xs px-1 hover:scale-110 transition font-bold"
                title="Remove material"
              >
                −
              </button>

              {matIdx === row.materials.length - 1 && (
                <button
                  onClick={() => addMaterial(index)}
                  className="text-green-600 text-xs px-1 hover:scale-110 transition font-bold"
                  title="Add another material"
                >
                  +
                </button>
              )}
            </div>
          ))
        )}
      </td>

      <td className="border py-1 px-1 align-top">
        {row.materials.map((mat, matIdx) => (
          <div key={mat.id} className="mb-1">
            <NumericInput value={mat.qty} onChange={(val) => updateMaterial(index, matIdx, "qty", val)} placeholder="Qty" />
          </div>
        ))}
      </td>

      <td className="border py-1 px-1 align-top">
        {row.materials.map((mat, matIdx) => {
          const isStandard = !!getCategoryFromMaterial(mat.name);
          return (
            <div key={mat.id} className="mb-1">
              <NumericInput value={mat.lead} onChange={(val) => updateMaterial(index, matIdx, "lead", val)} placeholder="Lead" disabled={isStandard} />
            </div>
          );
        })}
      </td>

      <td className="border p-2 text-center text-gray-700">{formatNumber(row.totalLead)}</td>
      <td className="border p-2 text-center font-medium">{formatNumber(row.total)}</td>
      <td className="border p-2 text-center font-semibold text-gray-700">{isTribal ? formatNumber(row.tribal) : "-"}</td>
      <td className="border p-2 text-center font-bold text-blue-800 bg-blue-50/30">{formatNumber(row.netTotal)}</td>
      <td className="border p-2">
        <AutoTextarea value={row.specs} onChange={(e) => updateRow(index, "specs", e.target.value)} />
      </td>
      <td className="border p-2 text-center sticky right-0 bg-white group-hover:bg-yellow-50 z-10 shadow-[-3px_0_5px_rgba(0,0,0,0.1)]">
        <div className="flex justify-center gap-3">
          <button onClick={() => refreshRow(index)} title="Refresh" className="transition-all duration-200 hover:scale-125 hover:rotate-180 active:scale-90 opacity-60 hover:opacity-100">🔄</button>
          <button onClick={() => deleteRow(row.id)} title="Delete" className="transition-all duration-200 hover:scale-125 hover:text-red-600 active:scale-90 opacity-60 hover:opacity-100">❌</button>
        </div>
      </td>
    </tr>
  );
}

// Static Royalty Row (Bottom Rows)
function StaticRow({
  row,
  index,
  globalIndex,
  isTribal,
  updateRow,
  updateMaterial,
  addMaterial,
  removeMaterial,
  clearRow,
  formatNumber,
  materialList,
}) {
  return (
    <tr className="bg-gray-50 hover:bg-yellow-50 group transition-colors border-t-2 border-gray-200">
      <td className="border p-2 text-center text-gray-300">📌</td>
      <td className="border p-2 text-center font-semibold">{globalIndex}</td>
      <td className="border p-2">
        <AutoTextarea value={row.ssr} onChange={(e) => updateRow(index, "ssr", e.target.value)} className="text-center font-medium" />
      </td>
      <td className="border p-2">
        <AutoTextarea value={row.description} onChange={(e) => updateRow(index, "description", e.target.value)} />
      </td>
      <td className="border p-2">
        <AutoTextarea value={row.unit} onChange={(e) => updateRow(index, "unit", e.target.value)} className="text-center text-xs whitespace-pre-wrap" />
      </td>
      <td className="border p-2">
        <NumericInput value={row.basicRate} onChange={(val) => updateRow(index, "basicRate", val)} />
      </td>
      <td className="border p-2">
        <NumericInput value={row.deduct} onChange={(val) => updateRow(index, "deduct", val)} />
      </td>
      <td className="border p-2 text-center text-gray-700">{formatNumber(row.netAfterDeduct)}</td>

      {/* ✅ Material column for royalty rows with delete and add buttons */}
      <td className="border py-1 px-1 align-top">
        {row.materials.length === 0 ? (
          <button
            onClick={() => addMaterial(index)}
            className="text-green-600 text-xs px-1 hover:scale-110 transition font-bold"
            title="Add material"
          >
            + Add Material
          </button>
        ) : (
          row.materials.map((mat, matIdx) => (
            <div key={mat.id} className="flex items-center gap-1 leading-none mb-1">
              <input
                list={`material-options-${row.id}-${matIdx}`}
                value={mat.name}
                onChange={(e) => updateMaterial(index, matIdx, "name", e.target.value)}
                className="w-full h-[26px] border text-xs px-1 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                placeholder="Select/type"
              />
              <datalist id={`material-options-${row.id}-${matIdx}`}>
                {materialList.map((matName) => (
                  <option key={matName} value={matName} />
                ))}
              </datalist>

              <button
                onClick={() => removeMaterial(index, matIdx)}
                className="text-red-600 text-xs px-1 hover:scale-110 transition font-bold"
                title="Remove material"
              >
                −
              </button>

              {matIdx === row.materials.length - 1 && (
                <button
                  onClick={() => addMaterial(index)}
                  className="text-green-600 text-xs px-1 hover:scale-110 transition font-bold"
                  title="Add another material"
                >
                  +
                </button>
              )}
            </div>
          ))
        )}
      </td>

      <td className="border py-1 px-1 align-top">
        {row.materials.map((mat, matIdx) => (
          <div key={mat.id} className="mb-1">
            <NumericInput value={mat.qty} onChange={(val) => updateMaterial(index, matIdx, "qty", val)} placeholder="Qty" />
          </div>
        ))}
      </td>

      <td className="border py-1 px-1 align-top">
        {row.materials.map((mat, matIdx) => {
          const isStandard = !!getCategoryFromMaterial(mat.name);
          return (
            <div key={mat.id} className="mb-1">
              <NumericInput value={mat.lead} onChange={(val) => updateMaterial(index, matIdx, "lead", val)} placeholder="Lead" disabled={isStandard} />
            </div>
          );
        })}
      </td>

      <td className="border p-2 text-center text-gray-700">{formatNumber(row.totalLead)}</td>
      <td className="border p-2 text-center font-medium">{formatNumber(row.total)}</td>
      <td className="border p-2 text-center font-semibold text-gray-700">{isTribal ? formatNumber(row.tribal) : "-"}</td>
      <td className="border p-2 text-center font-bold text-blue-800 bg-blue-50/30">{formatNumber(row.netTotal)}</td>
      <td className="border p-2">
        <AutoTextarea value={row.specs} onChange={(e) => updateRow(index, "specs", e.target.value)} />
      </td>
      <td className="border p-2 text-center sticky right-0 bg-gray-50 group-hover:bg-yellow-50 z-10 shadow-[-3px_0_5px_rgba(0,0,0,0.1)]">
        <div className="flex justify-center gap-3">
          <button onClick={clearRow} title="Clear values" className="transition-all duration-200 hover:scale-125 hover:text-red-600 active:scale-90 opacity-60 hover:opacity-100">
            🧹
          </button>
        </div>
      </td>
    </tr>
  );
}