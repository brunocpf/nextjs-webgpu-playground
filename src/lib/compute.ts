// Generic compute pipeline helper that supports buffers, textures, and samplers.

export type ComputeBinding =
  | { index?: number; kind: "buffer"; buffer: GPUBuffer }
  | { index?: number; kind: "texture"; view: GPUTextureView } // sampled/readonly in compute not common, but allowed here
  | { index?: number; kind: "storage-texture"; view: GPUTextureView } // for texture_storage_2d write bindings
  | { index?: number; kind: "sampler"; sampler: GPUSampler }; // rarely used in compute, included for completeness

export type DispatchDims = { x: number; y?: number; z?: number };

export class ComputeJob {
  private device: GPUDevice;
  private module: GPUShaderModule;
  private pipeline: GPUComputePipeline | null = null;
  entryPoint: string;

  constructor(device: GPUDevice, wgsl: string, entryPoint = "main") {
    this.device = device;
    this.module = device.createShaderModule({ code: wgsl });
    this.entryPoint = entryPoint;
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

  createBindGroup(bindings: ComputeBinding[]): GPUBindGroup {
    if (!this.pipeline) throw new Error("Pipeline not built yet");
    const bgl = this.pipeline.getBindGroupLayout(0);
    const entries: GPUBindGroupEntry[] = bindings.map((b, i) => {
      const binding = b.index ?? i;
      if (b.kind === "buffer") {
        return { binding, resource: { buffer: b.buffer } };
      } else if (b.kind === "sampler") {
        return { binding, resource: b.sampler };
      } else {
        // texture or storage-texture both bind via texture view
        return { binding, resource: b.view };
      }
    });
    return this.device.createBindGroup({ layout: bgl, entries });
  }

  run(bindGroup: GPUBindGroup, dispatch: DispatchDims) {
    if (!this.pipeline) throw new Error("Pipeline not built yet");
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(dispatch.x, dispatch.y ?? 1, dispatch.z ?? 1);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  async readBuffer(src: GPUBuffer, byteLength: number): Promise<ArrayBuffer> {
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
