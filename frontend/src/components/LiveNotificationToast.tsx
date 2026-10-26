import React from "react";
import { AlertTriangle, CheckCircle2, Info, X, Zap } from "lucide-react";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: "warning" | "success" | "info" | "disruption";
  timestamp: string;
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const LiveNotificationToast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isDisruption = toast.type === "disruption";
        const isSuccess = toast.type === "success";
        const isWarning = toast.type === "warning";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-2xl border backdrop-blur-md transform transition-all duration-300 animate-slide-in ${
              isDisruption
                ? "bg-railway-ruby/20 border-railway-ruby/50 text-white"
                : isSuccess
                ? "bg-railway-emerald/20 border-railway-emerald/50 text-white"
                : isWarning
                ? "bg-railway-amber/20 border-railway-amber/50 text-white"
                : "bg-railway-surface/90 border-railway-border text-white"
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {isDisruption ? (
                <Zap className="w-5 h-5 text-red-400 animate-bounce" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <Info className="w-5 h-5 text-blue-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold tracking-wide uppercase">
                  {toast.title}
                </h4>
                <span className="text-[10px] text-railway-textMuted font-mono">
                  {toast.timestamp}
                </span>
              </div>
              <p className="text-xs text-railway-textSecondary mt-0.5 leading-snug">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-railway-textMuted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
