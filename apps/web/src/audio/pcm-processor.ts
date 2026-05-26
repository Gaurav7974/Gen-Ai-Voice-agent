/**
 * AudioWorkletProcessor that captures microphone input and forwards PCM samples.
 *
 * Replaces the deprecated ScriptProcessorNode. Runs in the AudioWorklet global
 * scope — no ES module imports allowed here.
 *
 * Sends raw Float32 sample chunks (128 samples per render quantum) to the main
 * thread via postMessage, where downsampling (→16kHz) and PCM16 conversion
 * happen before WebSocket send.
 */
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
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
