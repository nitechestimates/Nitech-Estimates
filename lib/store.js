// lib/store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_AREA_RATE_INCREASES = [
  { key: "a", name: "Corporation Areas", percentage: 5 },
  { key: "b", name: "Municipal Council Areas", percentage: 4 },
  { key: "c", name: "Sugarcane factory area (within 10 km. radius)", percentage: 5 },
  { key: "d", name: "Notified Tribal Areas / Hilly Area / Inaccessible areas / Pandemic Special Centers", percentage: 10 },
  { key: "e", name: "Inside Premises of Central Jail, Mental Hospital, Yerawada Printing press.", percentage: 15 },
  { key: "f", name: "Tiger project area in Amaravati, Yavatmal, Wardha, Nagpur, Bhandara, Gondia & Chandrapur Distt.", percentage: 20 },
  { key: "g", name: "Coal / Lime / Manganese Mining area", percentage: 5 },
  { key: "h", name: "Naxalite affected area", percentage: 20 },
  { key: "i", name: "Metropolitan areas notified by UDD excluding Municipal Corporation and Council areas", percentage: 2 }
];

const DEFAULT_BASIC_MATERIAL_RATES = [
  { srNo: 1, name: "Cement / PPC", rate: 6000, unit: "Per M.T." },
  { srNo: 2, name: "PSC", rate: 6385, unit: "Per M.T." },
  { srNo: 3, name: "GGBFS (IS-16714)", rate: 4300, unit: "Per M.T." },
  { srNo: 4, name: "TMT-FE-500 reinforcement", rate: 61000, unit: "Per M.T." },
  { srNo: 5, name: "HCRM/ CRS reinforcement", rate: 63755, unit: "Per M.T." },
  { srNo: 6, name: "Structural Steel", rate: 62575, unit: "Per M.T." },
  { srNo: 7, name: "Tubular Steel", rate: 65720, unit: "Per M.T." },
  { srNo: 8, name: "Bitumen VG-30 (Packed)", rate: 59411, unit: "Per M.T. Ex. Refinery Mumbai" },
  { srNo: 9, name: "Bitumen VG-10 (Packed)", rate: 57913, unit: "Per M.T. Ex. Refinery Mumbai" },
  { srNo: 10, name: "Bitumen VG-40 (Bulk)", rate: 52764, unit: "Per M.T. Ex. Refinery Mumbai" },
  { srNo: 11, name: "Bitumen VG-30 (Bulk)", rate: 49862, unit: "Per M.T. Ex. Refinery Mumbai" },
  { srNo: 12, name: "Bitumen VG-10 (Bulk)", rate: 49488, unit: "Per M.T. Ex. Refinery Mumbai" },
  { srNo: 13, name: "Bitumen VG-40 (Packed)", rate: 64748, unit: "Per M.T. Ex. Refinery Mumbai" },
  { srNo: 14, name: "Bitumen Emulsion", rate: 40000, unit: "Per M.T. Ex. Refinery Mumbai" },
  { srNo: 15, name: "CRMB - 55", rate: 54954, unit: "Per M.T." },
  { srNo: 16, name: "CRMB - 60", rate: 55580, unit: "Per M.T." }
];

const DEFAULT_GENERAL_ALLOWANCES = {
  floorFirst: 1,
  floorSecond: 2,
  floorThird: 3,
  floorFourth: 4,
  excavation30to45: 20,
  excavation45to60: 30,
  foulExcavation: 25,
  foulOther: 5,
  scadaConcrete: 126,
  scadaBT: 63,
  curingCompound: 5,
  royaltyBase: 211.95,
  royaltySurcharge: 2,
  royaltyDMF: 10
};

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

      addLeadsProfile: (category, name) => set((state) => {
        const profiles = state.leadsProfiles[category] || [];
        if (profiles.length >= 30) return state;
        const newProfile = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
          name: name.trim(),
          materials: [],
          customLeads: [],
        };
        return { leadsProfiles: { ...state.leadsProfiles, [category]: [...profiles, newProfile] } };
      }),

      deleteLeadsProfile: (category, id) => set((state) => ({
        leadsProfiles: {
          ...state.leadsProfiles,
          [category]: (state.leadsProfiles[category] || []).filter(p => p.id !== id),
        }
      })),

      renameLeadsProfile: (category, id, newName) => set((state) => ({
        leadsProfiles: {
          ...state.leadsProfiles,
          [category]: (state.leadsProfiles[category] || []).map(p =>
            p.id === id ? { ...p, name: newName.trim() } : p
          ),
        }
      })),

      updateLeadsProfileMaterials: (category, id, materials) => set((state) => ({
        leadsProfiles: {
          ...state.leadsProfiles,
          [category]: (state.leadsProfiles[category] || []).map(p =>
            p.id === id ? { ...p, materials } : p
          ),
        }
      })),

      addCustomLeadToProfile: (category, id, customLead) => set((state) => ({
        leadsProfiles: {
          ...state.leadsProfiles,
          [category]: (state.leadsProfiles[category] || []).map(p =>
            p.id === id ? { ...p, customLeads: [...(p.customLeads || []), customLead] } : p
          ),
        }
      })),

      removeCustomLeadFromProfile: (category, id, leadName) => set((state) => ({
        leadsProfiles: {
          ...state.leadsProfiles,
          [category]: (state.leadsProfiles[category] || []).map(p =>
            p.id === id ? { ...p, customLeads: (p.customLeads || []).filter(cl => cl.name !== leadName) } : p
          ),
        }
      })),

      // ─── Rate Analysis Rows ───────────────────────────────────────────────────
      raRows: [],
      setRARows: (rows) => set({ raRows: rows }),
      raBottomRows: [],
      setRABottomRows: (rows) => set({ raBottomRows: rows }),

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
      setMeasurementItems: (items) => set((state) => ({
        measurementItems: typeof items === 'function' ? items(Array.isArray(state.measurementItems) ? state.measurementItems : []) : items
      })),

      syncMeasurementFromRA: () => {
        const state = get();
        const allRaRows = [...state.raRows, ...state.raBottomRows];
        const existingMap = new Map();
        const currentItems = Array.isArray(state.measurementItems) ? state.measurementItems : [];
        currentItems.forEach(item => existingMap.set(item.id, item));

        const newItems = [];
        for (const raItem of allRaRows) {
          const existing = existingMap.get(raItem.id);
          if (existing) {
            newItems.push({ ...existing, description: raItem.description, unit: raItem.unit, srNo: newItems.length + 1 });
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
    { name: 'nitech-estimates-storage' }
  )
);