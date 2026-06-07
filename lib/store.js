// lib/store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import defaults from './defaults.json';

const DEFAULT_AREA_RATE_INCREASES = defaults.DEFAULT_AREA_RATE_INCREASES;
const DEFAULT_BASIC_MATERIAL_RATES = defaults.DEFAULT_BASIC_MATERIAL_RATES;
const DEFAULT_GENERAL_ALLOWANCES = defaults.DEFAULT_GENERAL_ALLOWANCES;

const calculateRow = (row, isTribal, tribalPercent = 0) => {
  const netAfterDeduct = (row.basicRate || 0) - (row.deduct || 0);
  const totalLead = (row.materials || []).reduce((sum, m) => sum + ((m.qty || 0) * (m.lead || 0)), 0);
  const total = netAfterDeduct + totalLead;
  const pct = isTribal ? (parseFloat(tribalPercent) || 0) : 0;
  const tribalAmount = (total * pct) / 100;
  const netTotal = total + tribalAmount;
  return { ...row, netAfterDeduct, totalLead, total, tribal: tribalAmount, netTotal };
};

export const useStore = create(
  persist(
    (set, get) => ({
      // ─── Lead Settings ───────────────────────────────────────────────────────
      leadSettings: {},
      setLeadSettings: (settings) => set({ leadSettings: settings }),
      updateLeadSetting: (name, updates) => set((state) => ({
        leadSettings: { ...state.leadSettings, [name]: { ...state.leadSettings[name], ...updates } },
        leadOrder: state.leadOrder.includes(name) ? state.leadOrder : [...state.leadOrder, name],
      })),

      // ─── Lead Order (for drag-drop) ──────────────────────────────────────────
      leadOrder: [],
      setLeadOrder: (order) => set({ leadOrder: order }),

      // ─── Lead Profiles ───────────────────────────────────────────────────────
      // Each category: array of { id, name, materials: [string], customLeads: [{name,distance,leadCharge}] }
      leadsProfiles: { buildings: [], roads: [], bridges: [] },

      fetchLeadsProfiles: async () => {
        try {
          const res = await fetch('/api/lead-profiles');
          if (res.ok) {
            const data = await res.json();
            if (data) {
              set({ leadsProfiles: data });
            }
          }
        } catch (err) {
          console.error("Failed to fetch lead profiles:", err);
        }
      },

      addLeadsProfile: (category, name) => {
        const state = get();
        const profiles = state.leadsProfiles[category] || [];
        if (profiles.length >= 30) return;
        const newProfile = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
          name: name.trim(),
          materials: [],
          customLeads: [],
        };
        set({
          leadsProfiles: {
            ...state.leadsProfiles,
            [category]: [...profiles, newProfile]
          }
        });
        fetch('/api/lead-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newProfile.id, category, name: newProfile.name })
        }).catch(err => console.error("Failed to sync added profile to DB:", err));
      },

      deleteLeadsProfile: (category, id) => {
        const state = get();
        set({
          leadsProfiles: {
            ...state.leadsProfiles,
            [category]: (state.leadsProfiles[category] || []).filter(p => p.id !== id),
          }
        });
        fetch(`/api/lead-profiles/${id}`, {
          method: 'DELETE'
        }).catch(err => console.error("Failed to sync deleted profile to DB:", err));
      },

      renameLeadsProfile: (category, id, newName) => {
        const state = get();
        set({
          leadsProfiles: {
            ...state.leadsProfiles,
            [category]: (state.leadsProfiles[category] || []).map(p =>
              p.id === id ? { ...p, name: newName.trim() } : p
            ),
          }
        });
        fetch(`/api/lead-profiles/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim() })
        }).catch(err => console.error("Failed to sync renamed profile to DB:", err));
      },

      updateLeadsProfileMaterials: (category, id, materials) => {
        const state = get();
        set({
          leadsProfiles: {
            ...state.leadsProfiles,
            [category]: (state.leadsProfiles[category] || []).map(p =>
              p.id === id ? { ...p, materials } : p
            ),
          }
        });
      },

      addCustomLeadToProfile: (category, id, customLead) => {
        const state = get();
        const categoryProfiles = state.leadsProfiles[category] || [];
        const profile = categoryProfiles.find(p => p.id === id);
        if (!profile) return;
        const updatedCustomLeads = [...(profile.customLeads || []), customLead];

        set({
          leadsProfiles: {
            ...state.leadsProfiles,
            [category]: categoryProfiles.map(p =>
              p.id === id ? { ...p, customLeads: updatedCustomLeads } : p
            ),
          }
        });
      },

      removeCustomLeadFromProfile: (category, id, leadName) => {
        const state = get();
        const categoryProfiles = state.leadsProfiles[category] || [];
        const profile = categoryProfiles.find(p => p.id === id);
        if (!profile) return;
        const updatedCustomLeads = (profile.customLeads || []).filter(cl => cl.name !== leadName);

        set({
          leadsProfiles: {
            ...state.leadsProfiles,
            [category]: categoryProfiles.map(p =>
              p.id === id ? { ...p, customLeads: updatedCustomLeads } : p
            ),
          }
        });
      },

      saveLeadsProfile: async (category, id) => {
        const state = get();
        const categoryProfiles = state.leadsProfiles[category] || [];
        const profile = categoryProfiles.find(p => p.id === id);
        if (!profile) return;

        try {
          const res = await fetch(`/api/lead-profiles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: profile.name,
              materials: profile.materials,
              customLeads: profile.customLeads
            })
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Server returned status ${res.status}`);
          }
        } catch (err) {
          console.error("Failed to save lead profile:", err);
          throw err;
        }
      },

      // ─── Rate Analysis Rows ───────────────────────────────────────────────────
      raRows: [],
      setRARows: (rows) => {
        get().pushHistory();
        set({ raRows: rows });
      },
      raBottomRows: [],
      setRABottomRows: (rows) => {
        get().pushHistory();
        set({ raBottomRows: rows });
      },

      // ─── Estimate Meta ────────────────────────────────────────────────────────
      currentEstimateId: null,
      estimateName: '',
      nameOfWork: '',
      isTribal: false,
      tribalPercent: '',
      yojana: '',
      estAmount: '',
      labourInsurance: '',
      year: '',
      dist: '',
      taluka: '',
      village: '',
      headDivision: '',
      subDivision: '',
      deputyEngineer: '',
      jrEngineer: '',
      adminApprovalNo: '',
      setEstimateMeta: (meta) => set(meta),

      // ─── Reset for new estimate ───────────────────────────────────────────────
      resetEstimate: () => set({
        currentEstimateId: null,
        estimateName: '',
        nameOfWork: '',
        isTribal: false,
        tribalPercent: '',
        yojana: '',
        estAmount: '',
        labourInsurance: '',
        year: '',
        dist: '',
        taluka: '',
        village: '',
        headDivision: '',
        subDivision: '',
        deputyEngineer: '',
        jrEngineer: '',
        adminApprovalNo: '',
        raRows: [],
        raBottomRows: [],
        measurementItems: [],
        abstractCustomData: {},
        leadSettings: {},
        leadOrder: [],
        history: { past: [], future: [] },
      }),

      // ─── Recalculate RA rows from leadSettings ────────────────────────────────
      recalculateRARowsWithLeadSettings: () => {
        const state = get();
        const newSettings = state.leadSettings;
        const isTribal = state.isTribal;

        const applyLeads = (rows) => rows.map(row => {
          const updatedMaterials = (row.materials || []).map(mat => {
            const setting = mat.name ? newSettings[mat.name] : null;
            return { ...mat, lead: setting?.leadCharge || 0 };
          });
          return calculateRow({ ...row, materials: updatedMaterials }, isTribal, state.tribalPercent);
        });

        set({ raRows: applyLeads(state.raRows), raBottomRows: applyLeads(state.raBottomRows) });
      },

      measurementItems: [],
      setMeasurementItems: (items) => {
        get().pushHistory();
        set((state) => ({
          measurementItems: typeof items === 'function' ? items(Array.isArray(state.measurementItems) ? state.measurementItems : []) : items
        }));
      },

      syncMeasurementFromRA: () => {
        const state = get();
        const allRaRows = [...state.raRows, ...state.raBottomRows];
        const existingMap = new Map();
        const existingDescMap = new Map();
        const currentItems = Array.isArray(state.measurementItems) ? state.measurementItems : [];
        currentItems.forEach(item => {
          existingMap.set(item.id, item);
          if (item.description) {
            existingDescMap.set(item.description.trim(), item);
          }
        });

        const newItems = [];
        for (const raItem of allRaRows) {
          let existing = existingMap.get(raItem.id);
          if (!existing && raItem.description) {
            existing = existingDescMap.get(raItem.description.trim());
          }

          if (existing) {
            newItems.push({
              ...existing,
              id: raItem.id, // Update ID to match the latest RA row ID
              description: raItem.description,
              unit: raItem.unit,
              srNo: newItems.length + 1
            });
          } else {
            newItems.push({
              id: raItem.id,
              srNo: newItems.length + 1,
              description: raItem.description,
              unit: raItem.unit,
              measurements: [{ id: Date.now() + Math.random(), no: '', l: '', b: '', h: '', total: 0 }],
              totalQty: 0,
              usePercent: false,
              percentValue: 100,
            });
          }
        }
        set({ measurementItems: newItems });
      },

      // ─── Abstract ─────────────────────────────────────────────────────────────
      abstractCustomData: {},
      setAbstractCustomData: (data) => set({ abstractCustomData: data }),
      updateAbstractCustomField: (id, field, value) => set((state) => ({
        abstractCustomData: { ...state.abstractCustomData, [id]: { ...state.abstractCustomData[id], [field]: value } }
      })),

      // ─── Undo/Redo ────────────────────────────────────────────────────────────
      history: { past: [], future: [] },
      maxHistory: 10,
      pushHistory: () => {
        const state = get();
        const snapshot = {
          raRows: structuredClone(state.raRows),
          raBottomRows: structuredClone(state.raBottomRows),
          measurementItems: structuredClone(Array.isArray(state.measurementItems) ? state.measurementItems : []),
        };
        set((prev) => {
          const newPast = [...prev.history.past, snapshot].slice(-prev.maxHistory);
          return { history: { past: newPast, future: [] } };
        });
      },
      undo: () => {
        const state = get();
        const { past, future } = state.history;
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);
        const snapshot = {
          raRows: structuredClone(state.raRows),
          raBottomRows: structuredClone(state.raBottomRows),
          measurementItems: structuredClone(Array.isArray(state.measurementItems) ? state.measurementItems : []),
        };
        set({ raRows: previous.raRows, raBottomRows: previous.raBottomRows, measurementItems: previous.measurementItems, history: { past: newPast, future: [snapshot, ...future].slice(0, state.maxHistory) } });
      },
      redo: () => {
        const state = get();
        const { past, future } = state.history;
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        const snapshot = {
          raRows: structuredClone(state.raRows),
          raBottomRows: structuredClone(state.raBottomRows),
          measurementItems: structuredClone(Array.isArray(state.measurementItems) ? state.measurementItems : []),
        };
        set({ raRows: next.raRows, raBottomRows: next.raBottomRows, measurementItems: next.measurementItems, history: { past: [...past, snapshot].slice(-state.maxHistory), future: newFuture } });
      },

      // ─── Yojana list ─────────────────────────────────────────────────────────
      yojanaList: [],
      addYojana: (name) => set((state) => {
        const trimmed = name.trim();
        if (!trimmed || state.yojanaList.includes(trimmed)) return state;
        return { yojanaList: [...state.yojanaList, trimmed] };
      }),
      removeYojana: (name) => set((state) => ({
        yojanaList: state.yojanaList.filter((y) => y !== name),
      })),

      // ─── Rates & Allowances ──────────────────────────────────────────────────
      areaRateIncreases: DEFAULT_AREA_RATE_INCREASES,
      basicMaterialRates: DEFAULT_BASIC_MATERIAL_RATES,
      setAreaRateIncreases: (list) => set({ areaRateIncreases: list }),
      setBasicMaterialRates: (list) => set({ basicMaterialRates: list }),
      updateAreaRateIncrease: (key, percentage) => set((state) => {
        const list = Array.isArray(state.areaRateIncreases) ? state.areaRateIncreases : DEFAULT_AREA_RATE_INCREASES;
        return {
          areaRateIncreases: list.map(item => item.key === key ? { ...item, percentage } : item)
        };
      }),
      updateBasicMaterialRate: (srNo, rate) => set((state) => {
        const list = Array.isArray(state.basicMaterialRates) ? state.basicMaterialRates : DEFAULT_BASIC_MATERIAL_RATES;
        return {
          basicMaterialRates: list.map(item => item.srNo === srNo ? { ...item, rate } : item)
        };
      }),
      resetAreaRateIncreases: () => set({ areaRateIncreases: DEFAULT_AREA_RATE_INCREASES }),
      resetBasicMaterialRates: () => set({ basicMaterialRates: DEFAULT_BASIC_MATERIAL_RATES }),

      generalAllowances: DEFAULT_GENERAL_ALLOWANCES,
      setGeneralAllowances: (allowances) => set({ generalAllowances: allowances }),
      updateGeneralAllowance: (key, value) => set((state) => {
        const current = state.generalAllowances && typeof state.generalAllowances === 'object'
          ? state.generalAllowances
          : DEFAULT_GENERAL_ALLOWANCES;
        return {
          generalAllowances: { ...current, [key]: value }
        };
      }),
      resetGeneralAllowances: () => set({ generalAllowances: DEFAULT_GENERAL_ALLOWANCES }),

      // ─── Project Details Profiles ────────────────────────────────────────────
      projectDetailsProfiles: [],
      addProjectDetailsProfile: (profile) => set((state) => {
        const list = Array.isArray(state.projectDetailsProfiles) ? state.projectDetailsProfiles : [];
        if (list.length >= 50) return state;
        const newProfile = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
          ...profile
        };
        return { projectDetailsProfiles: [...list, newProfile] };
      }),
      deleteProjectDetailsProfile: (id) => set((state) => ({
        projectDetailsProfiles: (Array.isArray(state.projectDetailsProfiles) ? state.projectDetailsProfiles : []).filter(p => p.id !== id)
      })),
      updateProjectDetailsProfile: (id, updates) => set((state) => ({
        projectDetailsProfiles: (Array.isArray(state.projectDetailsProfiles) ? state.projectDetailsProfiles : []).map(p =>
          p.id === id ? { ...p, ...updates } : p
        )
      })),
    }),
    { 
      name: 'nitech-estimates-storage',
      skipHydration: true 
    }
  )
);