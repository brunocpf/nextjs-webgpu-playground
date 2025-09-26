import { promises } from "fs";

import { ComputeShaderExample } from "@/components/compute-shader-example";

export default async function ComputeShaderPage() {
  const shader = await promises.readFile(
    process.cwd() + "/src/shaders/compute-example.wgsl",
    "utf-8",
  );

  return (
    <div className="p-2">
      <h2 className="mb-2 text-lg font-bold">Compute Shader Example</h2>
      <ComputeShaderExample shader={shader} />
    </div>
  );
}
