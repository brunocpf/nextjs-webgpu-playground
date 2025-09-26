"use client";

import { useState } from "react";

import { useGpu } from "@/components/gpu-provider";
import { ComputeJob } from "@/lib/compute";
import { align } from "@/lib/utils";

export function ComputeShaderExample({ shader }: { shader: string }) {
  const { device, error } = useGpu();

  const [shaderText, setShaderText] = useState(shader);
  const [n, setN] = useState(256);
  const [wgSize, setWgSize] = useState(64);
  const [output, setOutput] = useState<number[]>([]);
  const [log, setLog] = useState<string[]>([]);

  if (!device) {
    return <div>{error ? `Error: ${error}` : "Initializing WebGPU..."}</div>;
  }

  async function runComputeShader() {
    if (!device) {
      setLog((l) => [...l, "No GPU device available"]);
      return;
    }

    setOutput([]);

    const job = new ComputeJob(device, shaderText, "main");

    try {
      const params = new Uint32Array([n, 0, 0, 0]);
      const paramsBuf = job.makeBuffer(
        params.byteLength,
        GPUBufferUsage.UNIFORM,
        params,
      );

      const outBytes = align(n * 4);
      const outBuf = job.makeBuffer(
        outBytes,
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      );

      setLog((l) => [...l, "Building compute pipeline..."]);
      await job.buildPipeline();
      setLog((l) => [...l, "Compute pipeline built."]);

      const bg = job.createBindGroup([
        { kind: "buffer", buffer: paramsBuf, index: 0 },
        { kind: "buffer", buffer: outBuf, index: 1 },
      ]);

      const workgroups = Math.ceil(n / wgSize);
      setLog((l) => [...l, `Dispatching ${workgroups} workgroups...`]);

      job.run(bg, { x: workgroups });

      const data = await job.readBuffer(outBuf, outBytes);
      const view = new Uint32Array(data);
      setOutput(Array.from(view.slice(0, n)));
      setLog((l) => [
        ...l,
        `Compute shader ran successfully for N=${n}, wgSize=${wgSize}.`,
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setLog((l) => [...l, `Error running compute shader: ${msg}`]);
      console.error("Error running compute shader:", e);
    }
  }

  return (
    <div>
      <p>
        This example allows you to input a WGSL compute shader, specify the
        number of elements (N) and the workgroup size, then run the shader and
        see the output.
      </p>
      <textarea
        className="h-48 w-full rounded border border-gray-300 p-2"
        value={shaderText}
        onChange={(e) => setShaderText(e.target.value)}
      />
      <div className="mt-2">
        <label className="mr-2">
          N:
          <input
            type="number"
            className="ml-1 w-20 rounded border border-gray-300 p-1"
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
        <label className="mr-2">
          Workgroup Size:
          <input
            type="number"
            className="ml-1 w-20 rounded border border-gray-300 p-1"
            value={wgSize}
            onChange={(e) => setWgSize(Number(e.target.value))}
          />
        </label>
      </div>
      <button
        className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        onClick={runComputeShader}
      >
        Run Compute Shader
      </button>
      <div className="mt-4">
        <h3 className="text-md mb-2 font-semibold">Output:</h3>
        <pre className="overflow-auto rounded border border-gray-300 bg-gray-100 p-2">
          {output.length > 0 ? JSON.stringify(output) : "No output"}
        </pre>
      </div>

      <div className="mt-4">
        <h3 className="text-md mb-2 font-semibold">Log:</h3>
        <pre className="h-48 overflow-auto rounded border border-gray-300 bg-gray-100 p-2">
          {log.length > 0 ? log.join("\n") : "No log messages"}
        </pre>
      </div>
    </div>
  );
}
