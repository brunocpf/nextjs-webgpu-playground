"use client";

import { useEffect, useRef, useState } from "react";

import { RenderJob } from "@/lib/render";
import { resizeCanvasToDisplay } from "@/lib/utils";
import { useGpu } from "@/providers/gpu-provider";

export function RenderShaderExample({ shader }: { shader: string }) {
  const { root, error } = useGpu();
  const device = root?.device;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jobRef = useRef<RenderJob>(null);
  const animFrameRef = useRef<number>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const [shaderText, setShaderText] = useState(shader);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    }

    function onResize() {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      resizeCanvasToDisplay(canvas);
    }

    async function initJob() {
      if (!canvasRef.current) return;

      try {
        if (!device) {
          setLog((l) => [...l, "No GPU device available"]);
          return;
        }

        const canvas = canvasRef.current;
        jobRef.current = new RenderJob(device, canvas);

        jobRef.current.setFragment(shaderText);
        await jobRef.current.buildPipeline();

        const uniformBuf = device.createBuffer({
          size: 8 * 4,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        jobRef.current.createBindGroup([
          { binding: 0, resource: { buffer: uniformBuf } },
        ]);

        const start = performance.now();

        setLog((l) => [
          ...l,
          "Render job initialized",
          "Starting render loop...",
        ]);

        animFrameRef.current = requestAnimationFrame(update);

        window.addEventListener("mousemove", onMove);
        window.addEventListener("resize", onResize);

        function update() {
          const t = (performance.now() - start) / 1000;
          const { width, height } = resizeCanvasToDisplay(canvas);

          const f32 = new Float32Array([
            t, // time.x
            mouse.current.x, // time.y
            mouse.current.y, // time.z
            0, // time.w
            width, // res.x
            height, // res.y
            0, // res.z
            0, // res.w
          ]);

          if (!device) return;

          device.queue.writeBuffer(uniformBuf, 0, f32.buffer);
          jobRef.current?.renderFrame();
          animFrameRef.current = requestAnimationFrame(update);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setLog((l) => [...l, `Error initializing render job: ${msg}`]);
        console.error("Error initializing render job:", e);
        return;
      }
    }

    initJob();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, [device, shaderText]);

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
        <canvas
          ref={canvasRef}
          className="block aspect-square w-[420px] rounded border border-gray-300"
        />
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
