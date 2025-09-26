"use client";

import { useState } from "react";

import { GpuCanvasUniform } from "@/components/gpu-canvas";
import { useGpu } from "@/components/gpu-provider";

export function RenderShaderExample({ shader }: { shader: string }) {
  const { device, error } = useGpu();

  const [shaderText, setShaderText] = useState(shader);

  if (!device) {
    return <div>{error ? `Error: ${error}` : "Initializing WebGPU..."}</div>;
  }

  return (
    <div>
      <p>This example allows you to input a WGSL fragment shader.</p>
      <textarea
        className="h-48 w-full rounded border border-gray-300 p-2"
        value={shaderText}
        onChange={(e) => setShaderText(e.target.value)}
      />
      <div className="mt-4">
        <h3 className="text-md mb-2 font-semibold">Output:</h3>
        <GpuCanvasUniform device={device} fragmentWGSL={shaderText} />
      </div>
    </div>
  );
}
