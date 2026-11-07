"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [enabled, router, seconds]);

  return (
    <label className="auto-refresh">
      <input type="checkbox" checked={enabled} onChange={() => setEnabled(!enabled)} />
      Auto-refresh {seconds}s
    </label>
  );
}
