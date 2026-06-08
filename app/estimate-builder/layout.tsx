"use client";

import React, { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function EstimateBuilderLayout({ children }: { children: React.ReactNode }) {
  const fetchLeadsProfiles = useStore((state) => state.fetchLeadsProfiles);
  const setEstimateMeta = useStore((state) => state.setEstimateMeta);

  useEffect(() => {
    // 1. Fetch Lead Profiles on mount
    (fetchLeadsProfiles as any)();

    // 2. Fetch last used estimate from MongoDB
    const fetchLastEstimate = async () => {
      try {
        const currentId = useStore.getState().currentEstimateId;
        let targetId = currentId;

        if (!targetId) {
          const res = await fetch("/api/estimate/get");
          if (res.ok) {
            const list = await res.json();
            if (list && list.length > 0) {
              targetId = list[0]._id;
            }
          }
        }

        if (targetId) {
          const res = await fetch(`/api/estimate/${targetId}`);
          if (res.ok) {
            const result = await res.json();
            const data = result.success ? result.data : null;
            if (data) {
              setEstimateMeta({
                currentEstimateId: data._id,
                estimateName: data.estimateName || "",
                nameOfWork: data.nameOfWork || "",
                isTribal: data.isTribal || false,
                tribalPercent: data.tribalPercent || "",
                yojana: data.yojana || "",
                estAmount: data.estAmount || "",
                labourInsurance: data.labourInsurance || "",
                year: data.year || "",
                dist: data.dist || "",
                taluka: data.taluka || "",
                village: data.village || "",
                headDivision: data.headDivision || "",
                subDivision: data.subDivision || "",
                deputyEngineer: data.deputyEngineer || "",
                jrEngineer: data.jrEngineer || "",
                adminApprovalNo: data.adminApprovalNo || "",
                raRows: data.raRows || [],
                raBottomRows: data.raBottomRows || [],
                measurementItems: data.measurementItems || [],
                abstractCustomData: data.abstractCustomData || {},
                leadSettings: data.leadSettings || {},
                leadOrder: data.leadOrder || [],
              });
              console.log("✓ Loaded estimate from DB:", targetId);
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to load last estimate from DB:", err);
      }
    };

    fetchLastEstimate();
  }, [fetchLeadsProfiles, setEstimateMeta]);

  // 3. Bind global keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === "z" || e.key === "Z") {
          // Check if the focused element is a standard input/textarea/editable
          const activeEl = document.activeElement as HTMLElement | null;
          const isTextInput = activeEl && (
            activeEl.tagName === "INPUT" ||
            activeEl.tagName === "TEXTAREA" ||
            activeEl.isContentEditable
          );
          
          if (!isTextInput) {
            e.preventDefault();
            (useStore.getState() as any).undo();
          }
        } else if (e.key === "y" || e.key === "Y") {
          const activeEl = document.activeElement as HTMLElement | null;
          const isTextInput = activeEl && (
            activeEl.tagName === "INPUT" ||
            activeEl.tagName === "TEXTAREA" ||
            activeEl.isContentEditable
          );

          if (!isTextInput) {
            e.preventDefault();
            (useStore.getState() as any).redo();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return <>{children}</>;
}
