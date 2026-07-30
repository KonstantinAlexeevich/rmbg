import * as ort from 'onnxruntime-web/webgpu';
import type { Backend } from '../types';

export type IsnetSession = {
  session: ort.InferenceSession;
  backend: Backend;
};

export async function createSession(
  backend: Backend,
  modelBytes: Uint8Array,
  ortWasmDir: string,
): Promise<IsnetSession> {
  ort.env.wasm.wasmPaths = ortWasmDir;
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(4, navigator.hardwareConcurrency || 1)
    : 1;

  // ровно один провайдер: список ['webgpu','wasm'] дал бы неявный фолбэк,
  // при котором мы не узнаем о деградации и останемся на неподходящих весах
  const session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: [backend],
    graphOptimizationLevel: 'all',
  });
  return { session, backend };
}

export const INPUT_SIZE = 1024;

// один форвард-пасс; имена входа и выхода не хардкодим — защита от
// расхождений между экспортами (часть сборок отдаёт шесть side-outputs)
export async function runIsnet(
  isnet: IsnetSession,
  input: Float32Array,
): Promise<Float32Array> {
  const inputName = isnet.session.inputNames[0];
  const outputName = isnet.session.outputNames[0];
  if (inputName === undefined || outputName === undefined) {
    throw new Error('У сессии нет входов или выходов');
  }
  const tensor = new ort.Tensor('float32', input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const outputs = await isnet.session.run({ [inputName]: tensor });
  const output = outputs[outputName];
  if (output === undefined) {
    throw new Error(`Выход ${outputName} отсутствует в результате`);
  }
  const data = output.data;
  if (!(data instanceof Float32Array)) {
    throw new Error('Выход модели не float32');
  }
  return data;
}

// прогрев: один прогон на нулевом тензоре; компилирует WGSL-программы
// и даёт раннюю проверку совместимости операторов (только для WebGPU)
export async function warmup(isnet: IsnetSession): Promise<number> {
  const start = performance.now();
  await runIsnet(isnet, new Float32Array(3 * INPUT_SIZE * INPUT_SIZE));
  return performance.now() - start;
}
