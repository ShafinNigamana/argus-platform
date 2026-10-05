package com.argus.backend.exception;

import com.argus.backend.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Global REST exception handler mapping application exceptions to standardized
 * JSON error payloads conforming to TDD §4.2.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private String getRequestId(HttpServletRequest request) {
        String reqId = request.getHeader("X-Request-ID");
        if (reqId == null || reqId.isBlank()) {
            reqId = UUID.randomUUID().toString();
        }
        return reqId;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        ErrorResponse response = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .errorCode("VALIDATION_FAILED")
                .message("Request validation failed")
                .requestId(getRequestId(request))
                .timestamp(System.currentTimeMillis())
                .details(fieldErrors)
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {

        ErrorResponse response = ErrorResponse.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .errorCode("ACCESS_DENIED")
                .message("Access denied: insufficient privileges for this resource")
                .requestId(getRequestId(request))
                .timestamp(System.currentTimeMillis())
                .build();

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            AuthenticationException ex, HttpServletRequest request) {

        ErrorResponse response = ErrorResponse.builder()
                .status(HttpStatus.UNAUTHORIZED.value())
                .errorCode("UNAUTHORIZED")
                .message(ex.getMessage() != null ? ex.getMessage() : "Authentication failed")
                .requestId(getRequestId(request))
                .timestamp(System.currentTimeMillis())
                .build();

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(VerificationException.class)
    public ResponseEntity<ErrorResponse> handleVerificationException(
            VerificationException ex, HttpServletRequest request) {

        ErrorResponse response = ErrorResponse.builder()
                .status(ex.getStatus().value())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .requestId(getRequestId(request))
                .timestamp(System.currentTimeMillis())
                .build();

        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(PolicyException.class)
    public ResponseEntity<ErrorResponse> handlePolicyException(
            PolicyException ex, HttpServletRequest request) {

        ErrorResponse response = ErrorResponse.builder()
                .status(ex.getStatus().value())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .requestId(getRequestId(request))
                .timestamp(System.currentTimeMillis())
                .build();

        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(CertificateException.class)
    public ResponseEntity<ErrorResponse> handleCertificateException(
            CertificateException ex, HttpServletRequest request) {

        ErrorResponse response = ErrorResponse.builder()
                .status(ex.getStatus().value())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .requestId(getRequestId(request))
                .timestamp(System.currentTimeMillis())
                .build();

        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitException(
            RateLimitExceededException ex, HttpServletRequest request) {

        ErrorResponse response = ErrorResponse.builder()
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .requestId(getRequestId(request))
                .timestamp(System.currentTimeMillis())
                .details(Map.of("retryAfterSeconds", ex.getRetryAfterSeconds()))
                .build();

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
                .body(response);
    }

    @ExceptionHandler(SessionException.class)
    public ResponseEntity<ErrorResponse> handleSessionException(
            SessionException ex, HttpServletRequest request) {

        HttpStatus status = "SESSION_NOT_FOUND".equals(ex.getMessage())
                ? HttpStatus.NOT_FOUND
                : HttpStatus.BAD_REQUEST;

        ErrorResponse response = ErrorResponse.builder()
                .status(status.value())
                .errorCode(ex.getMessage() != null ? ex.getMessage() : "SESSION_ERROR")
                .message(ex.getMessage())
                .requestId(getRequestId(request))
                .timestamp(System.currentTimeMillis())
                .build();

        return ResponseEntity.status(status).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {

        HttpStatus status = ex.getMessage() != null && ex.getMessage().contains("not found")
                ? HttpStatus.NOT_FOUND
                : HttpStatus.BAD_REQUEST;

        ErrorResponse response = ErrorResponse.builder()
                .status(status.value())
                .errorCode(status == HttpStatus.NOT_FOUND ? "RESOURCE_NOT_FOUND" : "BAD_REQUEST")
                .message(ex.getMessage())
                .requestId(getRequestId(request))
                .timestamp(System.currentTimeMillis())
                .build();

        return ResponseEntity.status(status).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, HttpServletRequest request) {

        String reqId = getRequestId(request);
        log.error("Unhandled exception for requestId={}: ", reqId, ex);

        ErrorResponse response = ErrorResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .errorCode("INTERNAL_SERVER_ERROR")
                .message("An unexpected internal error occurred")
                .requestId(reqId)
                .timestamp(System.currentTimeMillis())
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
