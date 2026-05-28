// lib/store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      // Lead Settings
      leadSettings: {},
      setLeadSettings: (settings) => set({ leadSettings: settings }),
      updateLeadSetting: (category, updates) => set((state) => ({
        leadSettings: {
          ...state.leadSettings,
          [category]: { ...state.leadSettings[category], ...updates }
        }
      })),

      // Rate Analysis Rows
      raRows: [],
      setRARows: (rows) => set({ raRows: rows }),
      raBottomRows: [],
      setRABottomRows: (rows) => set({ raBottomRows: rows }),

      // Estimate Meta
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

      // Reset everything for a brand new estimate
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
        history: { past: [], future: [] },
      }),

      // Recalculate RA rows when lead settings change
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

      // Measurement Items
      measurementItems: [],
      setMeasurementItems: (items) => set({ measurementItems: items }),

      syncMeasurementFromRA: () => {
        const state = get();
        const allRaRows = [...state.raRows, ...state.raBottomRows];
        const existingMap = new Map();
        state.measurementItems.forEach(item => existingMap.set(item.id, item));
        
        const newItems = [];
        for (const raItem of allRaRows) {
          const existing = existingMap.get(raItem.id);
          if (existing) {
            newItems.push({
              ...existing,
              description: raItem.description,
              unit: raItem.unit,
              srNo: newItems.length + 1,
            });
          } else {
            newItems.push({
              id: raItem.id,
              srNo: newItems.length + 1,
              description: raItem.description,
              unit: raItem.unit,
              measurements: [{
                id: Date.now() + Math.random(),
                no: "",
                l: "",
                b: "",
                h: "",
                total: 0,
              }],
              totalQty: 0,
            });
          }
        }
        set({ measurementItems: newItems });
      },

      // Abstract Custom Data
      abstractCustomData: {},
      setAbstractCustomData: (data) => set({ abstractCustomData: data }),
      updateAbstractCustomField: (id, field, value) => set((state) => ({
        abstractCustomData: { ...state.abstractCustomData, [id]: { ...state.abstractCustomData[id], [field]: value } }
      })),

      // Undo/Redo History
      history: { past: [], future: [] },
      maxHistory: 10,

      pushHistory: () => {
        const state = get();
        const snapshot = {
          raRows: JSON.parse(JSON.stringify(state.raRows)),
          raBottomRows: JSON.parse(JSON.stringify(state.raBottomRows)),
          measurementItems: JSON.parse(JSON.stringify(state.measurementItems)),
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
          raRows: JSON.parse(JSON.stringify(state.raRows)),
          raBottomRows: JSON.parse(JSON.stringify(state.raBottomRows)),
          measurementItems: JSON.parse(JSON.stringify(state.measurementItems)),
        };
        set({
          raRows: previous.raRows,
          raBottomRows: previous.raBottomRows,
          measurementItems: previous.measurementItems,
          history: { past: newPast, future: [snapshot, ...future].slice(0, state.maxHistory) },
        });
      },

      redo: () => {
        const state = get();
        const { past, future } = state.history;
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        const snapshot = {
          raRows: JSON.parse(JSON.stringify(state.raRows)),
          raBottomRows: JSON.parse(JSON.stringify(state.raBottomRows)),
          measurementItems: JSON.parse(JSON.stringify(state.measurementItems)),
        };
        set({
          raRows: next.raRows,
          raBottomRows: next.raBottomRows,
          measurementItems: next.measurementItems,
          history: { past: [...past, snapshot].slice(-state.maxHistory), future: newFuture },
        });
      },

      // Yojana / Fund list
      yojanaList: [],
      addYojana: (name) => set((state) => {
        const trimmed = name.trim();
        if (!trimmed || state.yojanaList.includes(trimmed)) return state;
        return { yojanaList: [...state.yojanaList, trimmed] };
      }),
      removeYojana: (name) => set((state) => ({
        yojanaList: state.yojanaList.filter((y) => y !== name),
      })),
    }),
    { name: 'nitech-estimates-storage' }
  )
);