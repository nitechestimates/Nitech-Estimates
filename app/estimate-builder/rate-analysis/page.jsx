"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback, Suspense } from "react";
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
import { useStore } from "@/lib/store";

// ── 36 standard material names (must match leads.json keys exactly) ──────────
const STANDARD_MATERIALS = [
  "Sand",
  "Stone ≤40mm (Crushed Metal)",
  "Normal Brick Sider Aggregate",
  "Timber",
  "Stone Aggregate 40mm Normal Size & Above",
  "Murrum",
  "Building Rubbish",
  "Earth",
  "Manure",
  "Sludge",
  "Excavated Rock",
  "Soling Stone",
  "Concrete Block (FORM)",
  "Cement",
  "Lime",
  "Stone Block",
  "Sheet & Plate",
  "Glass in Packs",
  "Distemper",
  "AC Sheet",
  "Fitting Iron Sheet",
  "GI Pipes",
  "CI Pipes",
  "CC Pipes",
  "AC Pipes",
  "Bricks — Per 1000 Nos",
  "Tiles",
  "Half Round Tiles",
  "Roofing Tiles",
  "Manglore Tiles",
  "Steel MS",
  "Steel TMT",
  "Steel HYSD",
  "Structural Steel",
  "Flooring Tiles Ceramic",
  "Flooring Tiles Marbonate",
];

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
        { name: "Stone ≤40mm (Crushed Metal)", qty: data.metal }
      ];
      return materials.map((mat, index) => ({
        id: Date.now().toString() + `-mat-${index}-${Math.random().toString(36).slice(2, 7)}`,
        name: mat.name,
        qty: mat.qty,
        lead: leadSettings[mat.name]?.leadCharge || 0
      }));
    }
  }

  return defaultMaterials;
}

// ========== Numeric Input — fires onChange only on blur to avoid store thrashing ==========
function NumericInput({ value, onChange, disabled = false, placeholder = "" }) {
  // While editing, show the raw text the user is typing; otherwise derive
  // a formatted display directly from the value prop. No useEffect needed.
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef(null);

  const formatted =
    value !== undefined && value !== null
      ? (value || 0).toFixed(3)
      : "0.000";
  const displayValue = editing ? editValue : formatted;

  const handleFocus = () => {
    setEditing(true);
    setEditValue((value || 0) === 0 ? "" : (value || 0).toString());
  };

  const handleChange = (e) => {
    let raw = e.target.value;
    // Allow only digits and one dot
    raw = raw.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 3) raw = parts[0] + "." + parts[1].slice(0, 3);
    setEditValue(raw);
    // Only call onChange for complete valid numbers (not trailing-dot partials)
    if (raw !== "" && !raw.endsWith(".")) {
      const num = parseFloat(raw);
      if (!isNaN(num)) onChange(num);
    } else if (raw === "") {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setEditing(false);
    const num = parseFloat(editValue);
    const safe = isNaN(num) ? 0 : num;
    onChange(safe);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); inputRef.current.blur(); }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
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
  { id: "royalty-sand", isRoyalty: true, ssr: "", description: "Royalty Charges ( sand)", unit: "Cum", basicRate: 237.37, deduct: 0, materials: [{ id: "mat-r1", name: "", qty: 0, lead: 0 }], totalLead: 0, total: 0, tribal: 0, netTotal: 0, specs: "" },
  { id: "royalty-others", isRoyalty: true, ssr: "", description: "Royalty Charges ( others)", unit: "Cum", basicRate: 216.18, deduct: 0, materials: [{ id: "mat-r2", name: "", qty: 0, lead: 0 }], totalLead: 0, total: 0, tribal: 0, netTotal: 0, specs: "" },
  { id: "lab-charges", isRoyalty: true, ssr: "", description: "laboratory charges ", unit: "for all test", basicRate: 3036, deduct: 0, materials: [{ id: "mat-r3", name: "", qty: 1, lead: 0 }], totalLead: 0, total: 3036, tribal: 0, netTotal: 3036, specs: "" }
];

const formatNumber = (num) => (num !== undefined && num !== null && !isNaN(num) ? Number(num).toFixed(3) : "0.000");

function RateAnalysisContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // ── Custom Dialog Modal State ──
  const [customDialog, setCustomDialog] = useState(null);

  const triggerAlert = (message, title = "Notification") => {
    const previouslyActive = typeof document !== "undefined" ? document.activeElement : null;
    return new Promise((resolve) => {
      setCustomDialog({
        title,
        message,
        isConfirm: false,
        onConfirm: () => {
          setCustomDialog(null);
          resolve(true);
          setTimeout(() => {
            if (previouslyActive && typeof previouslyActive.focus === "function") {
              previouslyActive.focus();
            }
          }, 50);
        }
      });
    });
  };

  const triggerConfirm = (message, title = "Confirmation") => {
    const previouslyActive = typeof document !== "undefined" ? document.activeElement : null;
    return new Promise((resolve) => {
      setCustomDialog({
        title,
        message,
        isConfirm: true,
        onConfirm: () => {
          setCustomDialog(null);
          resolve(true);
          setTimeout(() => {
            if (previouslyActive && typeof previouslyActive.focus === "function") {
              previouslyActive.focus();
            }
          }, 50);
        },
        onCancel: () => {
          setCustomDialog(null);
          resolve(false);
          setTimeout(() => {
            if (previouslyActive && typeof previouslyActive.focus === "function") {
              previouslyActive.focus();
            }
          }, 50);
        }
      });
    });
  };

  const loadId = searchParams.get("load");
  const nameFromURL = searchParams.get("name");
  const tribalFromURL = searchParams.get("tribal") === "true";
  const tribalPercentFromURL = searchParams.get("tribalPercent") || "";
  const estimateNameFromURL = searchParams.get("estimateName") || "";
  const yojanaFromURL = searchParams.get("yojana") || "";
  const estAmountFromURL = searchParams.get("estAmount") || "";
  const labourInsuranceFromURL = searchParams.get("labourInsurance") || "";
  const yearFromURL = searchParams.get("year") || "";
  const distFromURL = searchParams.get("dist") || "";
  const talukaFromURL = searchParams.get("taluka") || "";
  const villageFromURL = searchParams.get("village") || "";
  const headDivisionFromURL = searchParams.get("headDivision") || "";
  const subDivisionFromURL = searchParams.get("subDivision") || "";
  const deputyEngineerFromURL = searchParams.get("deputyEngineer") || "";
  const jrEngineerFromURL = searchParams.get("jrEngineer") || "";
  const adminApprovalNoFromURL = searchParams.get("adminApprovalNo") || "";

  // Zustand store
  const leadSettings = useStore((state) => state.leadSettings);
  const raRows = useStore((state) => state.raRows);
  const setRARows = useStore((state) => state.setRARows);
  const raBottomRows = useStore((state) => state.raBottomRows);
  const setRABottomRows = useStore((state) => state.setRABottomRows);
  const estimateName = useStore((state) => state.estimateName);
  const nameOfWork = useStore((state) => state.nameOfWork);
  const isTribal = useStore((state) => state.isTribal);
  const tribalPercent = useStore((state) => state.tribalPercent);
  const yojana = useStore((state) => state.yojana);
  const estAmount = useStore((state) => state.estAmount);
  const labourInsurance = useStore((state) => state.labourInsurance);
  const year = useStore((state) => state.year);
  const dist = useStore((state) => state.dist);
  const taluka = useStore((state) => state.taluka);
  const village = useStore((state) => state.village);
  const headDivision = useStore((state) => state.headDivision);
  const subDivision = useStore((state) => state.subDivision);
  const deputyEngineer = useStore((state) => state.deputyEngineer);
  const jrEngineer = useStore((state) => state.jrEngineer);
  const adminApprovalNo = useStore((state) => state.adminApprovalNo);
  const currentEstimateId = useStore((state) => state.currentEstimateId);
  const setEstimateMeta = useStore((state) => state.setEstimateMeta);
  const syncMeasurementFromRA = useStore((state) => state.syncMeasurementFromRA);
  const yojanaList = useStore((state) => state.yojanaList);
  const addYojana = useStore((state) => state.addYojana);
  const setMeasurementItems = useStore((state) => state.setMeasurementItems);
  const setAbstractCustomData = useStore((state) => state.setAbstractCustomData);

  // Local UI state
  const [itemCode, setItemCode] = useState("");
  const [insertIndex, setInsertIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const searchRef = useRef(null);
  const [editYojanaDropdown, setEditYojanaDropdown] = useState(false);
  const editYojanaRef = useRef(null);

  const [localRows, setLocalRows] = useState(() => raRows);
  const [localBottomRows, setLocalBottomRows] = useState(() => raBottomRows && raBottomRows.length > 0 ? raBottomRows : defaultBottomRows);

  const [modalFields, setModalFields] = useState({
    estimateName: "",
    nameOfWork: "",
    yojana: "",
    isTribal: false,
    tribalPercent: "",
    estAmount: "",
    labourInsurance: "",
    year: "",
    dist: "",
    taluka: "",
    village: "",
    headDivision: "",
    subDivision: "",
    deputyEngineer: "",
    jrEngineer: "",
    adminApprovalNo: "",
  });

  const handleOpenEditModal = () => {
    setModalFields({
      estimateName: estimateName || "",
      nameOfWork: nameOfWork || "",
      yojana: yojana || "",
      isTribal: !!isTribal,
      tribalPercent: tribalPercent || "",
      estAmount: estAmount || "",
      labourInsurance: labourInsurance || "",
      year: year || "",
      dist: dist || "",
      taluka: taluka || "",
      village: village || "",
      headDivision: headDivision || "",
      subDivision: subDivision || "",
      deputyEngineer: deputyEngineer || "",
      jrEngineer: jrEngineer || "",
      adminApprovalNo: adminApprovalNo || "",
    });
    setShowEditModal(true);
  };

  // Build material list: standard 36 + any custom/regular leads from leadSettings
  const materialList = useMemo(() => {
    const fromLeads = Object.keys(leadSettings).filter(
      (k) => !STANDARD_MATERIALS.includes(k)
    );
    return [...STANDARD_MATERIALS, ...fromLeads];
  }, [leadSettings]);

  useEffect(() => {
    if (!loadId) return;
    setLoadingEstimate(true);
    fetch(`/api/estimate/${loadId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const loadedRows = data.data.rows || [];
          const bRows = loadedRows.filter((r) => r.isRoyalty);
          const standardRows = loadedRows.filter((r) => !r.isRoyalty).map((r, i) => ({ ...r, srNo: i + 1 }));
          const bottomRows = [...(bRows.length ? bRows : defaultBottomRows)];
          const hasLabCharges = bottomRows.some(r => r.id === "lab-charges" || r.description.toLowerCase().includes("lab"));
          if (!hasLabCharges) {
            bottomRows.push({ id: "lab-charges", isRoyalty: true, ssr: "", description: "laboratory charges ", unit: "for all test", basicRate: 3036, deduct: 0, materials: [{ id: "mat-r3", name: "", qty: 1, lead: 0 }], totalLead: 0, total: 3036, tribal: 0, netTotal: 3036, specs: "" });
          }
          // Set BOTH store AND local state — avoids needing the sync useEffect
          setRARows(standardRows);
          setLocalRows(standardRows);
          setRABottomRows(bottomRows);
          setLocalBottomRows(bottomRows);
          setEstimateMeta({
            estimateName:     data.data.estimateName     || "",
            nameOfWork:       data.data.nameOfWork       || "",
            isTribal:         data.data.isTribal         || false,
            tribalPercent:    data.data.tribalPercent    || "",
            yojana:           data.data.yojana           || "",
            estAmount:        data.data.estAmount        || "",
            labourInsurance:  data.data.labourInsurance  || "",
            year:             data.data.year             || "",
            dist:             data.data.dist             || "",
            taluka:           data.data.taluka           || "",
            village:          data.data.village          || "",
            headDivision:     data.data.headDivision     || "",
            subDivision:      data.data.subDivision      || "",
            deputyEngineer:   data.data.deputyEngineer   || "",
            jrEngineer:       data.data.jrEngineer       || "",
            adminApprovalNo:  data.data.adminApprovalNo  || "",
            currentEstimateId: data.data._id,
          });
          setMeasurementItems(data.data.measurementItems || []);
          setAbstractCustomData(data.data.abstractCustomData || {});
          syncMeasurementFromRA();
        }
        setLoadingEstimate(false);
      })
      .catch((err) => { console.error(err); setLoadingEstimate(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId]);

  // Apply URL params on mount — always overwrite for new estimates (no loadId)
  useEffect(() => {
    if (loadId) return; // DB load will set these
    Promise.resolve().then(() => {
      if (!useStore.getState().raBottomRows || useStore.getState().raBottomRows.length === 0) {
        setRABottomRows(defaultBottomRows);
      }
      const updates = {};
      // Always apply URL params when creating a new estimate — do NOT guard on !s.field
      // because resetEstimate() may not have flushed to the persisted store yet
      if (nameFromURL)             updates.nameOfWork        = nameFromURL;
      if (searchParams.has("tribal"))       updates.isTribal          = tribalFromURL;
      if (tribalPercentFromURL)    updates.tribalPercent     = tribalPercentFromURL;
      if (estimateNameFromURL)     updates.estimateName      = estimateNameFromURL;
      if (yojanaFromURL)           updates.yojana            = yojanaFromURL;
      if (estAmountFromURL)        updates.estAmount         = estAmountFromURL;
      if (labourInsuranceFromURL)  updates.labourInsurance   = labourInsuranceFromURL;
      if (yearFromURL)             updates.year              = yearFromURL;
      if (distFromURL)             updates.dist              = distFromURL;
      if (talukaFromURL)           updates.taluka            = talukaFromURL;
      if (villageFromURL)          updates.village           = villageFromURL;
      if (headDivisionFromURL)     updates.headDivision      = headDivisionFromURL;
      if (subDivisionFromURL)      updates.subDivision       = subDivisionFromURL;
      if (deputyEngineerFromURL)   updates.deputyEngineer    = deputyEngineerFromURL;
      if (jrEngineerFromURL)       updates.jrEngineer        = jrEngineerFromURL;
      if (adminApprovalNoFromURL)  updates.adminApprovalNo   = adminApprovalNoFromURL;
      if (Object.keys(updates).length > 0) setEstimateMeta(updates);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close edit yojana dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (editYojanaRef.current && !editYojanaRef.current.contains(e.target)) setEditYojanaDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) setIsDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search effects
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        fetch(`/api/search-items?q=${encodeURIComponent(searchQuery)}`)
          .then((res) => res.json())
          .then((data) => { setSearchResults(data.data || []); setIsDropdownOpen(true); })
          .catch(console.error);
      } else {
        setSearchResults([]); setIsDropdownOpen(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const highlightText = (text, highlight) => {
    if (!highlight.trim() || !text) return text;
    const terms = highlight.trim().split(/\s+/).filter(t => t.length > 0);
    const regex = new RegExp(`(${terms.join("|")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) => regex.test(part) ? <span key={i} className="bg-yellow-300 font-bold">{part}</span> : part);
  };

  // calculateRow can be defined outside or left here, but let's make it pure
  const calculateRow = (row, currentIsTribal, currentTribalPct) => {
    const netAfterDeduct = (row.basicRate || 0) - (row.deduct || 0);
    const totalLead = (row.materials || []).reduce((sum, m) => sum + ((m.qty || 0) * (m.lead || 0)), 0);
    const total = netAfterDeduct + totalLead;
    const pct = currentIsTribal ? (parseFloat(currentTribalPct) || 0) : 0;
    const tribalAmount = (total * pct) / 100;
    const netTotal = total + tribalAmount;
    return { ...row, netAfterDeduct, totalLead, total, tribal: tribalAmount, netTotal };
  };

  const addItem = async (specificCode) => {
    const codeToUse = typeof specificCode === "string" ? specificCode : itemCode;
    if (!codeToUse) return;
    const existingRow = localRows.find(r => r.ssr === codeToUse.trim());
    if (existingRow) {
      const approved = await triggerConfirm(`Item with SSR No. "${codeToUse}" already exists in your estimate. Do you want to add another copy?`, "Duplicate SSR Item");
      if (!approved) {
        if (typeof specificCode !== "string") setItemCode("");
        return;
      }
    }
    try {
      const code = codeToUse.trim();
      const res = await fetch(`/api/get-item?code=${code}`);
      const data = await res.json();
      if (!data || data.error) {
        await triggerAlert(`Item with SSR No. "${code}" not found in Nashik PWD SSR!`, "SSR Item Not Found");
        return;
      }
      const completedRate = parseFloat(data["Completed Rate for 2021-22 excluding GST In Rs."]) || 0;
      const description = data["Description of the item"] || "";
      const unitFormatted = (data["Unit"] || "").trim().split(/\s+/).join("\n");
      const autoMaterials = getDefaultMaterialsForDescription(description, leadSettings);
      const newRow = calculateRow({
        id: Date.now().toString(), srNo: 0, ssr: code, description, unit: unitFormatted,
        basicRate: completedRate, specs: data["Additional Specification"] || "",
        deduct: 0, materials: autoMaterials, tribal: 0,
      }, isTribal);
      let updated = [...localRows];
      if (insertIndex !== null) updated.splice(insertIndex, 0, newRow);
      else updated.push(newRow);
      updated = updated.map((r, i) => ({ ...r, srNo: i + 1 }));
      setLocalRows(updated); setRARows(updated); setInsertIndex(null);
      syncMeasurementFromRA();
      if (typeof specificCode !== "string") setItemCode("");
    } catch (err) { console.error(err); }
  };

  const updateRow = useCallback((i, field, value) => {
    let next;
    setLocalRows(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      const s = useStore.getState();
      updated[i] = calculateRow(updated[i], s.isTribal, s.tribalPercent);
      next = updated;
      return updated;
    });
    setTimeout(() => { if (next) setRARows(next); }, 0);
  }, [setRARows]);

  const pruneUnusedRALeads = useCallback((customRows = null, customBottomRows = null) => {
    const s = useStore.getState();
    const rows = customRows || localRows;
    const bRows = customBottomRows || localBottomRows;

    const usedMaterials = new Set();
    rows.forEach(r => {
      (r.materials || []).forEach(m => {
        if (m.name?.trim()) usedMaterials.add(m.name.trim());
      });
    });
    bRows.forEach(r => {
      (r.materials || []).forEach(m => {
        if (m.name?.trim()) usedMaterials.add(m.name.trim());
      });
    });

    let changed = false;
    const updatedSettings = { ...s.leadSettings };
    Object.keys(updatedSettings).forEach(name => {
      const entry = updatedSettings[name];
      if (entry && entry.type === "custom" && entry.origin === "ra" && !usedMaterials.has(name)) {
        delete updatedSettings[name];
        changed = true;
      }
    });

    if (changed) {
      s.setLeadSettings(updatedSettings);
      s.setLeadOrder(s.leadOrder.filter(k => updatedSettings[k]));
      setTimeout(s.recalculateRARowsWithLeadSettings, 0);
    }
  }, [localRows, localBottomRows]);

  const commitMaterialName = useCallback((rowIndex, matIndex, value) => {
    const matName = value?.trim();
    if (!matName) return;
    const s = useStore.getState();
    if (!STANDARD_MATERIALS.includes(matName) && !s.leadSettings[matName]) {
      s.updateLeadSetting(matName, { distance: 0, leadCharge: 0, unit: "", type: "custom", origin: "ra" });
    }
    let next;
    setLocalRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.materials = [...row.materials];
      row.materials[matIndex] = { 
        ...row.materials[matIndex], 
        lead: useStore.getState().leadSettings[matName]?.leadCharge || 0 
      };
      updated[rowIndex] = calculateRow(row, s.isTribal, s.tribalPercent);
      next = updated;
      return updated;
    });
    setTimeout(() => { 
      if (next) {
        setRARows(next);
        pruneUnusedRALeads(next, null);
      }
    }, 0);
  }, [setRARows, pruneUnusedRALeads]);

  const updateMaterial = useCallback((rowIndex, matIndex, field, value) => {
    let next;
    setLocalRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.materials = [...row.materials];
      row.materials[matIndex] = { ...row.materials[matIndex], [field]: value };
      const s = useStore.getState();
      if (field === "name") {
        const matName = value?.trim();
        row.materials[matIndex].lead = s.leadSettings[matName]?.leadCharge || 0;
      }
      updated[rowIndex] = calculateRow(row, s.isTribal, s.tribalPercent);
      next = updated;
      return updated;
    });
    setTimeout(() => { if (next) setRARows(next); }, 0);
  }, [setRARows]);

  const addMaterial = useCallback((rowIndex) => {
    let next;
    setLocalRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.materials = [...row.materials, { id: Date.now().toString() + "-mat" + Math.random(), name: "", qty: 0, lead: 0 }];
      updated[rowIndex] = row;
      next = updated;
      return updated;
    });
    setTimeout(() => { if (next) setRARows(next); }, 0);
  }, [setRARows]);

  const removeMaterial = useCallback((rowIndex, matIndex) => {
    let next;
    setLocalRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.materials = [...row.materials];
      row.materials.splice(matIndex, 1);
      const s = useStore.getState();
      updated[rowIndex] = calculateRow(row, s.isTribal, s.tribalPercent);
      next = updated;
      return updated;
    });
    setTimeout(() => { 
      if (next) {
        setRARows(next);
        pruneUnusedRALeads(next, null);
      }
    }, 0);
  }, [setRARows, pruneUnusedRALeads]);

  const deleteRow = useCallback((id) => {
    let next;
    setLocalRows(prev => {
      const updated = prev.filter(r => r.id !== id).map((r, i) => ({ ...r, srNo: i + 1 }));
      next = updated;
      return updated;
    });
    setTimeout(() => {
      if (next) {
        setRARows(next);
        pruneUnusedRALeads(next, null);
      }
      useStore.getState().syncMeasurementFromRA();
    }, 0);
  }, [setRARows, pruneUnusedRALeads]);

  const refreshRow = useCallback(async (i) => {
    const approved = await triggerConfirm("Revert to default SSR values? Your edits will be lost.", "Revert SSR Item");
    if (!approved) return;
    const code = useStore.getState().raRows[i]?.ssr?.trim();
    if (!code) return;
    const res = await fetch(`/api/get-item?code=${code}`);
    const data = await res.json();
    if (!data || data.error) return;
    const completedRate = parseFloat(data["Completed Rate for 2021-22 excluding GST In Rs."]) || 0;
    const description = data["Description of the item"] || "";
    const unitFormatted = (data["Unit"] || "").trim().split(/\s+/).join("\n");
    
    let next;
    setLocalRows(prev => {
      const updated = [...prev];
      const s = useStore.getState();
      const autoMaterials = getDefaultMaterialsForDescription(description, s.leadSettings);
      updated[i] = calculateRow({ ...updated[i], description, unit: unitFormatted, basicRate: completedRate, specs: data["Additional Specification"] || "", deduct: 0, materials: autoMaterials, tribal: 0 }, s.isTribal, s.tribalPercent);
      next = updated;
      return updated;
    });
    setTimeout(() => { 
      if (next) {
        setRARows(next);
        pruneUnusedRALeads(next, null);
      }
    }, 0);
  }, [setRARows, pruneUnusedRALeads]);

  // Bottom rows handlers
  const updateBottomRow = useCallback((i, field, value) => {
    let next;
    setLocalBottomRows(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      const s = useStore.getState();
      updated[i] = calculateRow(updated[i], s.isTribal, s.tribalPercent);
      next = updated;
      return updated;
    });
    setTimeout(() => { if (next) setRABottomRows(next); }, 0);
  }, [setRABottomRows]);

  const commitBottomMaterialName = useCallback((rowIndex, matIndex, value) => {
    const matName = value?.trim();
    if (!matName) return;
    const s = useStore.getState();
    if (!STANDARD_MATERIALS.includes(matName) && !s.leadSettings[matName]) {
      s.updateLeadSetting(matName, { distance: 0, leadCharge: 0, unit: "", type: "custom", origin: "ra" });
    }
    let next;
    setLocalBottomRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.materials = [...row.materials];
      row.materials[matIndex] = { 
        ...row.materials[matIndex], 
        lead: useStore.getState().leadSettings[matName]?.leadCharge || 0 
      };
      updated[rowIndex] = calculateRow(row, s.isTribal, s.tribalPercent);
      next = updated;
      return updated;
    });
    setTimeout(() => { 
      if (next) {
        setRABottomRows(next);
        pruneUnusedRALeads(null, next);
      }
    }, 0);
  }, [setRABottomRows, pruneUnusedRALeads]);

  const updateBottomMaterial = useCallback((rowIndex, matIndex, field, value) => {
    let next;
    setLocalBottomRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.materials = [...row.materials];
      row.materials[matIndex] = { ...row.materials[matIndex], [field]: value };
      const s = useStore.getState();
      if (field === "name") {
        const matName = value?.trim();
        row.materials[matIndex].lead = s.leadSettings[matName]?.leadCharge || 0;
      }
      updated[rowIndex] = calculateRow(row, s.isTribal, s.tribalPercent);
      next = updated;
      return updated;
    });
    setTimeout(() => { if (next) setRABottomRows(next); }, 0);
  }, [setRABottomRows]);

  const addBottomMaterial = useCallback((rowIndex) => {
    let next;
    setLocalBottomRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.materials = [...row.materials, { id: Date.now().toString() + "-mat", name: "", qty: 0, lead: 0 }];
      updated[rowIndex] = row;
      next = updated;
      return updated;
    });
    setTimeout(() => { if (next) setRABottomRows(next); }, 0);
  }, [setRABottomRows]);

  const removeBottomMaterial = useCallback((rowIndex, matIndex) => {
    let next;
    setLocalBottomRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };
      row.materials = [...row.materials];
      row.materials.splice(matIndex, 1);
      const s = useStore.getState();
      updated[rowIndex] = calculateRow(row, s.isTribal, s.tribalPercent);
      next = updated;
      return updated;
    });
    setTimeout(() => { 
      if (next) {
        setRABottomRows(next);
        pruneUnusedRALeads(null, next);
      }
    }, 0);
  }, [setRABottomRows, pruneUnusedRALeads]);

  const clearBottomRow = useCallback(async (i) => {
    const approved = await triggerConfirm("Are you sure you want to clear this row?", "Clear Row");
    if (!approved) return;
    let next;
    setLocalBottomRows(prev => {
      const updated = [...prev];
      updated[i] = { ...defaultBottomRows[i], id: updated[i].id };
      next = updated;
      return updated;
    });
    setTimeout(() => { 
      if (next) {
        setRABottomRows(next);
        pruneUnusedRALeads(null, next);
      }
    }, 0);
  }, [setRABottomRows, pruneUnusedRALeads]);

  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = localRows.findIndex(r => r.id === active.id);
    const newIndex = localRows.findIndex(r => r.id === over.id);
    const newRows = arrayMove(localRows, oldIndex, newIndex);
    const updated = newRows.map((r, i) => ({ ...r, srNo: i + 1 }));
    setLocalRows(updated); setRARows(updated);
  };


  const saveEstimate = async (silent = false) => {
    if (!session) { if (!silent) await triggerAlert("You must be logged in.", "Auth Required"); return; }
    const currentName = useStore.getState().nameOfWork || nameOfWork;
    if (!currentName.trim()) { if (!silent) await triggerAlert("Please enter a Name of Work first.", "Missing Field"); return; }
    setSaving(true);
    try {
      const s = useStore.getState();
      const response = await fetch("/api/estimate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateName: s.estimateName, nameOfWork: s.nameOfWork,
          isTribal: s.isTribal, tribalPercent: s.tribalPercent, yojana: s.yojana,
          estAmount: s.estAmount, labourInsurance: s.labourInsurance, year: s.year,
          dist: s.dist, taluka: s.taluka, village: s.village,
          headDivision: s.headDivision, subDivision: s.subDivision,
          deputyEngineer: s.deputyEngineer, jrEngineer: s.jrEngineer,
          adminApprovalNo: s.adminApprovalNo,
          rows: [...localRows, ...localBottomRows],
          measurementItems: s.measurementItems,
          estimateId: s.currentEstimateId,
          leadSettings: s.leadSettings, leadOrder: s.leadOrder,
          abstractCustomData: s.abstractCustomData,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.id) setEstimateMeta({ currentEstimateId: data.id });
        setLastSavedTime(new Date());
        syncMeasurementFromRA();
      } else {
        console.error("Save failed:", data);
        if (!silent) await triggerAlert(data.error || "Failed to save estimate.", "Save Error");
      }
    } catch (error) {
      console.error("Save error:", error);
      if (!silent) await triggerAlert("Network error — could not save.", "Save Error");
    } finally { setSaving(false); }
  };

  // Auto-save every 60 s — use a ref so interval is created once and never restarts
  const saveRef = useRef(null);
  useEffect(() => { saveRef.current = () => saveEstimate(true); });
  useEffect(() => {
    const id = setInterval(() => saveRef.current?.(), 60000);
    return () => clearInterval(id);
  }, []); // empty deps — interval created once

  // Save yojana to list when editing in modal
  const handleModalYojanaChange = (val) => {
    setModalFields(prev => ({ ...prev, yojana: val }));
    setEditYojanaDropdown(true);
  };
  const handleModalYojanaSelect = (val) => {
    setModalFields(prev => ({ ...prev, yojana: val }));
    setEditYojanaDropdown(false);
  };
  const handleModalSave = () => {
    // 1. Save metadata to store
    setEstimateMeta({
      estimateName: modalFields.estimateName,
      nameOfWork: modalFields.nameOfWork,
      isTribal: modalFields.isTribal,
      tribalPercent: modalFields.tribalPercent,
      yojana: modalFields.yojana,
      estAmount: modalFields.estAmount,
      labourInsurance: modalFields.labourInsurance,
      year: modalFields.year,
      dist: modalFields.dist,
      taluka: modalFields.taluka,
      village: modalFields.village,
      headDivision: modalFields.headDivision,
      subDivision: modalFields.subDivision,
      deputyEngineer: modalFields.deputyEngineer,
      jrEngineer: modalFields.jrEngineer,
      adminApprovalNo: modalFields.adminApprovalNo,
    });

    // 2. Add yojana to list if new
    const y = modalFields.yojana?.trim();
    if (y && !yojanaList.includes(y)) addYojana(y);

    // 3. Explicitly recalculate local & store rows for Tribal settings
    const applyRecalculation = (rows) => rows.map(row => {
      const netAfterDeduct = (row.basicRate || 0) - (row.deduct || 0);
      const totalLead = (row.materials || []).reduce((sum, m) => sum + ((m.qty || 0) * (m.lead || 0)), 0);
      const total = netAfterDeduct + totalLead;
      const pct = modalFields.isTribal ? (parseFloat(modalFields.tribalPercent) || 0) : 0;
      const tribalAmount = (total * pct) / 100;
      const netTotal = total + tribalAmount;
      return { ...row, netAfterDeduct, totalLead, total, tribal: tribalAmount, netTotal };
    });

    setLocalRows(prev => {
      const nextRows = applyRecalculation(prev);
      setTimeout(() => setRARows(nextRows), 0);
      return nextRows;
    });

    setLocalBottomRows(prev => {
      const nextRows = applyRecalculation(prev);
      setTimeout(() => setRABottomRows(nextRows), 0);
      return nextRows;
    });

    setShowEditModal(false);
  };

  if (loadingEstimate) return <div className="p-4 bg-yellow-50 min-h-screen"><Tabs /><div className="flex justify-center items-center h-[70vh]"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div></div>;

  const filteredYojanaList = (yojanaList || []).filter(y => y.toLowerCase().includes((modalFields.yojana || "").toLowerCase()));

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black animate-fade-in-up">
      <Tabs />
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="font-bold">Name of Work: </span>
          <input value={nameOfWork} onChange={e => setEstimateMeta({ nameOfWork: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="border p-2 w-[400px] rounded" placeholder="Enter Name of Work" />
          {isTribal && <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded">Tribal {tribalPercent ? `(${tribalPercent}%)` : ""}</span>}
        </div>
        <div className="flex gap-2">
          {/* Edit Details Button */}
          <button
            onClick={handleOpenEditModal}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit Details
          </button>
<DownloadPdfButton 
  estimateId={currentEstimateId} 
  nameOfWork={nameOfWork} 
  isTribal={isTribal}
  tribalPercent={tribalPercent}
  rows={[...localRows, ...localBottomRows]} 
  leadSettings={leadSettings}
  labCharges={3036}
/>          <div className="flex items-center gap-3">
            {lastSavedTime && (
              <span className="text-xs text-gray-500 flex items-center gap-1 font-medium bg-gray-100 px-2 py-1 rounded-md border border-gray-200 shadow-sm animate-fade-in">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last saved at {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button onClick={() => saveEstimate(false)} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 shadow-md transition-all">{saving ? "Saving..." : "Save Estimate"}</button>
          </div>
        </div>
      </div>

      {/* ===== EDIT DETAILS MODAL ===== */}
      {showEditModal && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowEditModal(false)} />
          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Edit Estimate Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update any project info and click Save.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-700 transition p-1 rounded hover:bg-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Estimate Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Estimate Name <span className="text-gray-400 font-normal">(shown in history)</span></label>
                <input
                  type="text"
                  value={modalFields.estimateName || ""}
                  onChange={e => setModalFields(prev => ({ ...prev, estimateName: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  placeholder="Short name for history"
                />
              </div>

              {/* Name of Work */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name of Work</label>
                <input
                  type="text"
                  value={modalFields.nameOfWork}
                  onChange={e => setModalFields(prev => ({ ...prev, nameOfWork: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  placeholder="Name of Work"
                />
              </div>

              {/* Yojana */}
              <div className="relative" ref={editYojanaRef}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Yojana / Fund</label>
                <input
                  type="text"
                  value={modalFields.yojana || ""}
                  onChange={e => handleModalYojanaChange(e.target.value)}
                  onFocus={() => setEditYojanaDropdown(true)}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  placeholder="Select or type new"
                />
                {editYojanaDropdown && filteredYojanaList.length > 0 && (
                  <ul className="absolute z-10 bg-white border border-gray-200 w-full mt-1 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                    {filteredYojanaList.map(y => (
                      <li key={y} onClick={() => handleModalYojanaSelect(y)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800">{y}</li>
                    ))}
                  </ul>
                )}
                {(modalFields.yojana || "").trim() && !yojanaList.includes((modalFields.yojana || "").trim()) && (
                  <p className="text-xs text-gray-400 mt-1">New entry – will be saved on submit.</p>
                )}
              </div>

              {/* Tribal / Non-Tribal */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Area Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalFields(prev => ({ ...prev, isTribal: false, tribalPercent: "" }))}
                    className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm ${
                      !modalFields.isTribal ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {!modalFields.isTribal && <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center"><svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></span>}
                    Non-Tribal
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFields(prev => ({ ...prev, isTribal: true }))}
                    className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm ${
                      modalFields.isTribal ? "border-orange-500 bg-orange-50 text-orange-700 font-bold" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {modalFields.isTribal && <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-orange-500 rounded-full flex items-center justify-center"><svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></span>}
                    Tribal
                  </button>
                </div>
                {/* Tribal % */}
                <div className={`mt-2 transition-all duration-300 overflow-hidden ${modalFields.isTribal ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tribal Percentage</label>
                  <div className="relative">
                    <input
                      type="number" min="0" max="100"
                      value={modalFields.tribalPercent || ""}
                      disabled={!modalFields.isTribal}
                      onChange={e => {
                        const v = e.target.value;
                        setModalFields(prev => {
                          const updated = { ...prev, tribalPercent: v };
                          if (v === "0" || v === "") {
                            updated.isTribal = false;
                            updated.tribalPercent = "";
                          }
                          return updated;
                        });
                      }}
                      className="w-full border border-orange-300 bg-orange-50 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm text-gray-900 pr-8"
                      placeholder="Enter %"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold text-sm">%</span>
                  </div>
                </div>
              </div>

              {/* Est. Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Est. Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
                  <input
                    type="number" min="0"
                    value={modalFields.estAmount || ""}
                    onChange={e => setModalFields(prev => ({ ...prev, estAmount: e.target.value }))}
                    className="w-full border border-gray-300 pl-7 pr-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                    placeholder="Estimated amount in rupees"
                  />
                </div>
              </div>

              {/* Labour Insurance */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Labour Insurance (%)</label>
                <div className="relative">
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={modalFields.labourInsurance || ""}
                    onChange={e => setModalFields(prev => ({ ...prev, labourInsurance: e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 pr-8"
                    placeholder="Labour insurance %"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">%</span>
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
                <input
                  type="text"
                  value={modalFields.year || ""}
                  onChange={e => setModalFields(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  placeholder="e.g. 2024-25"
                />
              </div>

              {/* Dist / Taluka / Village */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Dist.</label>
                  <input type="text" value={modalFields.dist || ""} onChange={e => setModalFields(prev => ({ ...prev, dist: e.target.value }))} className="w-full border border-gray-300 px-2 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" placeholder="District" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Taluka</label>
                  <input type="text" value={modalFields.taluka || ""} onChange={e => setModalFields(prev => ({ ...prev, taluka: e.target.value }))} className="w-full border border-gray-300 px-2 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" placeholder="Taluka" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Village</label>
                  <input type="text" value={modalFields.village || ""} onChange={e => setModalFields(prev => ({ ...prev, village: e.target.value }))} className="w-full border border-gray-300 px-2 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" placeholder="Village" />
                </div>
              </div>

              {/* Head Division */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name of Head Division</label>
                <input type="text" value={modalFields.headDivision || ""} onChange={e => setModalFields(prev => ({ ...prev, headDivision: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" placeholder="Head Division" />
              </div>

              {/* Sub-Division */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name of Sub-Division</label>
                <input type="text" value={modalFields.subDivision || ""} onChange={e => setModalFields(prev => ({ ...prev, subDivision: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" placeholder="Sub-Division" />
              </div>

              {/* Deputy Engineer */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name of Deputy Engineer</label>
                <input type="text" value={modalFields.deputyEngineer || ""} onChange={e => setModalFields(prev => ({ ...prev, deputyEngineer: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" placeholder="Deputy Engineer" />
              </div>

              {/* Jr. / Sectional Engineer */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name of Jr. / Sectional Engineer</label>
                <input type="text" value={modalFields.jrEngineer || ""} onChange={e => setModalFields(prev => ({ ...prev, jrEngineer: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" placeholder="Jr. / Sectional Engineer" />
              </div>

              {/* Administrative Approval No. */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Administrative Approval No.</label>
                <input type="text" value={modalFields.adminApprovalNo || ""} onChange={e => setModalFields(prev => ({ ...prev, adminApprovalNo: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" placeholder="e.g. AA/2024/XYZ/123" />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={handleModalSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-white border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Search Bar */}
      <div className="flex gap-4 mb-4 items-center">
        <div className="flex gap-2">
          <input value={itemCode} onChange={e => setItemCode(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} className="border p-2 w-[150px] shadow-sm rounded-md" placeholder="SSR Item No" />
          <button onClick={() => addItem()} className="bg-black text-white px-4 py-2 hover:bg-gray-800 transition-colors rounded-md shadow-md">Add Item</button>
        </div>
        <div className="text-gray-400 font-bold">OR</div>
        <div className="relative flex-1 max-w-3xl" ref={searchRef}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => { if (searchResults.length > 0) setIsDropdownOpen(true); }} className="border p-2 w-full shadow-sm rounded-md" placeholder="Search words in description..." />
          {isDropdownOpen && searchResults.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-gray-300 mt-1 max-h-[400px] overflow-y-auto shadow-xl rounded-md">
              {searchResults.map((res, idx) => (
                <li key={`${res.code}-${idx}`} onClick={() => { setSearchQuery(""); setIsDropdownOpen(false); addItem(res.code); }} className="p-3 border-b hover:bg-yellow-50 cursor-pointer text-sm transition-colors">
                  <div className="font-bold text-blue-700 mb-1">SSR: {res.code}</div>
                  <div className="text-gray-800">{highlightText(res.description, searchQuery)}</div>
                </li>
              ))}
            </ul>
          )}
          {isDropdownOpen && searchQuery.length > 2 && searchResults.length === 0 && <div className="absolute z-50 w-full bg-white border border-gray-300 mt-1 p-3 shadow-lg rounded-md text-gray-500">No items found matching &ldquo;{searchQuery}&rdquo;</div>}
        </div>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localRows.map(r => r.id)} strategy={verticalListSortingStrategy}>
          <div className="overflow-x-auto relative shadow-sm border rounded min-h-[450px]">
            <table className="w-full border text-xs bg-white relative" style={{ minWidth: "1400px" }}>
              <thead className="bg-gray-200 border-b-2 border-gray-300">
                <tr className="text-center font-bold text-gray-700">
                  <th className="border p-2">☰</th><th className="border p-2 w-[40px]">Sr</th><th className="border p-2 w-[80px]">SSR</th><th className="border p-2 min-w-[350px]">Description</th><th className="border p-2 w-[120px]">Unit</th><th className="border p-2 w-[90px]">Basic Rate</th><th className="border p-2 w-[100px]">Deduct (SCADA)</th><th className="border p-2 w-[90px]">Net (5-6)</th><th className="border p-2 w-[140px]">Material</th><th className="border p-2 w-[70px]">Qty</th><th className="border p-2 w-[90px]">Lead (Rs.)</th><th className="border p-2 w-[90px]">Total Lead</th><th className="border p-2 w-[100px]">Total (7+11)</th><th className="border p-2 w-[70px]">Tribal</th><th className="border p-2 w-[100px]">Net Total</th><th className="border p-2 w-[150px]">Specs</th><th className="border p-2 sticky right-0 bg-gray-200 z-10 shadow-[-3px_0_5px_rgba(0,0,0,0.1)] w-[80px]">Actions</th>
                </tr>
                <tr className="bg-gray-100 text-[11px] font-bold text-gray-500 text-center">
                  <td className="border p-1"></td><td className="border p-1">1</td><td className="border p-1">2</td><td className="border p-1">3</td><td className="border p-1">4</td><td className="border p-1">5</td><td className="border p-1">6</td><td className="border p-1">7</td><td className="border p-1">8</td><td className="border p-1">9</td><td className="border p-1">10</td><td className="border p-1">11</td><td className="border p-1">12</td><td className="border p-1">13</td><td className="border p-1">14</td><td className="border p-1">15</td><td className="border p-1 sticky right-0 bg-gray-100 z-10"></td>
                </tr>
              </thead>
              <tbody>
                {localRows.map((row, i) => (
                  <React.Fragment key={row.id}>
                    <tr><td colSpan="17" className="border text-center bg-gray-50/50"><button onClick={() => setInsertIndex(insertIndex === i ? null : i)} className={`px-4 py-0.5 text-[10px] rounded transition-all ${insertIndex === i ? "bg-blue-500 text-white font-bold scale-110" : "text-blue-500 hover:bg-blue-100"}`}>➕ Insert Here</button></td></tr>
                    <SortableRow row={row} index={i} isTribal={isTribal} updateRow={updateRow} updateMaterial={updateMaterial} addMaterial={addMaterial} removeMaterial={removeMaterial} deleteRow={deleteRow} refreshRow={refreshRow} formatNumber={formatNumber} materialList={materialList} commitMaterialName={commitMaterialName} />
                  </React.Fragment>
                ))}
                {localBottomRows.map((row, i) => (
                  <StaticRow key={row.id} row={row} index={i} globalIndex={localRows.length + i + 1} isTribal={isTribal} updateRow={updateBottomRow} updateMaterial={updateBottomMaterial} addMaterial={addBottomMaterial} removeMaterial={removeBottomMaterial} clearRow={() => clearBottomRow(i)} formatNumber={formatNumber} materialList={materialList} commitMaterialName={commitBottomMaterialName} />
                ))}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>

      {/* ── Custom non-blocking alert/confirm dialog ── */}
      {customDialog && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 text-slate-950 font-extrabold text-base mb-2 select-none">
              <span>⚠️</span> {customDialog.title}
            </div>
            <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-6 select-none">
              {customDialog.message}
            </p>
            <div className="flex gap-3">
              {customDialog.isConfirm ? (
                <>
                  <button
                    onClick={() => customDialog.onConfirm()}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      if (customDialog.onCancel) customDialog.onCancel();
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer border"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => customDialog.onConfirm()}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RateAnalysisPage() {
  return (
    <Suspense fallback={<div className="p-4 bg-yellow-50 min-h-screen text-black flex justify-center items-center h-64">Loading...</div>}>
      <RateAnalysisContent />
    </Suspense>
  );
}

// SortableRow and StaticRow components remain exactly the same as in the original file.
// I'll include them here for completeness.

const SortableRow = React.memo(function SortableRow({ row, index, isTribal, updateRow, updateMaterial, addMaterial, removeMaterial, deleteRow, refreshRow, formatNumber, materialList, commitMaterialName }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [activeMatIdx, setActiveMatIdx] = React.useState(null);
  const [filterText, setFilterText] = React.useState("");

  const filteredMaterials = React.useMemo(() => {
    if (!filterText.trim()) return materialList;
    return materialList.filter(m => m.toLowerCase().includes(filterText.toLowerCase()));
  }, [filterText, materialList]);

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-yellow-50 group transition-colors">
      <td {...attributes} {...listeners} className="border p-2 text-center cursor-grab text-gray-400 hover:text-black">☰</td>
      <td className="border p-2 text-center font-semibold">{row.srNo}</td>
      <td className="border p-2 text-center font-medium">{row.ssr}</td>
      <td className="border p-2"><AutoTextarea value={row.description} onChange={(e) => updateRow(index, "description", e.target.value)} /></td>
      <td className="border p-2"><AutoTextarea value={row.unit} onChange={(e) => updateRow(index, "unit", e.target.value)} className="text-center text-xs whitespace-pre-wrap" /></td>
      <td className="border p-2"><NumericInput value={row.basicRate} onChange={(val) => updateRow(index, "basicRate", val)} /></td>
      <td className="border p-2"><NumericInput value={row.deduct} onChange={(val) => updateRow(index, "deduct", val)} /></td>
      <td className="border p-2 text-center text-gray-700">{formatNumber(row.netAfterDeduct)}</td>
      <td className="border py-1 px-1 align-top">
        {row.materials.length === 0 ? (
          <button onClick={() => addMaterial(index)} className="text-green-600 text-xs px-1 hover:scale-110 transition font-bold" title="Add material">+ Add Material</button>
        ) : (
          row.materials.map((mat, matIdx) => (
            <div key={mat.id} className="flex items-center gap-1 leading-none mb-1">
              <div className="relative w-full">
                <input
                  type="text"
                  value={mat.name}
                  onChange={(e) => {
                    updateMaterial(index, matIdx, "name", e.target.value);
                    setFilterText(e.target.value);
                  }}
                  onFocus={() => {
                    setActiveMatIdx(matIdx);
                    setFilterText(mat.name || "");
                  }}
                  onBlur={() => {
                    commitMaterialName(index, matIdx, mat.name);
                    setTimeout(() => setActiveMatIdx(null), 200);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
                  className="w-full h-[26px] border text-xs px-1 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white text-black"
                  placeholder="Select/type"
                />
                {activeMatIdx === matIdx && filteredMaterials.length > 0 && (
                  <ul 
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute left-0 top-[28px] w-full max-h-40 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-[100] text-black"
                  >
                    {filteredMaterials.map((matName) => (
                      <li
                        key={matName}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateMaterial(index, matIdx, "name", matName);
                          commitMaterialName(index, matIdx, matName);
                          setActiveMatIdx(null);
                        }}
                        className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-left text-[11px] border-b border-gray-100 last:border-b-0 font-medium"
                      >
                        {matName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => removeMaterial(index, matIdx)} className="text-red-600 text-xs px-1 hover:scale-110 transition font-bold" title="Remove material">−</button>
              {matIdx === row.materials.length - 1 && <button onClick={() => addMaterial(index)} className="text-green-600 text-xs px-1 hover:scale-110 transition font-bold" title="Add another material">+</button>}
            </div>
          ))
        )}
      </td>
      <td className="border py-1 px-1 align-top">{row.materials.map((mat, matIdx) => <div key={mat.id} className="mb-1"><NumericInput value={mat.qty} onChange={(val) => updateMaterial(index, matIdx, "qty", val)} placeholder="Qty" /></div>)}</td>
      <td className="border py-1 px-1 align-top">{row.materials.map((mat, matIdx) => <div key={mat.id} className="mb-1"><NumericInput value={mat.lead} onChange={(val) => updateMaterial(index, matIdx, "lead", val)} placeholder="Lead" /></div>)}</td>
      <td className="border p-2 text-center text-gray-700">
        {row.materials.length > 0 && row.totalLead === 0
          ? <span className="text-xs text-amber-500 font-medium italic">Add leads first</span>
          : formatNumber(row.totalLead)
        }
      </td>
      <td className="border p-2 text-center font-medium">{formatNumber(row.total)}</td>
      <td className="border p-2 text-center font-semibold text-gray-700">{isTribal ? formatNumber(row.tribal) : "-"}</td>
      <td className="border p-2 text-center font-bold text-blue-800 bg-blue-50/30">{formatNumber(row.netTotal)}</td>
      <td className="border p-2"><AutoTextarea value={row.specs} onChange={(e) => updateRow(index, "specs", e.target.value)} /></td>
      <td className="border p-2 text-center sticky right-0 bg-white group-hover:bg-yellow-50 z-10 shadow-[-3px_0_5px_rgba(0,0,0,0.1)]">
        <div className="flex justify-center gap-3">
          <button onClick={() => refreshRow(index)} title="Refresh" className="transition-all duration-200 hover:scale-125 hover:rotate-180 active:scale-90 opacity-60 hover:opacity-100">🔄</button>
          <button onClick={() => deleteRow(row.id)} title="Delete" className="transition-all duration-200 hover:scale-125 hover:text-red-600 active:scale-90 opacity-60 hover:opacity-100">❌</button>
        </div>
      </td>
    </tr>
  );
});

const StaticRow = React.memo(function StaticRow({ row, index, globalIndex, isTribal, updateRow, updateMaterial, addMaterial, removeMaterial, clearRow, formatNumber, materialList, commitMaterialName }) {
  const [activeMatIdx, setActiveMatIdx] = React.useState(null);
  const [filterText, setFilterText] = React.useState("");

  const filteredMaterials = React.useMemo(() => {
    if (!filterText.trim()) return materialList;
    return materialList.filter(m => m.toLowerCase().includes(filterText.toLowerCase()));
  }, [filterText, materialList]);

  return (
    <tr className="bg-gray-50 hover:bg-yellow-50 group transition-colors border-t-2 border-gray-200">
      <td className="border p-2 text-center text-gray-300">📌</td>
      <td className="border p-2 text-center font-semibold">{globalIndex}</td>
      <td className="border p-2"><AutoTextarea value={row.ssr} onChange={(e) => updateRow(index, "ssr", e.target.value)} className="text-center font-medium" /></td>
      <td className="border p-2"><AutoTextarea value={row.description} onChange={(e) => updateRow(index, "description", e.target.value)} /></td>
      <td className="border p-2"><AutoTextarea value={row.unit} onChange={(e) => updateRow(index, "unit", e.target.value)} className="text-center text-xs whitespace-pre-wrap" /></td>
      <td className="border p-2"><NumericInput value={row.basicRate} onChange={(val) => updateRow(index, "basicRate", val)} /></td>
      <td className="border p-2"><NumericInput value={row.deduct} onChange={(val) => updateRow(index, "deduct", val)} /></td>
      <td className="border p-2 text-center text-gray-700">{formatNumber(row.netAfterDeduct)}</td>
      <td className="border py-1 px-1 align-top">
        {row.materials.length === 0 ? (
          <button onClick={() => addMaterial(index)} className="text-green-600 text-xs px-1 hover:scale-110 transition font-bold" title="Add material">+ Add Material</button>
        ) : (
          row.materials.map((mat, matIdx) => (
            <div key={mat.id} className="flex items-center gap-1 leading-none mb-1">
              <div className="relative w-full">
                <input
                  type="text"
                  value={mat.name}
                  onChange={(e) => {
                    updateMaterial(index, matIdx, "name", e.target.value);
                    setFilterText(e.target.value);
                  }}
                  onFocus={() => {
                    setActiveMatIdx(matIdx);
                    setFilterText(mat.name || "");
                  }}
                  onBlur={() => {
                    commitMaterialName(index, matIdx, mat.name);
                    setTimeout(() => setActiveMatIdx(null), 200);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
                  className="w-full h-[26px] border text-xs px-1 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white text-black"
                  placeholder="Select/type"
                />
                {activeMatIdx === matIdx && filteredMaterials.length > 0 && (
                  <ul 
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute left-0 top-[28px] w-full max-h-40 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-[100] text-black"
                  >
                    {filteredMaterials.map((matName) => (
                      <li
                        key={matName}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateMaterial(index, matIdx, "name", matName);
                          commitMaterialName(index, matIdx, matName);
                          setActiveMatIdx(null);
                        }}
                        className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-left text-[11px] border-b border-gray-100 last:border-b-0 font-medium"
                      >
                        {matName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => removeMaterial(index, matIdx)} className="text-red-600 text-xs px-1 hover:scale-110 transition font-bold" title="Remove material">−</button>
              {matIdx === row.materials.length - 1 && <button onClick={() => addMaterial(index)} className="text-green-600 text-xs px-1 hover:scale-110 transition font-bold" title="Add another material">+</button>}
            </div>
          ))
        )}
      </td>
      <td className="border py-1 px-1 align-top">{row.materials.map((mat, matIdx) => <div key={mat.id} className="mb-1"><NumericInput value={mat.qty} onChange={(val) => updateMaterial(index, matIdx, "qty", val)} placeholder="Qty" /></div>)}</td>
      <td className="border py-1 px-1 align-top">{row.materials.map((mat, matIdx) => <div key={mat.id} className="mb-1"><NumericInput value={mat.lead} onChange={(val) => updateMaterial(index, matIdx, "lead", val)} placeholder="Lead" /></div>)}</td>
      <td className="border p-2 text-center text-gray-700">
        {row.materials.length > 0 && row.totalLead === 0
          ? <span className="text-xs text-amber-500 font-medium italic">Add leads first</span>
          : formatNumber(row.totalLead)
        }
      </td>
      <td className="border p-2 text-center font-medium">{formatNumber(row.total)}</td>
      <td className="border p-2 text-center font-semibold text-gray-700">{isTribal ? formatNumber(row.tribal) : "-"}</td>
      <td className="border p-2 text-center font-bold text-blue-800 bg-blue-50/30">{formatNumber(row.netTotal)}</td>
      <td className="border p-2"><AutoTextarea value={row.specs} onChange={(e) => updateRow(index, "specs", e.target.value)} /></td>
      <td className="border p-2 text-center sticky right-0 bg-gray-50 group-hover:bg-yellow-50 z-10 shadow-[-3px_0_5px_rgba(0,0,0,0.1)]">
        <div className="flex justify-center gap-3"><button onClick={clearRow} title="Clear values" className="transition-all duration-200 hover:scale-125 hover:text-red-600 active:scale-90 opacity-60 hover:opacity-100">🧹</button></div>
      </td>
    </tr>
  );
});