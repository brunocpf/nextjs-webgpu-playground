"use client";

import { createContext, use, useEffect, useState } from "react";
import tgpu, { TgpuRoot } from "typegpu";

export const GpuContext = createContext<{
  root?: TgpuRoot;
  device?: GPUDevice;
  error?: string;
}>({});

export function GpuProvider({ children }: React.PropsWithChildren) {
  const [root, setRoot] = useState<TgpuRoot>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const root = await tgpu.init();
        if (!cancelled) {
          setRoot(root);
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
    <GpuContext.Provider value={{ root, device: root?.device, error }}>
      {children}
    </GpuContext.Provider>
  );
}

export const useGpu = () => use(GpuContext);
