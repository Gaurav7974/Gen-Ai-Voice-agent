/**
 * AudioWorkletProcessor that captures microphone input and forwards PCM samples.
 *
 * Runs in the AudioWorklet global scope — no ES module imports allowed here.
 * Written in plain JavaScript to prevent browser syntax errors on type annotations
 * and to allow Vite to serve it natively as a static asset.
 */
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      // Clone to avoid mutating the internal buffer
      const data = new Float32Array(input[0]);
      // Transfer the buffer for zero-copy delivery to the main thread
      this.port.postMessage(data, [data.buffer]);
    }
    return true; // Keep the processor alive
  }
}

registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
