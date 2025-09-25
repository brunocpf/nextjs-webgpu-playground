export type WebGpuContext = {
  adapter: GPUAdapter;
  device: GPUDevice;
  supportedFeatures: ReadonlySet<GPUFeatureName>;
};

export async function initWebGPU(
  requestedFeatures: GPUFeatureName[] = [],
): Promise<WebGpuContext> {
  if (!("gpu" in navigator)) {
    throw new Error(
      "WebGPU not supported in this browser. Try Chrome/Edge ≥ 113 or Safari TP with WebGPU.",
    );
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("No GPU adapter found.");

  const supported = adapter.features;
  const features = requestedFeatures.filter((f) => supported.has(f));

  const device = await adapter.requestDevice({ requiredFeatures: features });
  return {
    adapter,
    device,
    supportedFeatures: adapter.features as ReadonlySet<GPUFeatureName>,
  };
}

export function makeBuffer(
  device: GPUDevice,
  size: number,
  usage: GPUBufferUsageFlags,
  data?: ArrayBufferView,
): GPUBuffer {
  const buffer = device.createBuffer({
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

// WebGPU copy alignment helper
export function align(n: number, to = 4) {
  return Math.ceil(n / to) * to;
}
