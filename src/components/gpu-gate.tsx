"use client";

import { useEffect, useState } from "react";

import { initWebGPU } from "@/lib/webgpu";

export function GpuGate({
  children,
  onReady,
}: {
  children: (ctx: { device: GPUDevice }) => React.ReactNode;
  onReady?: (ctx: { device: GPUDevice }) => void;
}) {
  const [device, setDevice] = useState<GPUDevice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await initWebGPU(["shader-f16"]);
        if (!cancelled) {
          setDevice(ctx.device);
          onReady?.({ device: ctx.device });
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onReady]);

  if (error)
    return (
      <div style={{ padding: 16 }}>
        <b>WebGPU init failed:</b> {error}
      </div>
    );
  if (!device) return <div style={{ padding: 16 }}>Initializing WebGPU…</div>;
  return <>{children({ device })}</>;
}
