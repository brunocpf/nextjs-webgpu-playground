"use client";

import { useRef, useState } from "react";

import { ComputeJob } from "@/lib/compute";
import { RenderJob } from "@/lib/render";
import { align, resizeCanvasToDisplay } from "@/lib/utils";
import { makeBuffer } from "@/lib/webgpu";

import { GpuCanvasUniform } from "./gpu-canvas";
import { useGpu } from "./gpu-provider";

export interface PlaygroundProps {
  compWgsl?: string;
  fragUniWgsl?: string;
  compTexWgsl?: string;
  fragTexWgsl?: string;
}

export default function Playground({
  compWgsl,
  fragUniWgsl,
  compTexWgsl,
  fragTexWgsl,
}: PlaygroundProps) {
  const { device } = useGpu();

  // State for the three panels
  const [wgslCompute, setWgslCompute] = useState<string>(
    compWgsl ?? DEFAULT_COMP,
  );
  const [wgslFragmentUniform, setWgslFragmentUniform] = useState<string>(
    fragUniWgsl ?? DEFAULT_FRAG_UNI,
  );
  const [wgslComputeToTex, setWgslComputeToTex] = useState<string>(
    compTexWgsl ?? DEFAULT_COMP_TEX,
  );
  const [wgslFragmentTex, setWgslFragmentTex] = useState<string>(
    fragTexWgsl ?? DEFAULT_FRAG_TEX,
  );

  const [n, setN] = useState(256);
  const [wgSize, setWgSize] = useState(64);
  const [out, setOut] = useState<number[]>([]);
  const [log, setLog] = useState<string>("");
  function append(msg: string) {
    setLog((l) => l + msg + "\n");
  }

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

      {/* FRAGMENT (uniforms) */}
      <section style={sectionStyle}>
        <div>
          <h2 style={h2}>1) Fragment (uniforms)</h2>
          <p style={hint}>
            Uniforms: <code>U.time.x</code> (seconds), <code>U.time.yz</code>{" "}
            (mouse px), <code>U.res.xy</code> (width/height px). Entry:{" "}
            <code>fmain</code>.
          </p>
          <textarea
            spellCheck={false}
            value={wgslFragmentUniform}
            onChange={(e) => setWgslFragmentUniform(e.target.value)}
            style={TA}
          />
          <GpuCanvasUniform
            device={device}
            fragmentWGSL={wgslFragmentUniform}
          />
        </div>
      </section>

      {/* COMPUTE (buffer) */}
      <section style={sectionStyle}>
        <div>
          <h2 style={h2}>2) Compute (buffer readback)</h2>
          <p style={hint}>
            Writes <code>out[i] = i*i</code> into a storage buffer; we read back
            the first 64 values.
          </p>
          <textarea
            spellCheck={false}
            value={wgslCompute}
            onChange={(e) => setWgslCompute(e.target.value)}
            style={TA}
          />
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 8,
            }}
          >
            <label>
              N:
              <input
                type="number"
                value={n}
                min={1}
                onChange={(e) => setN(parseInt(e.target.value || "1", 10))}
                style={IN}
              />
            </label>
            <label>
              Workgroup size (x):
              <input
                type="number"
                value={wgSize}
                min={1}
                onChange={(e) => setWgSize(parseInt(e.target.value || "1", 10))}
                style={IN}
              />
            </label>
            <button
              onClick={async () => {
                setOut([]);
                setLog("");
                try {
                  const paramsBytes = 16;
                  const params = new Uint32Array([n, 0, 0, 0]);
                  const paramsBuf = makeBuffer(
                    device,
                    paramsBytes,
                    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                  );
                  device.queue.writeBuffer(paramsBuf, 0, params);

                  const outBytes = align(n * 4);
                  const outBuf = makeBuffer(
                    device,
                    outBytes,
                    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
                  );

                  const job = new ComputeJob(device, wgslCompute, "main");
                  await job.buildPipeline();
                  const bg = job.createBindGroup([
                    { kind: "buffer", buffer: paramsBuf, index: 0 },
                    { kind: "buffer", buffer: outBuf, index: 1 },
                  ]);

                  const workgroups = Math.ceil(n / wgSize);
                  job.run(bg, { x: workgroups });

                  const data = await job.readBuffer(outBuf, outBytes);
                  const view = new Uint32Array(data);
                  setOut(Array.from(view.slice(0, Math.min(64, n))));
                  append(
                    `Compute OK — N=${n}, dispatched ${workgroups} groups.`,
                  );
                } catch (e: unknown) {
                  append(
                    `Compute error: ${e instanceof Error ? e.message : String(e)}`,
                  );
                }
              }}
              style={BTN}
            >
              Run Compute
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            <label style={label}>Output (first 64)</label>
            <pre style={PRE}>{JSON.stringify(out)}</pre>
          </div>
          <div>
            <label style={label}>Log</label>
            <pre style={PRE}>{log}</pre>
          </div>
        </div>
      </section>

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
const IN: React.CSSProperties = { marginLeft: 6, width: 120 };
const BTN: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fafafa",
  cursor: "pointer",
};
const PRE: React.CSSProperties = {
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 8,
  minHeight: 60,
  background: "#fafafa",
  overflowX: "auto",
};
const label: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  marginBottom: 6,
};

const DEFAULT_COMP = `struct Params { n: u32, _0:u32, _1:u32, _2:u32, };
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> outBuf: array<u32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i < params.n) { outBuf[i] = i * i; }
}`;
const DEFAULT_FRAG_UNI = `struct Uniforms { time: vec4<f32>; res: vec4<f32>; };
@group(0) @binding(0) var<uniform> U : Uniforms;
struct FSIn { @location(0) uv: vec2<f32> };
@fragment
fn fmain(in: FSIn) -> @location(0) vec4<f32> {
  let t = U.time.x;
  let p = in.uv * 2.0 - vec2<f32>(1.0);
  let v = 0.5 + 0.5 * sin(6.2831*(p.x + p.y) + t);
  return vec4<f32>(v, 0.3 + 0.7*v, 0.6 + 0.4*v, 1.0);
}`;
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
