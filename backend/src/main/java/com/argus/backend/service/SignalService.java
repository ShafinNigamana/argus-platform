package com.argus.backend.service;

import com.argus.backend.dto.SignalRequest;
import com.argus.backend.engine.SignalProcessingEngine;
import com.argus.backend.model.ProcessingResult;
import com.argus.backend.model.Session;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Handles batch array signal pipeline ingestion independently from Frame logic.
 */
@Slf4j
@Service
public class SignalService {

    private final SessionService sessionService;
    private final SignalProcessingEngine processingEngine;

    public SignalService(SessionService sessionService, SignalProcessingEngine processingEngine) {
        this.sessionService = sessionService;
        this.processingEngine = processingEngine;
    }

    /**
     * Executes bulk signal ingestion and conditions Engine activation safely.
     */
    public boolean handleSignal(String sessionId, SignalRequest request) {
        // 1. Get session
        // (This implicitly tracks liveness timeout internally and will throw exceptions if dead.)
        Session session = sessionService.getSession(sessionId);

        // 2. Validate request
        if (request.getSignal() == null || request.getSignal().isEmpty()) {
            return false;
        }

        // 3. Append signal batch dynamically
        for (Double value : request.getSignal()) {
            if (value != null) {
                session.getBuffer().add(value);
            }
        }

        // 4. Processing Trigger Validation
        long currentTime = System.currentTimeMillis();
        boolean sizeCondition = session.getBuffer().size() >= 300;
        boolean timeCondition = (currentTime - session.getLastProcessedAt()) > 2000;

        if (sizeCondition && timeCondition) {
            double samplingRate = request.getFps();
            if (samplingRate <= 0) {
                samplingRate = 30.0; // Fail-safe
            }

            // Unpack synchronized array payload explicitly
            List<Double> bufferValues = session.getBuffer().getValues();
            
            // Execute stateless FFT
            ProcessingResult result = processingEngine.process(bufferValues, samplingRate);
            
            // Store mapping logic to active session explicitly
            session.setResult(result);
            session.setLastProcessedAt(currentTime);

            log.info("Buffer size: {}", session.getBuffer().size());
            log.info("BPM: {}", result.getBpm());
        }

        // 5. Return success mapping inherently
        return true;
    }
}
