"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  TgpuAccessor,
  TgpuFragmentFn,
  TgpuRenderPipeline,
  TgpuUniform,
  TgpuVertexFn,
  WithBinding,
} from "typegpu";
import * as d from "typegpu/data";

import { useGpu } from "@/providers/gpu-provider";

export type Binding<T extends d.AnyWgslData> = [
  TgpuAccessor<T>,
  TgpuUniform<T> | undefined,
];

export type RenderPipelineProps<TBindingData extends Binding<d.AnyWgslData>[]> =
  {
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

    bindings?: TBindingData;

    onFrame?: (elapsedTime: number) => void;

    canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  };

export function RenderPipeline<
  TBindingData extends Binding<d.AnyWgslData>[] = [],
>({
  vertexShader,
  fragmentShader,
  bindings,
  onFrame,
  canvasRef: externalCanvasRef,
  ...rest
}: RenderPipelineProps<TBindingData> &
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

    let boundRoot: WithBinding = root["~unstable"];

    if (bindings) {
      for (const [accessor, uniform] of bindings) {
        if (!uniform) continue;

        boundRoot = boundRoot.with(accessor, uniform);
      }
    }

    try {
      pipelineRef.current = boundRoot
        .withVertex(vertexShader, {})
        .withFragment(fragmentShader, {
          format: navigator.gpu.getPreferredCanvasFormat(),
        })
        .createPipeline();
    } catch (error) {
      console.error("Error creating pipeline:", error);
    }
  }, [fragmentShader, redraw, root, vertexShader, bindings]);

  // Animation loop
  useEffect(() => {
    const startTime = performance.now();

    let animationFrameId: number;

    const render = () => {
      const currentTime = performance.now();
      const elapsedTime = (currentTime - startTime) / 1000;
      onFrame?.(elapsedTime);

      redraw();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [onFrame, redraw]);

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
      ref={(el) => {
        canvasRef.current = el;
        if (externalCanvasRef) {
          externalCanvasRef.current = el;
        }
      }}
      onClick={(e) => {
        rest.onClick?.(e);
        redraw();
      }}
    />
  );
}
