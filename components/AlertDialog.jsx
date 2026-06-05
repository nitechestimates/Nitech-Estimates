"use client";

import { useState, useCallback } from "react";

/**
 * Custom dialog state — pass to <AlertDialog /> and use triggerAlert/triggerConfirm to open.
 */
export function useAlertDialog() {
  const [dialog, setDialog] = useState(null);

  const triggerAlert = useCallback((message, title = "Notification") => {
    const previouslyActive = typeof document !== "undefined" ? document.activeElement : null;
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        isConfirm: false,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
          setTimeout(() => {
            if (previouslyActive && typeof previouslyActive.focus === "function") {
              previouslyActive.focus();
            }
          }, 50);
        },
      });
    });
  }, []);

  const triggerConfirm = useCallback((message, title = "Confirmation") => {
    const previouslyActive = typeof document !== "undefined" ? document.activeElement : null;
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        isConfirm: true,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
          setTimeout(() => {
            if (previouslyActive && typeof previouslyActive.focus === "function") {
              previouslyActive.focus();
            }
          }, 50);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
          setTimeout(() => {
            if (previouslyActive && typeof previouslyActive.focus === "function") {
              previouslyActive.focus();
            }
          }, 50);
        },
      });
    });
  }, []);

  return { dialog, triggerAlert, triggerConfirm };
}

/**
 * Render this component inside your page JSX. Pass the `dialog` state from useAlertDialog().
 *
 * Usage:
 *   const { dialog, triggerAlert, triggerConfirm } = useAlertDialog();
 *   ...
 *   <AlertDialog dialog={dialog} />
 */
export default function AlertDialog({ dialog }) {
  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col p-6 animate-fade-in">
        <div className="flex items-center gap-2 text-slate-950 font-extrabold text-base mb-2 select-none">
          <span>⚠️</span> {dialog.title}
        </div>
        <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-6 select-none">
          {dialog.message}
        </p>
        <div className="flex gap-3">
          {dialog.isConfirm ? (
            <>
              <button
                onClick={() => dialog.onConfirm()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition cursor-pointer"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  if (dialog.onCancel) dialog.onCancel();
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer border"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => dialog.onConfirm()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition cursor-pointer"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
