package com.argus.backend.controller;

import com.argus.backend.dto.LoginRequest;
import com.argus.backend.dto.RegisterRequest;
import com.argus.backend.dto.TokenResponse;
import com.argus.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authentication controller.
 *
 * <p>Endpoints are public (no JWT required).
 * <ul>
 *   <li>POST /api/v1/auth/login    — authenticate and receive tokens</li>
 *   <li>POST /api/v1/auth/register — create a new USER-role account</li>
 *   <li>POST /api/v1/auth/refresh  — exchange refresh token for new access token</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Authenticates a user with username + password.
     *
     * @param request login credentials
     * @return 200 with JWT token pair, or 401 on bad credentials
     */
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse tokens = authService.login(request);
        return ResponseEntity.ok(tokens);
    }

    /**
     * Registers a new user with the default USER role.
     *
     * @param request registration details (username, email, password)
     * @return 201 Created on success
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "User registered successfully"));
    }

    /**
     * Issues a new access token from a valid refresh token.
     *
     * @param body JSON body with field "refreshToken"
     * @return 200 with new token pair
     */
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        TokenResponse tokens = authService.refresh(refreshToken);
        return ResponseEntity.ok(tokens);
    }
}
