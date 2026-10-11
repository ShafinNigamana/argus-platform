package com.argus.backend.service;

import com.argus.backend.dto.AntiSpoofResponse;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;

import static org.junit.jupiter.api.Assertions.*;

class SyntheticFaceDiscriminatorTest {

    @Test
    void testEvaluateSyntheticFace() throws Exception {
        OnnxLivenessService onnx = new OnnxLivenessService(new DefaultResourceLoader());
        onnx.init();
        SyntheticFaceDiscriminator discriminator = new SyntheticFaceDiscriminator();

        File samplePng = new File("src/main/resources/static/samples/test-c.png");
        assertTrue(samplePng.exists(), "test-c.png sample must exist");

        BufferedImage img = ImageIO.read(samplePng);
        OnnxLivenessService.FaceDetectionResult detection = onnx.detectFace(img);
        System.out.println("DETECTION on test-c.png: faceDetected=" + detection.faceDetected() + ", box=" + java.util.Arrays.toString(detection.bestBox()));

        SyntheticFaceDiscriminator.SyntheticDiscriminationResult result = discriminator.evaluate(img, detection.bestBox());
        System.out.println("SYNTHETIC EVALUATION on test-c.png:");
        System.out.println("  isSynthetic: " + result.isSynthetic());
        System.out.println("  syntheticScore: " + result.syntheticScore());
        System.out.println("  eyeToSkinRatio: " + result.eyeToSkinRatio());
        System.out.println("  skinNoiseVariance: " + result.skinNoiseVariance());
        System.out.println("  fourierHighRatio: " + result.fourierHighRatio());
        System.out.println("  gridArtifactRatio: " + result.gridArtifactRatio());
        System.out.println("  forensicFlags: " + result.forensicFlags());
        System.out.println("  forensicReasoning: " + result.forensicReasoning());

        File realFile = new File("src/test/resources/image_T1.jpg");
        if (realFile.exists()) {
            BufferedImage realImg = ImageIO.read(realFile);
            OnnxLivenessService.FaceDetectionResult realDet = onnx.detectFace(realImg);
            SyntheticFaceDiscriminator.SyntheticDiscriminationResult realRes = discriminator.evaluate(realImg, realDet.bestBox());
            System.out.println("SYNTHETIC EVALUATION on image_T1.jpg (Real):");
            System.out.println("  isSynthetic: " + realRes.isSynthetic());
            System.out.println("  syntheticScore: " + realRes.syntheticScore());
            System.out.println("  eyeToSkinRatio: " + realRes.eyeToSkinRatio());
            System.out.println("  skinNoiseVariance: " + realRes.skinNoiseVariance());
            System.out.println("  fourierHighRatio: " + realRes.fourierHighRatio());
            System.out.println("  gridArtifactRatio: " + realRes.gridArtifactRatio());
        }

        File testVidFrame = new File("src/test/resources/test_vid_frame.jpg");
        if (testVidFrame.exists()) {
            BufferedImage vidImg = ImageIO.read(testVidFrame);
            OnnxLivenessService.FaceDetectionResult vidDet = onnx.detectFace(vidImg);
            System.out.println("DETECTION on test_vid_frame: detected=" + vidDet.faceDetected() + ", box=" + java.util.Arrays.toString(vidDet.bestBox()));
            SyntheticFaceDiscriminator.SyntheticDiscriminationResult vidRes = discriminator.evaluate(vidImg, vidDet.bestBox());
            System.out.println("SYNTHETIC EVALUATION on test_vid_frame.jpg (Test-vid.mp4 clean frame):");
            System.out.println("  isSynthetic: " + vidRes.isSynthetic());
            System.out.println("  syntheticScore: " + vidRes.syntheticScore());
            System.out.println("  eyeToSkinRatio: " + vidRes.eyeToSkinRatio());
            System.out.println("  skinNoiseVariance: " + vidRes.skinNoiseVariance());
            System.out.println("  fourierHighRatio: " + vidRes.fourierHighRatio());
            System.out.println("  gridArtifactRatio: " + vidRes.gridArtifactRatio());
            System.out.println("  forensicFlags: " + vidRes.forensicFlags());

            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            ImageIO.write(vidImg, "jpg", baos);
            AntiSpoofResponse eval = onnx.evaluateFaceImage(baos.toByteArray());
            System.out.println("MINIFASNET & FULL EVALUATION on test_vid_frame:");
            System.out.println("  classification: " + eval.getClassification());
            System.out.println("  isReal: " + eval.isReal());
            System.out.println("  livenessScore: " + eval.getLivenessScore());
            System.out.println("  reasoning: " + eval.getReasoning());
            System.out.println("  isSynthetic: " + eval.isSynthetic());

            assertTrue(vidRes.isSynthetic(), "Test-vid.mp4 frame MUST be classified as synthetic AI avatar!");
            assertEquals("SYNTHETIC_AVATAR", eval.getClassification(), "Evaluation classification MUST be SYNTHETIC_AVATAR!");
            assertFalse(eval.isReal(), "Synthetic avatar must NOT be evaluated as real!");
        }

        File sunFrame1 = new File("src/test/resources/sunlight_frame_1.jpg");
        if (sunFrame1.exists()) {
            BufferedImage sunImg = ImageIO.read(sunFrame1);
            OnnxLivenessService.FaceDetectionResult sunDet = onnx.detectFace(sunImg);
            System.out.println("==================================================");
            System.out.println("DETECTION on sunlight_frame_1: detected=" + sunDet.faceDetected() + ", box=" + java.util.Arrays.toString(sunDet.bestBox()));
            SyntheticFaceDiscriminator.SyntheticDiscriminationResult sunRes = discriminator.evaluate(sunImg, sunDet.bestBox());
            System.out.println("SYNTHETIC EVALUATION on sunlight_frame_1.jpg (Sunlight capture):");
            System.out.println("  isSynthetic: " + sunRes.isSynthetic());
            System.out.println("  syntheticScore: " + sunRes.syntheticScore());
            System.out.println("  eyeToSkinRatio: " + sunRes.eyeToSkinRatio());
            System.out.println("  skinNoiseVariance: " + sunRes.skinNoiseVariance());
            System.out.println("  fourierHighRatio: " + sunRes.fourierHighRatio());
            System.out.println("  gridArtifactRatio: " + sunRes.gridArtifactRatio());
            System.out.println("  forensicFlags: " + sunRes.forensicFlags());

            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            ImageIO.write(sunImg, "jpg", baos);
            AntiSpoofResponse eval = onnx.evaluateFaceImage(baos.toByteArray());
            System.out.println("MINIFASNET & FULL EVALUATION on sunlight_frame_1:");
            System.out.println("  classification: " + eval.getClassification());
            System.out.println("  isReal: " + eval.isReal());
            System.out.println("  livenessScore: " + eval.getLivenessScore());
            System.out.println("  spoofScore: " + eval.getSpoofScore());
            System.out.println("  headPoseAngle: " + eval.getHeadPoseAngle());
            System.out.println("  cheatingAlert: " + eval.isCheatingAlert());
            System.out.println("  reasoning: " + eval.getReasoning());
            System.out.println("  isSynthetic: " + eval.isSynthetic());
            System.out.println("==================================================");
        }

        File sunFrame2 = new File("src/test/resources/sunlight_frame_2.jpg");
        if (sunFrame2.exists()) {
            BufferedImage sunImg2 = ImageIO.read(sunFrame2);
            OnnxLivenessService.FaceDetectionResult sunDet2 = onnx.detectFace(sunImg2);
            System.out.println("==================================================");
            System.out.println("DETECTION on sunlight_frame_2: detected=" + sunDet2.faceDetected() + ", box=" + java.util.Arrays.toString(sunDet2.bestBox()));
            SyntheticFaceDiscriminator.SyntheticDiscriminationResult sunRes2 = discriminator.evaluate(sunImg2, sunDet2.bestBox());
            System.out.println("SYNTHETIC EVALUATION on sunlight_frame_2.jpg (Sunlight capture t=2s):");
            System.out.println("  isSynthetic: " + sunRes2.isSynthetic());
            System.out.println("  syntheticScore: " + sunRes2.syntheticScore());
            System.out.println("  eyeToSkinRatio: " + sunRes2.eyeToSkinRatio());
            System.out.println("  skinNoiseVariance: " + sunRes2.skinNoiseVariance());
            System.out.println("  fourierHighRatio: " + sunRes2.fourierHighRatio());
            System.out.println("  gridArtifactRatio: " + sunRes2.gridArtifactRatio());
            System.out.println("  forensicFlags: " + sunRes2.forensicFlags());

            java.io.ByteArrayOutputStream baos2 = new java.io.ByteArrayOutputStream();
            ImageIO.write(sunImg2, "jpg", baos2);
            AntiSpoofResponse eval2 = onnx.evaluateFaceImage(baos2.toByteArray());
            System.out.println("MINIFASNET & FULL EVALUATION on sunlight_frame_2:");
            System.out.println("  classification: " + eval2.getClassification());
            System.out.println("  isReal: " + eval2.isReal());
            System.out.println("  livenessScore: " + eval2.getLivenessScore());
            System.out.println("  spoofScore: " + eval2.getSpoofScore());
            System.out.println("  headPoseAngle: " + eval2.getHeadPoseAngle());
            System.out.println("  cheatingAlert: " + eval2.isCheatingAlert());
            System.out.println("  reasoning: " + eval2.getReasoning());
            System.out.println("  isSynthetic: " + eval2.isSynthetic());
            System.out.println("==================================================");
        }

        File darkFrame1 = new File("src/test/resources/dark_frame_1.jpg");
        if (darkFrame1.exists()) {
            BufferedImage darkImg1 = ImageIO.read(darkFrame1);
            OnnxLivenessService.FaceDetectionResult darkDet1 = onnx.detectFace(darkImg1);
            System.out.println("==================================================");
            System.out.println("DETECTION on dark_frame_1: detected=" + darkDet1.faceDetected() + ", box=" + java.util.Arrays.toString(darkDet1.bestBox()));
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            ImageIO.write(darkImg1, "jpg", baos);
            AntiSpoofResponse eval = onnx.evaluateFaceImage(baos.toByteArray());
            System.out.println("MINIFASNET & FULL EVALUATION on dark_frame_1:");
            System.out.println("  classification: " + eval.getClassification());
            System.out.println("  isReal: " + eval.isReal());
            System.out.println("  reasoning: " + eval.getReasoning());
            System.out.println("==================================================");
        }

        File darkFrame15 = new File("src/test/resources/dark_frame_15s.jpg");
        if (darkFrame15.exists()) {
            BufferedImage darkImg15 = ImageIO.read(darkFrame15);
            OnnxLivenessService.FaceDetectionResult darkDet15 = onnx.detectFace(darkImg15);
            System.out.println("==================================================");
            System.out.println("DETECTION on dark_frame_15s: detected=" + darkDet15.faceDetected() + ", box=" + java.util.Arrays.toString(darkDet15.bestBox()));
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            ImageIO.write(darkImg15, "jpg", baos);
            AntiSpoofResponse eval = onnx.evaluateFaceImage(baos.toByteArray());
            System.out.println("MINIFASNET & FULL EVALUATION on dark_frame_15s:");
            System.out.println("  classification: " + eval.getClassification());
            System.out.println("  isReal: " + eval.isReal());
            System.out.println("  reasoning: " + eval.getReasoning());
            System.out.println("==================================================");
        }
    }
}
