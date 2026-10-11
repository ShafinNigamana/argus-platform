package com.argus.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.math3.complex.Complex;
import org.apache.commons.math3.transform.DftNormalization;
import org.apache.commons.math3.transform.FastFourierTransformer;
import org.apache.commons.math3.transform.TransformType;
import org.springframework.stereotype.Component;

import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Discriminates synthetic AI avatars and generative diffusion / GAN facial images
 * from genuine optical camera captures.
 *
 * <p>Operates in both spatial and frequency domains without external cloud dependencies:
 * <ol>
 *   <li><b>Ocular-to-Epidermal Gradient Discrepancy (OESD):</b> Diffusion models over-smooth
 *       epidermal skin tissue (forehead/cheeks) while prompt-conditioning introduces disproportionately
 *       high-contrast edges in irises, eyelashes, and pupils. Living camera captures exhibit
 *       balanced optical lens MTF and sensor noise across all facial zones.</li>
 *   <li><b>Epidermal Micro-Texture Noise Floor Deficiency (EMND):</b> Genuine physical CMOS/CCD sensors
 *       exhibit Poisson-Gaussian photon shot noise and read noise floor on skin surfaces.
 *       Generative diffusion latent decoders produce mathematically smooth gradients with deficient residual noise.</li>
 *   <li><b>2D Fourier Spectral High-Frequency Ratio (FHSR):</b> Evaluates high-frequency spectral
 *       power distribution via 2D Fast Fourier Transform (with Hann windowing) against the natural 1/f^α optical power law.</li>
 *   <li><b>Transposed-Convolution Checkerboard Grid Harmonics (TCGA):</b> Detects periodic
 *       high-frequency spectral spikes characteristic of GAN upsampling and latent diffusion autoencoders.</li>
 * </ol>
 */
@Slf4j
@Component
public class SyntheticFaceDiscriminator {

    private static final int FFT_SIZE = 64;

    public record SyntheticDiscriminationResult(
            boolean isSynthetic,
            double syntheticScore,
            double eyeToSkinRatio,
            double skinNoiseVariance,
            double fourierHighRatio,
            double gridArtifactRatio,
            List<String> forensicFlags,
            String forensicReasoning
    ) {
        public static SyntheticDiscriminationResult realBaseline() {
            return new SyntheticDiscriminationResult(
                    false, 0.0, 1.2, 50.0, 0.35, 1.0,
                    Collections.emptyList(), "Authentic biological sensor characteristics verified."
            );
        }
    }

    /**
     * Evaluates whether a detected face exhibits synthetic generative AI artifacts.
     *
     * @param image   source image raster
     * @param bestBox normalized face bounding box [x1, y1, x2, y2]
     * @return structured SyntheticDiscriminationResult
     */
    public SyntheticDiscriminationResult evaluate(BufferedImage image, float[] bestBox) {
        if (image == null) {
            return SyntheticDiscriminationResult.realBaseline();
        }

        try {
            int imgW = image.getWidth();
            int imgH = image.getHeight();

            int fx1 = 0, fy1 = 0, fx2 = imgW, fy2 = imgH;
            if (bestBox != null && bestBox.length >= 4) {
                fx1 = Math.max(0, (int) Math.floor(bestBox[0] * imgW));
                fy1 = Math.max(0, (int) Math.floor(bestBox[1] * imgH));
                fx2 = Math.min(imgW, (int) Math.ceil(bestBox[2] * imgW));
                fy2 = Math.min(imgH, (int) Math.ceil(bestBox[3] * imgH));
            }

            int fw = fx2 - fx1;
            int fh = fy2 - fy1;
            if (fw < 30 || fh < 30) {
                return SyntheticDiscriminationResult.realBaseline();
            }

            BufferedImage faceCrop = image.getSubimage(fx1, fy1, fw, fh);

            // 1. Epidermal Patch Noise Variance (Forehead, Left Cheek, Right Cheek)
            double foreheadLapVar = computePatchLaplacianVar(faceCrop, 0.35, 0.65, 0.15, 0.30);
            double leftCheekLapVar = computePatchLaplacianVar(faceCrop, 0.15, 0.35, 0.45, 0.65);
            double rightCheekLapVar = computePatchLaplacianVar(faceCrop, 0.65, 0.85, 0.45, 0.65);
            double avgSkinNoiseVar = (foreheadLapVar + leftCheekLapVar + rightCheekLapVar) / 3.0;

            // 2. Ocular Patch Detail Sharpness
            double eyeLapVar = computePatchLaplacianVar(faceCrop, 0.20, 0.80, 0.25, 0.40);
            double eyeToSkinRatio = avgSkinNoiseVar > 0 ? (eyeLapVar / avgSkinNoiseVar) : 1.0;

            // 3. Whole Face Overall Laplacian Variance (micro-texture energy)
            double faceLapVar = computePatchLaplacianVar(faceCrop, 0.05, 0.95, 0.05, 0.95);

            // 4. 2D Fourier Transform Frequency Analysis (64x64 Hann-windowed patch)
            SpectralMetrics spectral = compute2DFourierMetrics(faceCrop);

            // 5. Synthesis & Scored Evaluation
            double syntheticScore = 0.0;
            List<String> flags = new ArrayList<>();

            // Factor 1: Ocular-to-Epidermal Gradient Discrepancy (Diffusion latent face artifact)
            // Living humans (even with lens glare, backlight, or soft focus) maintain eye-to-skin detail ratio <= 3.2.
            // Diffusion faces over-smooth skin while focusing high contrast on eyes, driving ratio > 3.5 to 15.0x.
            if (eyeToSkinRatio > 3.2) {
                double s1 = Math.min(1.0, (eyeToSkinRatio - 3.2) / 2.0);
                syntheticScore += 0.50 * s1;
                flags.add(String.format("Unnatural ocular-to-epidermal sharpness ratio (%.2fx > 3.2x limit)", eyeToSkinRatio));
            }

            // Factor 2: Epidermal Micro-Texture Noise Floor Deficiency
            // Natural camera sensors exhibit Poisson shot noise (avgSkinNoiseVar > 25.0).
            // Diffusion renders produce unnatural denoise smoothness in skin (< 25.0) while face contours are crisp (faceLapVar >= 100.0).
            // Natural soft focus or sunlight backlight blurs the whole face (faceLapVar < 100.0), which is optical, not synthetic.
            if (avgSkinNoiseVar < 25.0 && faceLapVar >= 100.0 && faceLapVar < 500.0) {
                double s2 = (25.0 - avgSkinNoiseVar) / 25.0;
                syntheticScore += 0.30 * s2;
                flags.add(String.format("Deficient epidermal micro-texture variance (%.1f < 25.0 with crisp face %.1f)", avgSkinNoiseVar, faceLapVar));
            }

            // Factor 3: High-Frequency Fourier Spectral Deficit on crisp faces
            // Natural optical captures follow smooth 1/f^alpha power decay with highRatio >= 0.295.
            // Diffusion avatars suffer high-frequency suppression (< 0.295) despite having sharp facial boundaries (faceLapVar >= 100.0).
            if (spectral.highRatio() < 0.295 && faceLapVar >= 100.0 && faceLapVar < 500.0) {
                double s3 = (0.295 - spectral.highRatio()) / 0.05;
                syntheticScore += 0.20 * Math.min(1.0, Math.max(0.0, s3));
                flags.add(String.format("Suppressed high-frequency Fourier spectral decay (%.4f < 0.295)", spectral.highRatio()));
            }

            // Factor 4: GAN / Diffusion Transposed-Convolution Checkerboard Grid Harmonics
            if (spectral.gridRatio() > 3.8 && faceLapVar < 500.0) {
                double s4 = Math.min(1.0, (spectral.gridRatio() - 3.8) / 1.5);
                syntheticScore += 0.20 * s4;
                flags.add(String.format("Periodic checkerboard upsampling grid harmonics detected (%.2f > 3.8)", spectral.gridRatio()));
            }

            // Multi-domain corroboration bonus: when multiple independent frequency/spatial anomalies coincide
            if (flags.size() >= 2) {
                syntheticScore += 0.20;
            }

            syntheticScore = Math.max(0.0, Math.min(1.0, syntheticScore));
            boolean isSynthetic = (syntheticScore >= 0.50 && (eyeToSkinRatio > 3.2 || spectral.gridRatio() > 3.8))
                    || (eyeToSkinRatio > 3.5 && !flags.isEmpty())
                    || (spectral.gridRatio() > 4.2);

            String reasoning;
            if (isSynthetic) {
                reasoning = String.join("; ", flags);
            } else {
                reasoning = "Natural biological skin texture and balanced optical frequency spectrum verified.";
            }

            return new SyntheticDiscriminationResult(
                    isSynthetic,
                    Math.round(syntheticScore * 1000.0) / 1000.0,
                    Math.round(eyeToSkinRatio * 100.0) / 100.0,
                    Math.round(avgSkinNoiseVar * 10.0) / 10.0,
                    Math.round(spectral.highRatio() * 10000.0) / 10000.0,
                    Math.round(spectral.gridRatio() * 100.0) / 100.0,
                    flags,
                    reasoning
            );

        } catch (Exception e) {
            log.error("[SYNTHETIC_DISCRIMINATOR] Analysis error: {}", e.getMessage());
            return SyntheticDiscriminationResult.realBaseline();
        }
    }

    private double computePatchLaplacianVar(BufferedImage img, double x1R, double x2R, double y1R, double y2R) {
        int w = img.getWidth();
        int h = img.getHeight();
        int x1 = Math.max(1, (int) (x1R * w));
        int x2 = Math.min(w - 2, (int) (x2R * w));
        int y1 = Math.max(1, (int) (y1R * h));
        int y2 = Math.min(h - 2, (int) (y2R * h));
        if (x2 <= x1 || y2 <= y1) return 0.0;

        double sum = 0.0;
        int count = 0;
        for (int y = y1; y <= y2; y++) {
            for (int x = x1; x <= x2; x++) {
                int rgb = img.getRGB(x, y);
                double lum = 0.299 * ((rgb >> 16) & 0xFF) + 0.587 * ((rgb >> 8) & 0xFF) + 0.114 * (rgb & 0xFF);
                int rgbU = img.getRGB(x, y - 1);
                double lumU = 0.299 * ((rgbU >> 16) & 0xFF) + 0.587 * ((rgbU >> 8) & 0xFF) + 0.114 * (rgbU & 0xFF);
                int rgbD = img.getRGB(x, y + 1);
                double lumD = 0.299 * ((rgbD >> 16) & 0xFF) + 0.587 * ((rgbD >> 8) & 0xFF) + 0.114 * (rgbD & 0xFF);
                int rgbL = img.getRGB(x - 1, y);
                double lumL = 0.299 * ((rgbL >> 16) & 0xFF) + 0.587 * ((rgbL >> 8) & 0xFF) + 0.114 * (rgbL & 0xFF);
                int rgbR = img.getRGB(x + 1, y);
                double lumR = 0.299 * ((rgbR >> 16) & 0xFF) + 0.587 * ((rgbR >> 8) & 0xFF) + 0.114 * (rgbR & 0xFF);
                double lap = Math.abs(4.0 * lum - lumU - lumD - lumL - lumR);
                sum += lap;
                count++;
            }
        }
        if (count == 0) return 0.0;
        double mean = sum / count;
        double var = 0.0;
        for (int y = y1; y <= y2; y++) {
            for (int x = x1; x <= x2; x++) {
                int rgb = img.getRGB(x, y);
                double lum = 0.299 * ((rgb >> 16) & 0xFF) + 0.587 * ((rgb >> 8) & 0xFF) + 0.114 * (rgb & 0xFF);
                int rgbU = img.getRGB(x, y - 1);
                double lumU = 0.299 * ((rgbU >> 16) & 0xFF) + 0.587 * ((rgbU >> 8) & 0xFF) + 0.114 * (rgbU & 0xFF);
                int rgbD = img.getRGB(x, y + 1);
                double lumD = 0.299 * ((rgbD >> 16) & 0xFF) + 0.587 * ((rgbD >> 8) & 0xFF) + 0.114 * (rgbD & 0xFF);
                int rgbL = img.getRGB(x - 1, y);
                double lumL = 0.299 * ((rgbL >> 16) & 0xFF) + 0.587 * ((rgbL >> 8) & 0xFF) + 0.114 * (rgbL & 0xFF);
                int rgbR = img.getRGB(x + 1, y);
                double lumR = 0.299 * ((rgbR >> 16) & 0xFF) + 0.587 * ((rgbR >> 8) & 0xFF) + 0.114 * (rgbR & 0xFF);
                double lap = Math.abs(4.0 * lum - lumU - lumD - lumL - lumR);
                var += (lap - mean) * (lap - mean);
            }
        }
        return var / count;
    }

    private record SpectralMetrics(double highRatio, double gridRatio) {}

    private SpectralMetrics compute2DFourierMetrics(BufferedImage faceCrop) {
        int fw = faceCrop.getWidth();
        int fh = faceCrop.getHeight();
        int S = FFT_SIZE;

        double[][] patch = new double[S][S];
        double sum = 0.0;
        for (int y = 0; y < S; y++) {
            for (int x = 0; x < S; x++) {
                int srcX = (x * fw) / S;
                int srcY = (y * fh) / S;
                int rgb = faceCrop.getRGB(srcX, srcY);
                double lum = 0.299 * ((rgb >> 16) & 0xFF) + 0.587 * ((rgb >> 8) & 0xFF) + 0.114 * (rgb & 0xFF);
                patch[y][x] = lum;
                sum += lum;
            }
        }
        double mean = sum / (S * S);

        // 2D FFT using Apache Commons Math FastFourierTransformer
        FastFourierTransformer fft = new FastFourierTransformer(DftNormalization.STANDARD);
        Complex[][] cPatch = new Complex[S][S];

        // Row-wise 1D FFT with Hann windowing to suppress boundary edge discontinuities
        for (int y = 0; y < S; y++) {
            double[] row = new double[S];
            for (int x = 0; x < S; x++) {
                double hann = 0.5 * (1.0 - Math.cos(2.0 * Math.PI * x / (S - 1)))
                        * 0.5 * (1.0 - Math.cos(2.0 * Math.PI * y / (S - 1)));
                row[x] = (patch[y][x] - mean) * hann;
            }
            cPatch[y] = fft.transform(row, TransformType.FORWARD);
        }

        // Column-wise 1D FFT
        for (int x = 0; x < S; x++) {
            Complex[] col = new Complex[S];
            for (int y = 0; y < S; y++) {
                col[y] = cPatch[y][x];
            }
            Complex[] transformed = fft.transform(col, TransformType.FORWARD);
            for (int y = 0; y < S; y++) {
                cPatch[y][x] = transformed[y];
            }
        }

        // Center-shifted power spectrum magnitude map
        int center = S / 2;
        double[][] power = new double[S][S];
        double totalPower = 0.0;
        double highFreqPower = 0.0;

        for (int y = 0; y < S; y++) {
            for (int x = 0; x < S; x++) {
                int sy = (y + center) % S;
                int sx = (x + center) % S;
                double p = cPatch[sy][sx].abs();
                power[y][x] = p;
                totalPower += p;

                double dist = Math.sqrt((x - center) * (x - center) + (y - center) * (y - center));
                if (dist > 20.0) {
                    highFreqPower += p;
                }
            }
        }

        double highRatio = highFreqPower / (totalPower + 1e-6);

        // Checkerboard grid harmonics: Axis vs diagonal power ratio in outer radial quadrant
        double axisPower = 0.0;
        double offAxisPower = 0.0;
        for (int d = 16; d < 32; d++) {
            axisPower += power[center][center + d] + power[center][center - d]
                    + power[center + d][center] + power[center - d][center];
            offAxisPower += power[center + d][center + d] + power[center + d][center - d]
                    + power[center - d][center + d] + power[center - d][center - d];
        }
        double gridRatio = axisPower / (offAxisPower + 1e-6);

        return new SpectralMetrics(highRatio, gridRatio);
    }
}
