import { useEffect, useRef, useState } from "react";
import { useTheme } from "../app-shell/theme-context";
import { useI18n } from "../app-shell/i18n-context";

type WashingMachineProps = {
  isDark: boolean;
  isLoading: boolean;
  progress: number;
  size?: number;
  drumColor?: string;
  className?: string;
};

function WashingMachine({
  isDark,
  isLoading,
  progress,
  size = 120,
  drumColor,
  className = "drop-shadow-lg"
}: WashingMachineProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const id = setInterval(() => {
      setRotation(prev => (prev + 4) % 360);
    }, 40);
    return () => clearInterval(id);
  }, [isLoading]);

  const bodyFill = isDark ? "#374151" : "#f3f4f6";
  const bodyStroke = isDark ? "#4b5563" : "#d1d5db";
  const panelFill = isDark ? "#1f2937" : "#e5e7eb";
  const ringStroke = isDark ? "#4b5563" : "#9ca3af";
  const glassFill = isDark ? "#111827" : "#ffffff";
  const drumStroke = isDark ? "#6b7280" : "#9ca3af";
  const activeDrumFill = drumColor || "none";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
    >
      <rect x="10" y="20" width="100" height="94" rx="8" fill={bodyFill} stroke={bodyStroke} strokeWidth="2" />
      <rect x="15" y="25" width="90" height="15" rx="4" fill={panelFill} />
      <circle cx="25" cy="32" r="3" fill="#2563eb" />
      <circle cx="35" cy="32" r="3" fill="#10b981" />
      <circle cx="45" cy="32" r="3" fill="#f59e0b" />
      <circle cx="60" cy="75" r="30" fill="none" stroke={ringStroke} strokeWidth="3" />
      <circle cx="60" cy="75" r="26" fill={glassFill} opacity="0.9" />
      <g transform={`rotate(${rotation} 60 75)`}>
        <circle cx="60" cy="75" r="20" fill={activeDrumFill} fillOpacity={drumColor ? "0.9" : "1"} stroke={drumStroke} strokeWidth="1" />
        {[0, 60, 120, 180, 240, 300].map(angle => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 60 + 15 * Math.cos(rad);
          const y1 = 75 + 15 * Math.sin(rad);
          const x2 = 60 + 20 * Math.cos(rad);
          const y2 = 75 + 20 * Math.sin(rad);
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={drumStroke}
              strokeWidth="2"
            />
          );
        })}
      </g>
      {isLoading && (
        <defs>
          <clipPath id="drumClip">
            <circle cx="60" cy="75" r="20" />
          </clipPath>
        </defs>
      )}
      {isLoading && (
        <rect
          x="40"
          y={95 - progress * 0.4}
          width="40"
          height={progress * 0.4}
          fill="#3b82f6"
          opacity="0.3"
          clipPath="url(#drumClip)"
        />
      )}
    </svg>
  );
}

export function FullscreenLoader() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const slowTimer = setTimeout(() => {
      setSlow(true);
    }, 5000);
    return () => clearTimeout(slowTimer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 2;
      });
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="flex flex-col items-center gap-6">
        <WashingMachine isDark={isDark} isLoading={true} progress={progress} size={140} />
        <div className="w-64 space-y-3 text-center">
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={isDark ? "text-gray-200 text-lg font-semibold" : "text-gray-900 text-lg font-semibold"}>
            SmartLaundry
          </div>
          <div className={isDark ? "text-gray-400 text-xs" : "text-gray-600 text-xs"}>
            {t("loadingProgress").replace("{progress}", String(progress))}
          </div>
          {slow && (
            <div className={isDark ? "text-gray-300 text-xs mt-2 space-y-1" : "text-gray-700 text-xs mt-2 space-y-1"}>
              <div className="font-semibold">{t("loadingSlowTitle")}</div>
              <div>{t("loadingSlowReasonNetwork")}</div>
              <div>{t("loadingSlowReasonDevice")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function InlineMachine({
  size = 52,
  drumColor,
  className
}: {
  size?: number;
  drumColor?: string;
  className?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="flex items-center justify-center">
      <WashingMachine
        isDark={isDark}
        isLoading={false}
        progress={0}
        size={size}
        drumColor={drumColor}
        className={className}
      />
    </div>
  );
}
