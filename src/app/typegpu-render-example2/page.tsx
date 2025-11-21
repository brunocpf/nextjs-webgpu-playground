"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TgpuUniform } from "typegpu";
import * as d from "typegpu/data";

import { RenderPipeline } from "@/components/render-pipeline";
import { useGpu } from "@/providers/gpu-provider";
import {
  mousePosAccess,
  resolutionAccess,
  timeAccess,
} from "@/shaders/accessors";
import { exampleFragment2 } from "@/shaders/example-fragment2";
import { mainVertex } from "@/shaders/main-vertex";

export default function TypegpuRenderExample2Page() {
  const { root } = useGpu();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeUniform, setTimeUniform] = useState<TgpuUniform<d.F32>>();
  const [mouseUniform, setMouseUniform] = useState<TgpuUniform<d.Vec2f>>();
  const [resolutionUniform, setResolutionUniform] =
    useState<TgpuUniform<d.Vec2f>>();

  useEffect(() => {
    if (!root) return;

    setTimeUniform(root.createUniform(d.f32, 0));
    setMouseUniform(root.createUniform(d.vec2f, d.vec2f(0, 0)));
    setResolutionUniform(root.createUniform(d.vec2f, d.vec2f(0, 0)));
  }, [root]);

  useEffect(() => {
    function onResize() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const pixelHeight = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      resolutionUniform?.write(d.vec2f(pixelWidth, pixelHeight));
    }

    function onMouseMove(e: MouseEvent) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseUniform?.write(d.vec2f(x * dpr, y * dpr));
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);

    onResize();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, [mouseUniform, resolutionUniform]);

  const handleFrame = useCallback(
    (elapsedTime: number) => {
      timeUniform?.write(elapsedTime);
    },
    [timeUniform],
  );

  return (
    <div>
      <div className="my-4">
        <RenderPipeline
          className="block aspect-square w-[420px] rounded border border-gray-300"
          vertexShader={mainVertex}
          fragmentShader={exampleFragment2}
          onFrame={handleFrame}
          bindings={[
            [timeAccess, timeUniform],
            [mousePosAccess, mouseUniform],
            [resolutionAccess, resolutionUniform],
          ]}
          canvasRef={canvasRef}
        />
      </div>
    </div>
  );
}
