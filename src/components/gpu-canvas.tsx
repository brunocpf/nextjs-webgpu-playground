"use client";

import { useEffect, useRef } from "react";

import { RenderJob, resizeCanvasToDisplay } from "@/lib/render";

export function GpuCanvasUniform({
  device,
  fragmentWGSL,
}: {
  device: GPUDevice;
  fragmentWGSL: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const jobRef = useRef<RenderJob | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  // Uniform layout:
  // @group(0) @binding(0) var<uniform> U : Uniforms; where
  //   Uniforms = { time: vec4<f32>; res: vec4<f32>; }
  const ensureUniformBuffer = (device: GPUDevice) => {
    return device.createBuffer({
      size: 8 * 4, // 8 f32 (two vec4)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const job = new RenderJob(device, canvas);
    job.setFragment(fragmentWGSL);
    job.buildPipeline();
    jobRef.current = job;

    const uniformBuf = ensureUniformBuffer(device);
    const bind = job.createBindGroup([
      { binding: 0, resource: { buffer: uniformBuf } },
    ]);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };
    window.addEventListener("mousemove", onMove);

    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      const { width, height } = resizeCanvasToDisplay(canvas);
      const f32 = new Float32Array([
        t,
        mouse.current.x,
        mouse.current.y,
        0,
        width,
        height,
        0,
        0,
      ]);
      device.queue.writeBuffer(uniformBuf, 0, f32.buffer);
      job.renderFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const onResize = () => resizeCanvasToDisplay(canvas);
    window.addEventListener("resize", onResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, [device, fragmentWGSL]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: 420,
        display: "block",
        borderRadius: 8,
        border: "1px solid #ccc",
      }}
    />
  );
}
