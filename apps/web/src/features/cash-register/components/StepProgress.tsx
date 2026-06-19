"use client";
import React from "react";

function getStepColor(done: boolean, isCountPending: boolean, index: number): string {
  if (done) return "bg-emerald-500 text-white";
  if (isCountPending && index === 2) return "bg-blue-500 text-white";
  return "bg-slate-200 text-slate-400";
}

export default function StepProgress({ stepsState, session }: any) {
  return (
    <div className="flex items-center justify-between gap-1 pt-1">
      {stepsState.map((step: any, i: number) => (
        <div key={step.label} className="flex items-center gap-1 flex-1">
          <div className="flex flex-col items-center flex-1">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${getStepColor(step.done, !session?.countedAt, i)}`}>
              {step.done ? "✓" : String(i + 1)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1">{step.label}</span>
          </div>
          {i < stepsState.length - 1 ? (
            <div className={`h-[2px] flex-1 self-start mt-3 ${step.done ? "bg-emerald-300" : "bg-slate-200"}`} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
