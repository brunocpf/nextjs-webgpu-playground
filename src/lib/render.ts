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
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;
  private vertModule: GPUShaderModule;
  private fragModule?: GPUShaderModule;
  private pipeline?: GPURenderPipeline;
  private bindGroup?: GPUBindGroup;

  constructor(
    private device: GPUDevice,
    private canvas: HTMLCanvasElement,
    private vertEntryPoint = "vmain",
    private fragEntryPoint = "fmain",
  ) {
    const { context, format } = createCanvasContext(device, canvas);
    this.context = context;
    this.format = format;

    this.vertModule = device.createShaderModule({ code: FULLSCREEN_TRI_VERT });
  }

  setFragment(wgsl: string) {
    this.fragModule = this.device.createShaderModule({ code: wgsl });
    this.pipeline = undefined;
    this.bindGroup = undefined;
  }

  async buildPipeline() {
    if (!this.fragModule) throw new Error("No fragment module set");

    this.pipeline = await this.device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module: this.vertModule, entryPoint: this.vertEntryPoint },
      fragment: {
        module: this.fragModule,
        entryPoint: this.fragEntryPoint,
        targets: [{ format: this.format }],
      },
      primitive: { topology: "triangle-list" },
    });

    return this.pipeline;
  }

  getPipeline() {
    if (!this.pipeline) throw new Error("Pipeline not built yet");
    return this.pipeline;
  }

  createBindGroup(entries: GPUBindGroupEntry[]) {
    const pipeline = this.getPipeline();

    const layout = pipeline.getBindGroupLayout(0);
    this.bindGroup = this.device.createBindGroup({ layout, entries });

    return this.bindGroup;
  }

  renderFrame(clear?: GPUColorDict) {
    const pipeline = this.getPipeline();
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

    pass.setPipeline(pipeline);

    if (this.bindGroup) pass.setBindGroup(0, this.bindGroup);

    pass.draw(3, 1, 0, 0);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }
}

function createCanvasContext(device: GPUDevice, canvas: HTMLCanvasElement) {
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("webgpu canvas context not available");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });
  return { context, format };
}
