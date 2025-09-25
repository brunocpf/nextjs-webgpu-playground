import { promises } from "fs";

import ExampleCompute from "@/components/example-compute";

export default async function ExamplePage() {
  const compWgsl = await promises.readFile(
    process.cwd() + "/src/shaders/example.wgsl",
    "utf-8",
  );
  const fragUniWgsl = await promises.readFile(
    process.cwd() + "/src/shaders/fragment_uniform.wgsl",
    "utf-8",
  );
  const compTexWgsl = await promises.readFile(
    process.cwd() + "/src/shaders/compute_to_tex.wgsl",
    "utf-8",
  );
  const fragTexWgsl = await promises.readFile(
    process.cwd() + "/src/shaders/sample_tex.wgsl",
    "utf-8",
  );

  return (
    <div className="p-2">
      <h1>Example Compute Shader</h1>
      <p>This example runs a simple compute shader that writes to a buffer.</p>
      <ExampleCompute
        compWgsl={compWgsl}
        fragUniWgsl={fragUniWgsl}
        compTexWgsl={compTexWgsl}
        fragTexWgsl={fragTexWgsl}
      />
    </div>
  );
}
