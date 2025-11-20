"use client";

import { useCallback, useEffect, useRef } from "react";
import { TgpuFragmentFn, TgpuRenderPipeline, TgpuVertexFn } from "typegpu";
import * as d from "typegpu/data";

import { useGpu } from "@/providers/gpu-provider";

export type RenderPipelineProps = {
  vertexShader: TgpuVertexFn<
    Record<never, never>,
    {
      uv: d.Vec2f;
    }
  >;

  fragmentShader: TgpuFragmentFn<
    {
      uv: d.Vec2f;
    },
    d.Vec4f
  >;
};

export function RenderPipeline({
  vertexShader,
  fragmentShader,
  ...rest
}: RenderPipelineProps &
  React.DetailedHTMLProps<
    React.CanvasHTMLAttributes<HTMLCanvasElement>,
    HTMLCanvasElement
  >) {
  const { root, error } = useGpu();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipelineRef = useRef<TgpuRenderPipeline>(null);

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("webgpu");
    const pipeline = pipelineRef.current;

    if (!root || !canvas || !context || !pipeline) return;

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const pixelHeight = Math.max(1, Math.floor(canvas.clientHeight * dpr));

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    context.configure({
      device: root.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: "premultiplied",
    });

    pipeline
      .withColorAttachment({
        view: context.getCurrentTexture().createView(),
        clearValue: [0, 0, 0, 1],
        loadOp: "clear",
        storeOp: "store",
      })
      .draw(6);
  }, [root]);

  // Create pipeline
  useEffect(() => {
    if (!root) return;

    pipelineRef.current = root["~unstable"]
      .withVertex(vertexShader, {})
      .withFragment(fragmentShader, {
        format: navigator.gpu.getPreferredCanvasFormat(),
      })
      .createPipeline();

    redraw();
  }, [fragmentShader, redraw, root, vertexShader]);

  if (error) {
    return (
      <div className={rest.className}>Error initializing WebGPU: {error}</div>
    );
  }

  if (!root) {
    return <div className={rest.className}>Initializing WebGPU...</div>;
  }

  return (
    <canvas
      {...rest}
      ref={canvasRef}
      onClick={(e) => {
        rest.onClick?.(e);
        redraw();
      }}
    />
  );
}
