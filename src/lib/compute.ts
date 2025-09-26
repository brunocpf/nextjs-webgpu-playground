import { align } from "./utils";

export type ComputeBinding =
  | { index?: number; kind: "buffer"; buffer: GPUBuffer }
  | { index?: number; kind: "texture"; view: GPUTextureView }
  | { index?: number; kind: "storage-texture"; view: GPUTextureView }
  | { index?: number; kind: "sampler"; sampler: GPUSampler };

export type DispatchDims = { x: number; y?: number; z?: number };

export class ComputeJob {
  private module: GPUShaderModule;
  private pipeline?: GPUComputePipeline;
  private bindGroup?: GPUBindGroup;

  constructor(
    private device: GPUDevice,
    wgsl: string,
    private entryPoint = "main",
  ) {
    this.module = device.createShaderModule({ code: wgsl });
  }

  async buildPipeline() {
    this.pipeline = await this.device.createComputePipelineAsync({
      layout: "auto",
      compute: { module: this.module, entryPoint: this.entryPoint },
    });
    return this.pipeline;
  }

  getPipeline() {
    if (!this.pipeline) throw new Error("Pipeline not built yet");
    return this.pipeline;
  }

  createBindGroup(bindings: ComputeBinding[]) {
    const pipeline = this.getPipeline();
    const layout = pipeline.getBindGroupLayout(0);

    const entries: GPUBindGroupEntry[] = bindings.map((b, i) => {
      const binding = b.index ?? i;
      if (b.kind === "buffer") {
        return { binding, resource: { buffer: b.buffer } };
      } else if (b.kind === "sampler") {
        return { binding, resource: b.sampler };
      } else {
        return { binding, resource: b.view };
      }
    });

    this.bindGroup = this.device.createBindGroup({ layout, entries });

    return this.bindGroup;
  }

  run(bindGroup: GPUBindGroup, dispatch: DispatchDims) {
    const pipeline = this.getPipeline();
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(dispatch.x, dispatch.y ?? 1, dispatch.z ?? 1);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  makeBuffer(size: number, usage: GPUBufferUsageFlags, data?: ArrayBufferView) {
    const buffer = this.device.createBuffer({
      size: align(size, 4),
      usage,
      mappedAtCreation: !!data,
    });

    if (data) {
      const write = buffer.getMappedRange();
      new Uint8Array(write).set(
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      );
      buffer.unmap();
    }
    return buffer;
  }

  async readBuffer(src: GPUBuffer, byteLength?: number) {
    byteLength = byteLength ?? src.size;

    const staging = this.device.createBuffer({
      size: byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(src, 0, staging, 0, byteLength);
    this.device.queue.submit([encoder.finish()]);

    await staging.mapAsync(GPUMapMode.READ);
    const copy = staging.getMappedRange().slice(0);
    staging.unmap();
    staging.destroy();

    return copy;
  }
}
