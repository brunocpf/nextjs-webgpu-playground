"use client";

import { useEffect, useRef } from "react";

import { RenderJob } from "@/lib/render";
import { resizeCanvasToDisplay } from "@/lib/utils";

export function GpuCanvasUniform({
  fragmentWGSL,
  device,
}: {
  fragmentWGSL: string;
  device: GPUDevice;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jobRef = useRef<RenderJob>(null);
  const animFrameRef = useRef<number>(null);
  const mouse = useRef({ x: 0, y: 0 });

  // Uniform layout:
  // @group(0) @binding(0) var<uniform> U : Uniforms; where
  //   Uniforms = { time: vec4<f32>; res: vec4<f32>; }
  const ensureUniformBuffer = (device: GPUDevice) => {
    return device.createBuffer({
      size: 8 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  };

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
      const canvas = canvasRef.current;
      jobRef.current = new RenderJob(device, canvas);

      jobRef.current.setFragment(fragmentWGSL);
      await jobRef.current.buildPipeline();

      // Create ONE uniform buffer and use it for both binding and updating
      const uniformBuf = ensureUniformBuffer(device);
      jobRef.current.createBindGroup([
        { binding: 0, resource: { buffer: uniformBuf } },
      ]);

      const start = performance.now();
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

        device.queue.writeBuffer(uniformBuf, 0, f32.buffer);
        jobRef.current?.renderFrame();
        animFrameRef.current = requestAnimationFrame(update);
      }
    }

    initJob();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, [device, fragmentWGSL]);

  return (
    <canvas
      ref={canvasRef}
      className="block aspect-square w-[420px] rounded border border-gray-300"
    />
  );
}
