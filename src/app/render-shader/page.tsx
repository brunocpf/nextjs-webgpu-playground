import { promises } from "fs";

import { RenderShaderExample } from "@/components/render-shader-example";

export default async function RenderShaderPage() {
  const shader = await promises.readFile(
    process.cwd() + "/src/shaders/render_example.wgsl",
    "utf-8",
  );

  return (
    <div className="p-2">
      <h2 className="mb-2 text-lg font-bold">Render Shader Example</h2>
      <RenderShaderExample shader={shader} />
    </div>
  );
}
