// Real-time rPPG (photoplethysmography) green-channel signal extractor
// Uses HTML5 Canvas to sample the forehead capillary bed from webcam frames.
// Implements green-channel luminance filtering, peak-to-peak interval detection,
// and real-time BPM estimation based on the Argus signal processing specification.

export interface PulseSignalState {
  rawGreen: number;
  filteredValue: number;
  bpm: number;
  signalQuality: number; // 0.0 to 1.0
  isFaceAligned: boolean;
  pulseHistory: number[]; // normalized history for waveform canvas
  lastPeakTime: number;
}

export class PulseDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private buffer: number[] = [];
  private timestamps: number[] = [];
  private readonly bufferSize = 120; // ~4 seconds at 30 fps
  private peakTimestamps: number[] = [];
  private currentBpm = 72;
  private lastBpmUpdate = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 160;
    this.canvas.height = 120;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Process a video frame and extract forehead skin green channel metrics
   */
  public processFrame(video: HTMLVideoElement): PulseSignalState {
    if (!this.ctx || !video.videoWidth || !video.videoHeight) {
      return {
        rawGreen: 0,
        filteredValue: 0,
        bpm: 0,
        signalQuality: 0,
        isFaceAligned: false,
        pulseHistory: [],
        lastPeakTime: 0,
      };
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const now = performance.now();

    // Forehead Region of Interest (ROI):
    // Center-top area of face oval: x: 38% to 62%, y: 22% to 36%
    const roiX = Math.floor(vw * 0.40);
    const roiY = Math.floor(vh * 0.24);
    const roiW = Math.max(20, Math.floor(vw * 0.20));
    const roiH = Math.max(15, Math.floor(vh * 0.12));

    this.ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, 80, 40);

    const imgData = this.ctx.getImageData(0, 0, 80, 40);
    const data = imgData.data;

    let greenSum = 0;
    let redSum = 0;
    let blueSum = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      redSum += data[i];
      greenSum += data[i + 1];
      blueSum += data[i + 2];
    }

    const avgGreen = greenSum / totalPixels;
    const avgRed = redSum / totalPixels;
    const avgBlue = blueSum / totalPixels;

    // Skin color check: Human skin generally has Red > Green > Blue in normal lighting
    const isHumanSkinLike = avgRed > 30 && avgGreen > 25 && avgRed >= avgGreen && (avgRed - avgBlue) > 10;
    const isFaceAligned = isHumanSkinLike && avgGreen > 40 && avgGreen < 240;

    // Append to rolling buffer
    this.buffer.push(avgGreen);
    this.timestamps.push(now);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
      this.timestamps.shift();
    }

    // Filter signal: sliding window baseline subtraction
    let filtered = 0;
    let signalQuality = 0;

    if (this.buffer.length >= 15) {
      const windowMean = this.buffer.reduce((acc, v) => acc + v, 0) / this.buffer.length;
      filtered = avgGreen - windowMean;

      // Variance/std dev gives an indication of signal stability
      const variance = this.buffer.reduce((acc, v) => acc + Math.pow(v - windowMean, 2), 0) / this.buffer.length;
      const stdDev = Math.sqrt(variance);

      // rPPG biological pulsatile variance is subtle (0.1 to 3.5 intensity levels)
      // Excessive variance indicates head shake or lighting flicker; too small indicates static picture
      if (stdDev >= 0.08 && stdDev <= 6.0) {
        signalQuality = Math.min(1.0, 0.4 + (stdDev / 4.0) * 0.6);
      } else if (stdDev > 6.0) {
        signalQuality = 0.2; // motion artifact
      } else {
        signalQuality = 0.3; // static signal
      }

      // Simple peak detection for real-time BPM estimation
      if (filtered > 0.4 && this.buffer.length >= 3) {
        const last3 = this.buffer.slice(-3);
        if (last3[1] > last3[0] && last3[1] > last3[2]) {
          const lastPeak = this.peakTimestamps[this.peakTimestamps.length - 1] || 0;
          if (now - lastPeak > 400 && now - lastPeak < 1400) { // 42 to 150 BPM physiological range
            this.peakTimestamps.push(now);
            if (this.peakTimestamps.length > 8) this.peakTimestamps.shift();

            // Calculate heart rate from inter-beat intervals (IBI)
            if (this.peakTimestamps.length >= 3 && now - this.lastBpmUpdate > 1000) {
              const ibis: number[] = [];
              for (let i = 1; i < this.peakTimestamps.length; i++) {
                ibis.push(this.peakTimestamps[i] - this.peakTimestamps[i - 1]);
              }
              const avgIbi = ibis.reduce((a, b) => a + b, 0) / ibis.length;
              const calculatedBpm = Math.round(60000 / avgIbi);
              if (calculatedBpm >= 55 && calculatedBpm <= 125) {
                // Smooth BPM update
                this.currentBpm = Math.round(this.currentBpm * 0.6 + calculatedBpm * 0.4);
                this.lastBpmUpdate = now;
              }
            }
          }
        }
      }
    }

    // Normalize last 40 samples for visual pulse waveform graph
    const recentSamples = this.buffer.slice(-40);
    const recentMin = Math.min(...recentSamples, 0);
    const recentMax = Math.max(...recentSamples, 1);
    const range = (recentMax - recentMin) || 1;
    const pulseHistory = recentSamples.map(v => (v - recentMin) / range);

    return {
      rawGreen: Math.round(avgGreen * 10) / 10,
      filteredValue: Math.round(filtered * 100) / 100,
      bpm: isFaceAligned ? this.currentBpm : 0,
      signalQuality: Math.round(signalQuality * 100) / 100,
      isFaceAligned,
      pulseHistory,
      lastPeakTime: this.peakTimestamps[this.peakTimestamps.length - 1] || 0,
    };
  }

  public reset() {
    this.buffer = [];
    this.timestamps = [];
    this.peakTimestamps = [];
    this.currentBpm = 72;
    this.lastBpmUpdate = 0;
  }
}
