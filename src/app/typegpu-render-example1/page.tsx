"use client";

import { RenderPipeline } from "@/components/render-pipeline";
import { exampleFragment1 } from "@/shaders/example-fragment1";
import { mainVertex } from "@/shaders/main-vertex";

export default function TypegpuRenderExample1Page() {
  return (
    <div>
      <p>Click the canvas below to redraw</p>
      <div className="my-4">
        <RenderPipeline
          className="block aspect-square w-[420px] rounded border border-gray-300"
          vertexShader={mainVertex}
          fragmentShader={exampleFragment1}
        />
      </div>
    </div>
  );
}
