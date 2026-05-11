"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [language, setLanguage] = useState("en");

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Settings</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Language</h1>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Language</span>
        <select
          data-testid="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </label>
      <p data-testid="welcome-text" className="text-lg text-slate-700">
        {language === "es" ? "Bienvenido" : "Welcome"}
      </p>
    </div>
  );
}
