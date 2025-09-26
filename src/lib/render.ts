export function createCanvasContext(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
) {
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("webgpu canvas context not available");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });
  return { context, format };
}

const FULLSCREEN_TRI_VERT = /* wgsl */ `
struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };
@vertex fn vmain(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 3.0,  1.0)
  );
  var out: VSOut;
  let xy = p[vi];
  out.pos = vec4<f32>(xy, 0.0, 1.0);
  out.uv = (xy * 0.5) + vec2<f32>(0.5);
  return out;
}
`;

export class RenderJob {
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  format: GPUTextureFormat;

  private vertModule: GPUShaderModule;
  private fragModule: GPUShaderModule | null = null;
  pipeline: GPURenderPipeline | null = null;
  bindGroup: GPUBindGroup | null = null;

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.device = device;
    this.canvas = canvas;
    const { context, format } = createCanvasContext(device, canvas);
    this.context = context;
    this.format = format;

    this.vertModule = device.createShaderModule({ code: FULLSCREEN_TRI_VERT });
  }

  setFragment(wgsl: string) {
    this.fragModule = this.device.createShaderModule({ code: wgsl });
    this.pipeline = null;
    this.bindGroup = null;
  }

  buildPipeline() {
    if (!this.fragModule) throw new Error("No fragment module set");
    this.pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: { module: this.vertModule, entryPoint: "vmain" },
      fragment: {
        module: this.fragModule,
        entryPoint: "fmain",
        targets: [{ format: this.format }],
      },
      primitive: { topology: "triangle-list" },
    });
    return this.pipeline;
  }

  createBindGroup(entries: GPUBindGroupEntry[]) {
    if (!this.pipeline) this.buildPipeline();
    const bgl = this.pipeline!.getBindGroupLayout(0);
    this.bindGroup = this.device.createBindGroup({ layout: bgl, entries });
    return this.bindGroup;
  }

  renderFrame(clear?: GPUColorDict) {
    if (!this.pipeline) this.buildPipeline();
    const texView = this.context.getCurrentTexture().createView();
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: texView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: clear ?? { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    pass.setPipeline(this.pipeline!);
    if (this.bindGroup) pass.setBindGroup(0, this.bindGroup);
    pass.draw(3, 1, 0, 0);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}

export function resizeCanvasToDisplay(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { width: w, height: h, dpr };
}
