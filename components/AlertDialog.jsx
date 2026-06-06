import { useState, useCallback, useEffect } from "react";

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
  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        dialog.onConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (dialog.isConfirm && dialog.onCancel) {
          dialog.onCancel();
        } else {
          dialog.onConfirm();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog]);

  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-sm shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-white overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-2.5 text-slate-900 font-black text-lg mb-2 select-none tracking-tight">
          <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-sm shadow-inner border border-red-100">⚠️</div>
          {dialog.title}
        </div>
        <p className="text-sm font-semibold text-slate-600 leading-relaxed mb-6 select-none pl-10">
          {dialog.message}
        </p>
        <div className="flex gap-3 pl-10">
          {dialog.isConfirm ? (
            <>
              <button
                onClick={() => {
                  if (dialog.onCancel) dialog.onCancel();
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-sm border border-slate-200/50 hover:shadow"
              >
                Cancel
              </button>
              <button
                onClick={() => dialog.onConfirm()}
                className="flex-1 py-2 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-[0_2px_10px_rgba(59,130,246,0.3)] text-white font-bold text-sm rounded-xl active:scale-[0.98] transition-all cursor-pointer border border-blue-600"
              >
                Confirm
              </button>
            </>
          ) : (
            <button
              onClick={() => dialog.onConfirm()}
              className="w-full py-2 bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black shadow-[0_2px_10px_rgba(0,0,0,0.2)] text-white font-bold text-sm rounded-xl active:scale-[0.98] transition-all cursor-pointer border border-slate-900"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
