"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

const DialogContext = createContext(null);

/* ─────────────────────────────────────────────────────────────
   Toast component
───────────────────────────────────────────────────────────── */
const TOAST_STYLES = {
  success: {
    bar: "bg-green-500",
    icon: CheckCircleIcon,
    iconClass: "text-green-500",
    bg: "bg-white border-l-4 border-green-500",
  },
  error: {
    bar: "bg-red-500",
    icon: ExclamationCircleIcon,
    iconClass: "text-red-500",
    bg: "bg-white border-l-4 border-red-500",
  },
  warning: {
    bar: "bg-yellow-500",
    icon: ExclamationTriangleIcon,
    iconClass: "text-yellow-500",
    bg: "bg-white border-l-4 border-yellow-500",
  },
  info: {
    bar: "bg-blue-500",
    icon: InformationCircleIcon,
    iconClass: "text-blue-500",
    bg: "bg-white border-l-4 border-blue-500",
  },
};

function Toast({ id, message, type = "error", onClose }) {
  const style = TOAST_STYLES[type] || TOAST_STYLES.error;
  const Icon = style.icon;

  useEffect(() => {
    const t = setTimeout(() => onClose(id), 4000);
    return () => clearTimeout(t);
  }, [id, onClose]);

  return (
    <div
      className={`flex items-start gap-3 w-80 rounded-lg shadow-xl px-4 py-3 ${style.bg} animate-slide-in-right`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.iconClass}`} />
      <p className="flex-1 text-sm text-gray-800 leading-snug">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Confirm Modal component
───────────────────────────────────────────────────────────── */
function ConfirmModal({ message, title, confirmLabel, danger, onResult }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onResult(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onResult]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onResult(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
        {/* Icon */}
        <div
          className={`mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full ${
            danger ? "bg-red-100" : "bg-amber-100"
          }`}
        >
          <ExclamationTriangleIcon
            className={`w-7 h-7 ${danger ? "text-red-600" : "text-amber-600"}`}
          />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {title || "Are you sure?"}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-600 text-center mb-6">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onResult(false)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onResult(true)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Provider
───────────────────────────────────────────────────────────── */
export function DialogProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const [toasts, setToasts] = useState([]);

  /**
   * confirm(message, options?)
   * options: { title, confirmLabel, danger }
   * Returns Promise<boolean>
   */
  const confirm = useCallback(
    (message, options = {}) =>
      new Promise((resolve) => {
        setConfirmState({ message, options, resolve });
      }),
    []
  );

  /**
   * toast(message, type?)
   * type: "success" | "error" | "warning" | "info"
   */
  const toast = useCallback((message, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleConfirm = useCallback(
    (result) => {
      confirmState?.resolve(result);
      setConfirmState(null);
    },
    [confirmState]
  );

  return (
    <DialogContext.Provider value={{ confirm, toast }}>
      {children}

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          title={confirmState.options?.title}
          confirmLabel={confirmState.options?.confirmLabel}
          danger={confirmState.options?.danger}
          onResult={handleConfirm}
        />
      )}

      {/* Toast Stack */}
      <div className="fixed bottom-5 right-5 z-[10000] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast
              id={t.id}
              message={t.message}
              type={t.type}
              onClose={closeToast}
            />
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}

export const useDialog = () => useContext(DialogContext);
