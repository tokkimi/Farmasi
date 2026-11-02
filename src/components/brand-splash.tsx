"use client";

import { useEffect, useState } from "react";

/** Brand reveal shown once per browser session on the first page load. */
export function BrandSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.sessionStorage.getItem("farmasi-brand-reveal") === "seen") {
      const immediate = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(immediate);
    }
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem("farmasi-brand-reveal", "seen");
      setVisible(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <div className="farmasi-brand-splash" role="status" aria-label="Farmasi se prépare">
      <div className="haru-brand-splash-glow" />
      <div className="farmasi-brand-splash-mark" aria-hidden="true">F</div>
      <div className="farmasi-brand-splash-wordmark"><strong>FARMASI</strong><span>BEAUTY INNOVATION</span></div>
      <div className="farmasi-brand-loading" aria-hidden="true"><i /></div>
    </div>
  );
}
