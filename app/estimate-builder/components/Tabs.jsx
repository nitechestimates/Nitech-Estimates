"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import AlertDialog, { useAlertDialog } from '@/components/AlertDialog';

export default function Tabs() {
  const { dialog, triggerAlert, triggerConfirm } = useAlertDialog();
  const pathname = usePathname();
  const router = useRouter();
  const currentEstimateId = useStore((state) => state.currentEstimateId);
  
  // Billing status state
  const [billingExists, setBillingExists] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Check if billing exists for the loaded estimate
  useEffect(() => {
    if (!currentEstimateId) {
      setChecking(false);
      return;
    }

    setChecking(true);
    fetch(`/api/billing/${currentEstimateId}`)
      .then((res) => {
        if (res.ok) {
          setBillingExists(true);
        } else {
          setBillingExists(false);
        }
      })
      .catch((err) => console.error("Error checking billing:", err))
      .finally(() => setChecking(false));
  }, [currentEstimateId]);

  const handleFinalize = async (regenerate = false) => {
    if (!currentEstimateId) return;

    setProcessing(true);
    try {
      const s = useStore.getState();
      
      // If regenerating, delete old first
      if (regenerate) {
        const delRes = await fetch(`/api/billing/${currentEstimateId}`, {
          method: "DELETE",
        });
        if (!delRes.ok) {
          throw new Error("Failed to delete old billing");
        }
      }

      // Initialize billing
      const createRes = await fetch(`/api/billing/${currentEstimateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          measurementItems: s.measurementItems,
          abstractCustomData: s.abstractCustomData,
          nameOfWork: s.nameOfWork,
          yojana: s.yojana,
          estAmount: s.estAmount,
          year: s.year,
          dist: s.dist,
          taluka: s.taluka,
          village: s.village,
          headDivision: s.headDivision,
          subDivision: s.subDivision,
          deputyEngineer: s.deputyEngineer,
          jrEngineer: s.jrEngineer,
          adminApprovalNo: s.adminApprovalNo,
        }),
      });

      if (createRes.ok) {
        setBillingExists(true);
        setShowPrompt(false);
        router.push(`/estimate-builder/billing/${currentEstimateId}`);
      } else {
        await triggerAlert("Failed to initialize billing.");
      }
    } catch (err) {
      console.error(err);
      await triggerAlert("Error finalizing estimate.");
    } finally {
      setProcessing(false);
    }
  };

  const handleButtonClick = () => {
    if (billingExists) {
      setShowPrompt(true);
    } else {
      handleFinalize(false);
    }
  };

  const tabs = [
    { name: "Rate Analysis", href: "/estimate-builder/rate-analysis" },
    { name: "Measurement Sheet", href: "/estimate-builder/measurement" },
    { name: "Abstract", href: "/estimate-builder/abstract" },
    { name: "Leads", href: "/estimate-builder/leads" },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-300 mb-6 pb-2">
      <div className="flex flex-wrap gap-4">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-lg font-medium transition-all duration-200 ${
                isActive
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px]"
                  : "text-gray-600 hover:text-blue-500"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {currentEstimateId && !checking && (
        <div className="flex items-center gap-2 pr-2">
          {billingExists ? (
            <button
              onClick={handleButtonClick}
              disabled={processing}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Move to Billing
            </button>
          ) : (
            <button
              onClick={handleButtonClick}
              disabled={processing}
              className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:scale-95 transition-all text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer animate-pulse"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Finalise & Generate Billing
            </button>
          )}
        </div>
      )}

      {/* Re-finalize Prompt Modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2.5 text-slate-950 font-black text-lg mb-2 select-none">
              📁 Billing Record Exists
            </div>
            <p className="text-sm font-semibold text-slate-600 leading-relaxed mb-6 select-none">
              A billing record already exists for this estimate. Would you like to view the existing bill, or delete the old billing and generate a new one from the current estimate?
            </p>
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={() => {
                  setShowPrompt(false);
                  router.push(`/estimate-builder/billing/${currentEstimateId}`);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl active:scale-[0.98] transition cursor-pointer"
              >
                Go to Billing Section
              </button>
              <button
                onClick={async () => {
                  if (await triggerConfirm("WARNING: This will permanently delete the current bill and all custom billing changes (rates, measurements, form fields). Are you sure?")) {
                    handleFinalize(true);
                  }
                }}
                disabled={processing}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-sm rounded-xl active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {processing ? "Regenerating..." : "Delete Old & Generate New Bill"}
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl active:scale-[0.98] transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog dialog={dialog} />
    </div>
  );
}

