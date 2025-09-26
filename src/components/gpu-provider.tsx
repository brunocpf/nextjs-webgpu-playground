"use client";

import { createContext, use, useEffect, useState } from "react";

import { initWebGPU } from "@/lib/webgpu";

export const GpuContext = createContext<{
  device?: GPUDevice;
  error?: string;
}>({});

export function GpuProvider({ children }: React.PropsWithChildren) {
  const [device, setDevice] = useState<GPUDevice>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await initWebGPU(["shader-f16"]);
        if (!cancelled) {
          setDevice(ctx.device);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GpuContext.Provider value={{ device, error }}>
      {children}
    </GpuContext.Provider>
  );
}

export const useGpu = () => use(GpuContext);
