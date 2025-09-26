"use client";

import { useRef, useState } from "react";

import { ComputeJob } from "@/lib/compute";
import { RenderJob } from "@/lib/render";
import { resizeCanvasToDisplay } from "@/lib/utils";
import { useGpu } from "@/providers/gpu-provider";

export interface PlaygroundProps {
  compTexWgsl?: string;
  fragTexWgsl?: string;
}

export default function Playground({
  compTexWgsl,
  fragTexWgsl,
}: PlaygroundProps) {
  const { device } = useGpu();

  const [wgslComputeToTex, setWgslComputeToTex] = useState<string>(
    compTexWgsl ?? DEFAULT_COMP_TEX,
  );
  const [wgslFragmentTex, setWgslFragmentTex] = useState<string>(
    fragTexWgsl ?? DEFAULT_FRAG_TEX,
  );

  // Compute→Texture panel refs
  const texCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const texRenderRef = useRef<RenderJob | null>(null);
  const texViewRef = useRef<GPUTextureView | null>(null);
  const texSamplerRef = useRef<GPUSampler | null>(null);
  const storageTexRef = useRef<GPUTexture | null>(null);

  if (!device) {
    return <div>Initializing WebGPU...</div>;
  }

  return (
    <div
      style={{
        maxWidth: 1150,
        margin: "24px auto",
        padding: 16,
        display: "grid",
        gap: 20,
      }}
    >
      <h1 style={{ margin: 0 }}>WebGPU Compute + Fragment + Compute→Texture</h1>

      {/* COMPUTE → TEXTURE → FRAGMENT */}
      <section style={sectionStyle}>
        <div>
          <h2 style={h2}>3) Compute → Texture → Fragment</h2>
          <p style={hint}>
            Compute writes a checker pattern into a <code>rgba8unorm</code>{" "}
            storage texture. Fragment samples that texture.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label style={label}>Compute WGSL (writes texture)</label>
              <textarea
                spellCheck={false}
                value={wgslComputeToTex}
                onChange={(e) => setWgslComputeToTex(e.target.value)}
                style={TA}
              />
            </div>
            <div>
              <label style={label}>Fragment WGSL (samples texture)</label>
              <textarea
                spellCheck={false}
                value={wgslFragmentTex}
                onChange={(e) => setWgslFragmentTex(e.target.value)}
                style={TA}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={async () => {
                // Create / refresh the storage texture sized to the canvas display size
                const canvas = texCanvasRef.current!;
                const job =
                  texRenderRef.current ?? new RenderJob(device, canvas);
                texRenderRef.current = job;

                job.setFragment(wgslFragmentTex);
                job.buildPipeline();

                const { width, height } = resizeCanvasToDisplay(canvas);
                // (Re)create storage texture if size changed
                if (
                  !storageTexRef.current ||
                  storageTexRef.current.width !== width ||
                  storageTexRef.current.height !== height
                ) {
                  storageTexRef.current?.destroy();
                  storageTexRef.current = device.createTexture({
                    size: { width, height },
                    format: "rgba8unorm",
                    usage:
                      GPUTextureUsage.STORAGE_BINDING |
                      GPUTextureUsage.TEXTURE_BINDING |
                      GPUTextureUsage.COPY_SRC,
                  });
                  texViewRef.current = storageTexRef.current.createView();
                  texSamplerRef.current = device.createSampler({
                    magFilter: "nearest",
                    minFilter: "nearest",
                  });
                }

                // Run compute into the storage texture
                const comp = new ComputeJob(device, wgslComputeToTex, "main");
                await comp.buildPipeline();
                const bgCompute = comp.createBindGroup([
                  {
                    kind: "storage-texture",
                    view: texViewRef.current!,
                    index: 0,
                  },
                ]);
                const wgX = Math.ceil(width / 8);
                const wgY = Math.ceil(height / 8);
                comp.run(bgCompute, { x: wgX, y: wgY });

                // Bind that texture+sampler for the fragment pass and render one frame
                job.createBindGroup([
                  { binding: 0, resource: texViewRef.current! },
                  { binding: 1, resource: texSamplerRef.current! },
                ]);
                job.renderFrame();
              }}
              style={BTN}
            >
              Run Compute → Update Texture
            </button>
          </div>

          <canvas
            ref={texCanvasRef}
            style={{
              width: "100%",
              height: 420,
              display: "block",
              borderRadius: 8,
              border: "1px solid #ccc",
              marginTop: 8,
            }}
          />
        </div>
      </section>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 12,
  padding: 16,
};
const h2: React.CSSProperties = { margin: "4px 0 8px", fontSize: 18 };
const hint: React.CSSProperties = { marginTop: 0, opacity: 0.75, fontSize: 13 };
const TA: React.CSSProperties = {
  width: "100%",
  minHeight: 160,
  padding: 12,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  lineHeight: 1.5,
  border: "1px solid #ccc",
  borderRadius: 8,
  whiteSpace: "pre",
};
const BTN: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fafafa",
  cursor: "pointer",
};
const label: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  marginBottom: 6,
};

const DEFAULT_COMP_TEX = `@group(0) @binding(0) var outTex : texture_storage_2d<rgba8unorm, write>;
@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let dims = textureDimensions(outTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }
  let v = ((gid.x / 32u) + (gid.y / 32u)) % 2u;
  let color = if (v == 0u) { vec4<u32>(255, 32, 64, 255) } else { vec4<u32>(32, 128, 255, 255) };
  textureStore(outTex, vec2<i32>(gid.xy), color);
}`;
const DEFAULT_FRAG_TEX = `@group(0) @binding(0) var myTex : texture_2d<f32>;
@group(0) @binding(1) var mySampler : sampler;
struct FSIn { @location(0) uv: vec2<f32> };
@fragment
fn fmain(in: FSIn) -> @location(0) vec4<f32> { return textureSample(myTex, mySampler, in.uv); }`;
