"use client";

import { useCallback, useEffect, useRef } from "react";
import tgpu, { TgpuRenderPipeline, TgpuUniform } from "typegpu";
import * as d from "typegpu/data";

import { useGpu } from "@/providers/gpu-provider";

const timeAccess = tgpu["~unstable"].accessor(d.f32);
const resolutionAccess = tgpu["~unstable"].accessor(d.vec2f);
const mousePosAccess = tgpu["~unstable"].accessor(d.vec2f);

const mainVertex = tgpu["~unstable"].vertexFn({
  in: { vertexIndex: d.builtin.vertexIndex },
  out: { outPos: d.builtin.position, uv: d.vec2f },
}) /* wgsl */ `{
    var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(1.0, 1.0)
    );

    var uv = array<vec2<f32>, 6>(
        vec2<f32>(0.0, 1.0),
        vec2<f32>(0.0, 0.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 1.0)
    );

    return Out(vec4f(pos[in.vertexIndex], 0.0, 1.0), uv[in.vertexIndex]);
}
`;

const mainFragment = tgpu["~unstable"].fragmentFn({
  in: { uv: d.vec2f },
  out: d.vec4f,
}) /* wgsl */ `{

    let aspect = resolution.x / resolution.y;
    let correctedUv = vec2<f32>(in.uv.x * aspect, in.uv.y);
    let correctedMousePos = vec2<f32>(
        mousePos.x / resolution.x,
        1.0 - (mousePos.y / resolution.y)
    );

    let dist = distance(correctedUv, correctedMousePos);
    let speed = 2.0;
    let pulse = (sin(time * speed) + 1.0) * 0.5;
    let radiusMin = 0.03;
    let radiusMax = 0.08;
    let radius = mix(radiusMin, radiusMax, pulse);
    let background = vec4<f32>(0.2, 0.5, 1.0, 1.0);
    let circleColor = vec4<f32>(1.0, 0.5, 0.2, 1.0);

    let aaWidth = fwidth(dist); // smooth exactly one pixel for clean edge
    let t = smoothstep(radius - aaWidth, radius + aaWidth, dist);
    let finalColor = mix(circleColor, background, t);

    return finalColor;
}
`.$uses({
  time: timeAccess,
  resolution: resolutionAccess,
  mousePos: mousePosAccess,
});

export default function Page() {
  const { root, error } = useGpu();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<GPUCanvasContext>(null);
  const timeUniformRef = useRef<TgpuUniform<d.F32>>(null);
  const resolutionUniformRef = useRef<TgpuUniform<d.Vec2f>>(null);
  const mousePosUniformRef = useRef<TgpuUniform<d.Vec2f>>(null);
  const pipeline = useRef<TgpuRenderPipeline>(null);

  const syncCanvasSize = useCallback(
    (force = false) => {
      const canvas = canvasRef.current;
      const context = contextRef.current;

      if (!root || !canvas || !context) return;

      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const pixelHeight = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      const sizeChanged =
        canvas.width !== pixelWidth || canvas.height !== pixelHeight;

      if (sizeChanged) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      if (sizeChanged || force) {
        context.configure({
          device: root.device,
          format: navigator.gpu.getPreferredCanvasFormat(),
          alphaMode: "premultiplied",
        });
      }

      resolutionUniformRef.current?.write(d.vec2f(pixelWidth, pixelHeight));
    },
    [root],
  );

  useEffect(() => {
    if (!root) return;

    timeUniformRef.current = root.createUniform(d.f32, 0);
    resolutionUniformRef.current = root.createUniform(d.vec2f, d.vec2f(0, 0));
    mousePosUniformRef.current = root.createUniform(d.vec2f, d.vec2f(0, 0));

    pipeline.current = root["~unstable"]
      .with(timeAccess, timeUniformRef.current!)
      .with(resolutionAccess, resolutionUniformRef.current!)
      .with(mousePosAccess, mousePosUniformRef.current!)
      .withVertex(mainVertex, {})
      .withFragment(mainFragment, {
        format: navigator.gpu.getPreferredCanvasFormat(),
      })
      .createPipeline();
  }, [root]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!root || !canvas) return;

    const context = canvas.getContext("webgpu");

    if (!context) return;

    contextRef.current = context;
    syncCanvasSize(true);

    const handleResize = () => syncCanvasSize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      contextRef.current = null;
    };
  }, [root, syncCanvasSize]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mousePosUniformRef.current?.write(d.vec2f(x * dpr, y * dpr));
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    let startTime = performance.now();
    let animationFrameId: number;

    function render() {
      const context = contextRef.current;
      if (!root || !pipeline.current || !context) return;

      syncCanvasSize();

      const timestamp = (performance.now() - startTime) / 1000;

      if (timestamp > 500.0) startTime = performance.now();
      timeUniformRef.current?.write(timestamp);

      pipeline.current
        .withColorAttachment({
          view: context.getCurrentTexture().createView(),
          clearValue: [0, 0, 0, 1],
          loadOp: "clear",
          storeOp: "store",
        })
        .draw(6);
      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [root, syncCanvasSize]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>TypeGPU Example</h1>

      {root ? (
        <div>
          <div>WebGPU is initialized with TypeGPU!</div>
          <div className="mt-4">
            <h3 className="text-md mb-2 font-semibold">Output:</h3>
            <canvas
              ref={canvasRef}
              className="block aspect-square w-[420px] rounded border border-gray-300"
            />
          </div>
        </div>
      ) : (
        <div>Initializing WebGPU...</div>
      )}
    </div>
  );
}
