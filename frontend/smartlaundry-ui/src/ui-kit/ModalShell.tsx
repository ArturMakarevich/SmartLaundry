import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  size?: "md" | "lg" | "xl";
  verticalAlign?: "top" | "center";
};

export function ModalShell({ open, onClose, children, panelClassName, size = "md", verticalAlign = "top" }: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const lockedScrollX = window.scrollX;
    const lockedScrollY = window.scrollY;
    const preventPageScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) {
        return;
      }
      event.preventDefault();
    };
    const preventPageScrollKeys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        event.preventDefault();
      }
    };
    const restorePageScroll = () => {
      if (window.scrollX !== lockedScrollX || window.scrollY !== lockedScrollY) {
        window.scrollTo(lockedScrollX, lockedScrollY);
      }
    };

    window.addEventListener("wheel", preventPageScroll, { passive: false });
    window.addEventListener("touchmove", preventPageScroll, { passive: false });
    window.addEventListener("keydown", preventPageScrollKeys);
    window.addEventListener("scroll", restorePageScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", preventPageScroll);
      window.removeEventListener("touchmove", preventPageScroll);
      window.removeEventListener("keydown", preventPageScrollKeys);
      window.removeEventListener("scroll", restorePageScroll);
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const defaultPanel = size === "xl"
    ? "w-full max-w-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl p-8 overflow-y-auto"
    : size === "lg"
    ? "w-full max-w-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl p-8 overflow-y-auto"
    : "w-full max-w-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-xl p-6 overflow-y-auto";
  const alignmentClass = verticalAlign === "center"
    ? "items-center px-4 py-4 sm:py-8"
    : "items-start px-4 pb-4 pt-4 sm:pt-8 sm:pb-8";

  // Вложенная структура (scroll wrapper → flex inner) предотвращает прыжок интерфейса
  // на iOS когда открывается клавиатура: позиция модала не зависит от высоты viewport
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className={`flex min-h-full justify-center ${alignmentClass}`}>
        <div
          ref={panelRef}
          className={panelClassName || defaultPanel}
          style={{ maxHeight: "calc(100dvh - 2rem)", overscrollBehavior: "contain" }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
