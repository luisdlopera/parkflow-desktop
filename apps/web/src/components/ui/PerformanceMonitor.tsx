"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

interface PerformanceMonitorProps {
  feature: string;
}

export function PerformanceMonitor({ feature }: PerformanceMonitorProps) {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === "development") {
      switch (metric.name) {
        case "LCP":
          console.log(`[PerformanceMonitor] [${feature}] LCP:`, Math.round(metric.value), "ms");
          break;
        case "INP":
          console.log(`[PerformanceMonitor] [${feature}] INP:`, Math.round(metric.value), "ms");
          break;
        case "CLS":
          console.log(`[PerformanceMonitor] [${feature}] CLS:`, metric.value);
          break;
        default:
          break;
      }
    }
  });

  useEffect(() => {
    const startTime = performance.now();
    return () => {
      if (process.env.NODE_ENV === "development") {
        const timeSpent = Math.round(performance.now() - startTime);
        console.log(`[PerformanceMonitor] [${feature}] Unmounted after:`, timeSpent, "ms");
      }
    };
  }, [feature]);

  return null;
}
