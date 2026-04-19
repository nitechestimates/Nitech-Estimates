// lib/sync.js
// Centralized state management with cross-component sync

const STORAGE_KEYS = {
  LEAD_SETTINGS: "leadSettings",
  RA_ROWS: "ra_rows",
  RA_BOTTOM_ROWS: "ra_bottom_rows",
  MEASUREMENT_ITEMS: "measurement_items",
  ABSTRACT_CUSTOM: "abstract_custom_data",
};

// Safe dispatch that works even if window is not fully initialized
const emitStorageUpdate = (key, newValue) => {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("storage-update", {
          detail: { key, newValue },
        })
      );
    } catch (error) {
      console.warn("Failed to dispatch storage-update event:", error);
    }
  }
};

// ========== Lead Settings ==========
export const getLeadSettings = () => {
  if (typeof window === "undefined") return {};
  const saved = localStorage.getItem(STORAGE_KEYS.LEAD_SETTINGS);
  return saved ? JSON.parse(saved) : {};
};

export const setLeadSettings = (settings) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.LEAD_SETTINGS, JSON.stringify(settings));
  emitStorageUpdate(STORAGE_KEYS.LEAD_SETTINGS, settings);
};

// ========== Rate Analysis Rows ==========
export const getRARows = () => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEYS.RA_ROWS);
  return saved ? JSON.parse(saved) : [];
};

export const setRARows = (rows) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.RA_ROWS, JSON.stringify(rows));
  emitStorageUpdate(STORAGE_KEYS.RA_ROWS, rows);
};

export const getRABottomRows = () => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEYS.RA_BOTTOM_ROWS);
  return saved ? JSON.parse(saved) : [];
};

export const setRABottomRows = (rows) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.RA_BOTTOM_ROWS, JSON.stringify(rows));
  emitStorageUpdate(STORAGE_KEYS.RA_BOTTOM_ROWS, rows);
};

// ========== Measurement Items ==========
export const getMeasurementItems = () => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEYS.MEASUREMENT_ITEMS);
  return saved ? JSON.parse(saved) : [];
};

export const setMeasurementItems = (items) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.MEASUREMENT_ITEMS, JSON.stringify(items));
  emitStorageUpdate(STORAGE_KEYS.MEASUREMENT_ITEMS, items);
};

// ========== Abstract Custom Data ==========
export const getAbstractCustomData = () => {
  if (typeof window === "undefined") return {};
  const saved = localStorage.getItem(STORAGE_KEYS.ABSTRACT_CUSTOM);
  return saved ? JSON.parse(saved) : {};
};

export const setAbstractCustomData = (data) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ABSTRACT_CUSTOM, JSON.stringify(data));
  emitStorageUpdate(STORAGE_KEYS.ABSTRACT_CUSTOM, data);
};

// ========== Hook to listen for updates ==========
import { useEffect } from "react";

export const useSyncListener = (key, callback) => {
  useEffect(() => {
    const handler = (event) => {
      if (event.detail?.key === key) {
        callback(event.detail.newValue);
      }
    };
    window.addEventListener("storage-update", handler);
    return () => window.removeEventListener("storage-update", handler);
  }, [key, callback]);
};