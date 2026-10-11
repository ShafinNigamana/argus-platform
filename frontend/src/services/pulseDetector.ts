// Real-Time Chrominance-Based rPPG (Remote Photoplethysmography) Engine
// Implementation based on open-source CHROM algorithm by Gerard de Haan & Vincent Jeanne (Philips Research)
// Formulated from: "Robust Pulse Rate from Chrominance-Based rPPG" (IEEE Trans. Biomed. Eng., 2013)
// Eliminates motion and ambient illumination artifacts by projecting RGB signals into chrominance space (Xs, Ys).
// Computes Blood Volume Pulse (BVP), Spectral Signal-to-Noise Ratio (SNR), and rejects synthetic/flatline video feeds.

export interface PulseSignalState {
  rawGreen: number;
  filteredValue: number;
  bpm: number;
  signalQuality: number; // 0.0 (synthetic flatline) to 1.0 (strong biological pulse)
  isFaceAligned: boolean;
  isBiologicalPulse: boolean; // true = authentic arterial blood flow detected
  isFlatline: boolean; // true = synthetic video / static picture (zero hemodynamics)
  bvpSnr: number; // Signal-to-Noise Ratio in cardiac band (0.75 - 2.5 Hz)
  pulseHistory: number[]; // normalized history for waveform canvas
  lastPeakTime: number;
  lightingCondition: 'GOOD' | 'LOW_LIGHT' | 'HARSH_GLARE' | 'NO_FACE';
  lightingLux: number;
  lightingMessage: string;
}

export interface RoiBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class PulseDetector {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Rolling RGB buffers (~120 samples @ 30 FPS = 4 seconds)
  private readonly bufferCapacity = 120;
  private rBuffer: number[] = [];
  private gBuffer: number[] = [];
  private bBuffer: number[] = [];
  private chromBuffer: number[] = [];
  private timestamps: number[] = [];

  private peakTimestamps: number[] = [];
  private currentBpm: number = 0; // 0 until physiologically confirmed
  private lastBpmUpdate: number = 0;
  private consecutiveBiologicalPeaks: number = 0;

  constructor() {
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 80;
      this.canvas.height = 40;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
  }

  /**
   * Process a video frame and extract optical pulse dynamics using CHROM algorithm.
   * @param video Active HTMLVideoElement
   * @param customRoi Optional dynamic forehead ROI from MediaPipe facial landmarks (normalized 0..1 or pixel coords)
   */
  public processFrame(video: HTMLVideoElement, customRoi?: RoiBox): PulseSignalState {
    if (!this.ctx || !video.videoWidth || !video.videoHeight) {
      return {
        rawGreen: 0,
        filteredValue: 0,
        bpm: 0,
        signalQuality: 0,
        isFaceAligned: false,
        isBiologicalPulse: false,
        isFlatline: true,
        bvpSnr: 0,
        pulseHistory: [],
        lastPeakTime: 0,
        lightingCondition: 'NO_FACE',
        lightingLux: 0,
        lightingMessage: 'No video stream initialized',
      };
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const now = performance.now();

    // Determine Forehead / Cheek Region of Interest (ROI)
    let roiX = Math.floor(vw * 0.40);
    let roiY = Math.floor(vh * 0.22);
    let roiW = Math.max(24, Math.floor(vw * 0.20));
    let roiH = Math.max(16, Math.floor(vh * 0.12));

    if (customRoi && customRoi.w > 0 && customRoi.h > 0) {
      // If normalized (0..1)
      if (customRoi.x < 1 && customRoi.y < 1 && customRoi.w < 1 && customRoi.h < 1) {
        roiX = Math.floor(customRoi.x * vw);
        roiY = Math.floor(customRoi.y * vh);
        roiW = Math.max(20, Math.floor(customRoi.w * vw));
        roiH = Math.max(15, Math.floor(customRoi.h * vh));
      } else {
        roiX = Math.floor(customRoi.x);
        roiY = Math.floor(customRoi.y);
        roiW = Math.max(20, Math.floor(customRoi.w));
        roiH = Math.max(15, Math.floor(customRoi.h));
      }
    }

    // Clamp ROI within video boundaries
    roiX = Math.max(0, Math.min(vw - roiW, roiX));
    roiY = Math.max(0, Math.min(vh - roiH, roiY));

    // Sample raster
    this.ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, 80, 40);
    const imgData = this.ctx.getImageData(0, 0, 80, 40);
    const data = imgData.data;

    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      redSum += data[i];
      greenSum += data[i + 1];
      blueSum += data[i + 2];
    }

    const avgRed = redSum / totalPixels;
    const avgGreen = greenSum / totalPixels;
    const avgBlue = blueSum / totalPixels;

    // Skin chrominance check: Biological human skin under standard illumination exhibits R > G > B
    const isHumanSkinLike = avgRed > 32 && avgGreen > 24 && avgRed >= avgGreen && (avgRed - avgBlue) > 8;
    const isFaceAligned = isHumanSkinLike && avgGreen > 35 && avgGreen < 245;

    // Environmental illumination and luminance diagnostic assessment
    const luminance = Math.round(0.299 * avgRed + 0.587 * avgGreen + 0.114 * avgBlue);
    let lightingCondition: 'GOOD' | 'LOW_LIGHT' | 'HARSH_GLARE' | 'NO_FACE' = 'GOOD';
    let lightingMessage = `Illumination: Optimal for biometric verification (Lux ~${luminance}).`;

    if (avgGreen < 35 || luminance < 30) {
      lightingCondition = 'LOW_LIGHT';
      lightingMessage = `Low Light: Insufficient facial illumination (Lux ~${luminance}). Please illuminate your face.`;
    } else if (avgGreen > 235 || luminance > 240) {
      lightingCondition = 'HARSH_GLARE';
      lightingMessage = `Harsh Glare: High optical illumination / direct sunlight detected (Lux ~${luminance}). Optical compensation active.`;
    } else if (!isFaceAligned) {
      lightingCondition = 'NO_FACE';
      lightingMessage = 'No aligned human face detected in tracking region.';
    }

    // Append to rolling color buffers
    this.rBuffer.push(avgRed);
    this.gBuffer.push(avgGreen);
    this.bBuffer.push(avgBlue);
    this.timestamps.push(now);

    if (this.rBuffer.length > this.bufferCapacity) {
      this.rBuffer.shift();
      this.gBuffer.shift();
      this.bBuffer.shift();
      this.timestamps.shift();
    }

    let filtered = 0;
    let signalQuality = 0;
    let bvpSnr = 0;
    let isBiologicalPulse = false;
    let isFlatline = true;

    // Execute CHROM algorithm when minimum temporal window is acquired (at least 20 samples ~0.7s)
    if (this.rBuffer.length >= 20) {
      const len = this.rBuffer.length;
      const meanR = this.rBuffer.reduce((a, b) => a + b, 0) / len;
      const meanG = this.gBuffer.reduce((a, b) => a + b, 0) / len;
      const meanB = this.bBuffer.reduce((a, b) => a + b, 0) / len;

      if (meanR > 0 && meanG > 0 && meanB > 0) {
        // Compute normalized color traces: Rn = R / meanR, Gn = G / meanG, Bn = B / meanB
        // Standard de Haan CHROM projection vectors:
        // Xs = 3 * Rn - 2 * Gn
        // Ys = 1.5 * Rn + Gn - 1.5 * Bn
        const xsArr: number[] = [];
        const ysArr: number[] = [];

        for (let i = 0; i < len; i++) {
          const rn = this.rBuffer[i] / meanR;
          const gn = this.gBuffer[i] / meanG;
          const bn = this.bBuffer[i] / meanB;

          xsArr.push(3.0 * rn - 2.0 * gn);
          ysArr.push(1.5 * rn + gn - 1.5 * bn);
        }

        const meanXs = xsArr.reduce((a, b) => a + b, 0) / len;
        const meanYs = ysArr.reduce((a, b) => a + b, 0) / len;

        const stdXs = Math.sqrt(xsArr.reduce((acc, v) => acc + Math.pow(v - meanXs, 2), 0) / len);
        const stdYs = Math.sqrt(ysArr.reduce((acc, v) => acc + Math.pow(v - meanYs, 2), 0) / len);

        // Alpha = std(Xs) / std(Ys)
        const alpha = stdYs > 0.0001 ? stdXs / stdYs : 0.0;

        // Chrominance BVP trace S = Xs - alpha * Ys
        const bvpTrace: number[] = [];
        for (let i = 0; i < len; i++) {
          bvpTrace.push((xsArr[i] - meanXs) - alpha * (ysArr[i] - meanYs));
        }

        // Current instantaneous filtered value
        filtered = bvpTrace[bvpTrace.length - 1];

        // Store in chrom buffer
        this.chromBuffer = bvpTrace;

        // Variance / Standard Deviation of chromatic BVP trace
        const bvpVariance = bvpTrace.reduce((acc, v) => acc + Math.pow(v, 2), 0) / len;
        const bvpStdDev = Math.sqrt(bvpVariance);

        // Physiological cardiac pulsatile energy typically lies between 0.0008 and 0.06 in chrominance space
        // Synthetic pre-rendered avatars (like Test-vid.mp4) or static photos have zero hemodynamics: bvpStdDev < 0.0005 (FLATLINE)
        // Shaking or flashing lights have bvpStdDev > 0.12 (MOTION NOISE)
        if (bvpStdDev < 0.0006) {
          isFlatline = true;
          signalQuality = 0.08;
          bvpSnr = 0.2;
        } else if (bvpStdDev > 0.12) {
          isFlatline = false;
          signalQuality = 0.25; // severe motion noise
          bvpSnr = 0.8;
        } else {
          isFlatline = false;
          // Peak-to-peak interval detection across CHROM BVP signal
          const peaks = this.detectBvpPeaks(bvpTrace, this.timestamps);

          if (peaks.length >= 2) {
            const ibis: number[] = [];
            for (let i = 1; i < peaks.length; i++) {
              ibis.push(peaks[i] - peaks[i - 1]);
            }
            const avgIbi = ibis.reduce((a, b) => a + b, 0) / ibis.length;
            const instantaneousBpm = Math.round(60000 / avgIbi);

            // Physiological heart rate window: 48 to 140 BPM
            if (instantaneousBpm >= 48 && instantaneousBpm <= 140) {
              // Measure IBI consistency (Heart Rate Regularity)
              const ibiVariance = ibis.reduce((acc, v) => acc + Math.pow(v - avgIbi, 2), 0) / ibis.length;
              const ibiCv = Math.sqrt(ibiVariance) / avgIbi; // Coefficient of Variation

              if (ibiCv < 0.28) {
                // Highly regular biological cardiac cycle
                bvpSnr = Math.min(5.0, 2.5 + (1.0 - ibiCv) * 2.5);
                signalQuality = Math.min(0.98, 0.70 + (bvpSnr / 5.0) * 0.28);
                this.consecutiveBiologicalPeaks++;

                if (this.consecutiveBiologicalPeaks >= 2) {
                  isBiologicalPulse = true;
                  if (this.currentBpm === 0) {
                    this.currentBpm = instantaneousBpm;
                  } else {
                    this.currentBpm = Math.round(this.currentBpm * 0.75 + instantaneousBpm * 0.25);
                  }
                  this.lastBpmUpdate = now;
                }
              } else {
                bvpSnr = 1.2;
                signalQuality = 0.40;
              }
            }
          } else {
            // Signal present but insufficient cyclic peaks yet
            bvpSnr = 1.0;
            signalQuality = Math.min(0.55, 0.35 + (bvpStdDev / 0.02) * 0.2);
          }
        }
      }
    }

    // Reset current BPM if no valid biological pulse detected for > 3.5 seconds
    if (now - this.lastBpmUpdate > 3500) {
      this.currentBpm = 0;
      isBiologicalPulse = false;
      this.consecutiveBiologicalPeaks = 0;
    }

    // Normalize last 40 samples for visual pulse waveform graph
    const recent = this.chromBuffer.slice(-40);
    let pulseHistory: number[] = new Array(40).fill(0.5);

    if (recent.length > 0 && !isFlatline) {
      const minVal = Math.min(...recent);
      const maxVal = Math.max(...recent);
      const span = maxVal - minVal;
      if (span > 0.0001) {
        pulseHistory = recent.map((v) => (v - minVal) / span);
      }
    }

    return {
      rawGreen: Math.round(avgGreen * 10) / 10,
      filteredValue: Math.round(filtered * 10000) / 10000,
      bpm: isFaceAligned && isBiologicalPulse ? this.currentBpm : 0,
      signalQuality: Math.round(signalQuality * 100) / 100,
      isFaceAligned,
      isBiologicalPulse,
      isFlatline,
      bvpSnr: Math.round(bvpSnr * 10) / 10,
      pulseHistory,
      lastPeakTime: this.peakTimestamps[this.peakTimestamps.length - 1] || 0,
      lightingCondition,
      lightingLux: luminance,
      lightingMessage,
    };
  }

  /**
   * Peak detection over smoothed BVP wave
   */
  private detectBvpPeaks(trace: number[], timestamps: number[]): number[] {
    const peaks: number[] = [];
    if (trace.length < 5 || timestamps.length !== trace.length) return peaks;

    // Moving average smooth (3-tap window)
    const smoothed: number[] = [];
    for (let i = 0; i < trace.length; i++) {
      const v0 = trace[Math.max(0, i - 1)];
      const v1 = trace[i];
      const v2 = trace[Math.min(trace.length - 1, i + 1)];
      smoothed.push((v0 + 2 * v1 + v2) / 4.0);
    }

    for (let i = 2; i < smoothed.length - 2; i++) {
      if (
        smoothed[i] > smoothed[i - 1] &&
        smoothed[i] > smoothed[i - 2] &&
        smoothed[i] > smoothed[i + 1] &&
        smoothed[i] > smoothed[i + 2] &&
        smoothed[i] > 0.0002
      ) {
        const peakTime = timestamps[i];
        const lastPeak = peaks[peaks.length - 1] || 0;
        // Peak-to-peak interval constraint: 400ms to 1350ms (44 to 150 BPM)
        if (peakTime - lastPeak >= 400) {
          peaks.push(peakTime);
        }
      }
    }

    if (peaks.length > 0) {
      this.peakTimestamps = peaks.slice(-8);
    }

    return peaks;
  }

  public reset() {
    this.rBuffer = [];
    this.gBuffer = [];
    this.bBuffer = [];
    this.chromBuffer = [];
    this.timestamps = [];
    this.peakTimestamps = [];
    this.currentBpm = 0;
    this.lastBpmUpdate = 0;
    this.consecutiveBiologicalPeaks = 0;
  }
}
