import { ReactNode } from "react";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function ModalShell({ open, onClose, children }: ModalShellProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
