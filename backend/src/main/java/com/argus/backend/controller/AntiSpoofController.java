package com.argus.backend.controller;

import com.argus.backend.dto.AntiSpoofResponse;
import com.argus.backend.model.Session;
import com.argus.backend.service.OnnxLivenessService;
import com.argus.backend.service.SessionService;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * REST controller for open-source local Face Anti-Spoofing (PAD) verification.
 * Runs 100% locally via ONNX Runtime without external cloud API keys.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
public class AntiSpoofController {

    private final OnnxLivenessService onnxLivenessService;
    private final SessionService sessionService;

    public AntiSpoofController(OnnxLivenessService onnxLivenessService, SessionService sessionService) {
        this.onnxLivenessService = onnxLivenessService;
        this.sessionService = sessionService;
    }

    /**
     * Health & status check for the embedded ML model.
     */
    @GetMapping("/ml/status")
    public ResponseEntity<Map<String, Object>> getModelStatus() {
        boolean ready = onnxLivenessService.isModelReady();
        return ResponseEntity.ok(Map.of(
                "model", "MiniFASNetV2-SE",
                "backend", "ONNX Runtime (CPU)",
                "ready", ready,
                "zeroApiKeyRequired", true,
                "inputResolution", "80x80 BGR",
                "targetAttacks", "Screens, Printed Photos, Cutouts, Replay"
        ));
    }

    /**
     * Standalone face anti-spoofing verification via multipart image upload.
     */
    @PostMapping(value = "/verify-face", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AntiSpoofResponse> verifyFaceMultipart(@RequestParam("image") MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            AntiSpoofResponse response = onnxLivenessService.evaluateFaceImage(bytes);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to read uploaded face image: {}", e.getMessage());
            return ResponseEntity.badRequest().body(AntiSpoofResponse.builder()
                    .isReal(false)
                    .classification("UPLOAD_ERROR")
                    .reasoning("Could not read uploaded multipart file: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Standalone face anti-spoofing verification via JSON Base64 payload.
     */
    @PostMapping(value = "/verify-face", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AntiSpoofResponse> verifyFaceBase64(@RequestBody FaceVerificationRequest request) {
        if (request == null || request.getImage() == null || request.getImage().isBlank()) {
            return ResponseEntity.badRequest().body(AntiSpoofResponse.builder()
                    .isReal(false)
                    .classification("MISSING_PAYLOAD")
                    .reasoning("Image field in JSON is required.")
                    .build());
        }
        AntiSpoofResponse response = onnxLivenessService.evaluateBase64Image(request.getImage());
        return ResponseEntity.ok(response);
    }

    /**
     * Session-bound face anti-spoofing verification. Attaches the ML verdict to the session.
     */
    @PostMapping(value = "/session/{sessionId}/verify-face", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AntiSpoofResponse> verifySessionFace(
            @PathVariable String sessionId,
            @RequestBody FaceVerificationRequest request) {
        
        Session session = sessionService.getSession(sessionId);
        AntiSpoofResponse response = onnxLivenessService.evaluateBase64Image(request.getImage());
        
        session.setAntiSpoofScore(response.getLivenessScore());
        session.setAntiSpoofReal(response.isReal());
        session.setAntiSpoofReasoning(response.getReasoning());
        
        log.info("[SESSION {}] Anti-spoofing verified by MiniFASNet: isReal={}, score={}",
                sessionId, response.isReal(), response.getLivenessScore());

        return ResponseEntity.ok(response);
    }

    @Data
    public static class FaceVerificationRequest {
        private String image; // Base64 encoded JPEG or PNG
    }
}
