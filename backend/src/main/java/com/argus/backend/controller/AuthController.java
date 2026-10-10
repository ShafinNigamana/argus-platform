package com.argus.backend.controller;

import com.argus.backend.dto.LoginRequest;
import com.argus.backend.dto.RegisterRequest;
import com.argus.backend.dto.TokenResponse;
import com.argus.backend.security.CookieUtils;
import com.argus.backend.service.AuthAbuseProtectionService;
import com.argus.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Authentication controller providing hardened session management.
 *
 * <p>Enforces:
 * <ul>
 *   <li>HttpOnly, SameSite=Strict cookies for JWT access and refresh tokens.</li>
 *   <li>Anti-CSRF Double-Submit token issuance.</li>
 *   <li>Multi-instance resilient abuse protection against credential stuffing and registration floods.</li>
 *   <li>Complete server-side cookie invalidation upon logout.</li>
 *   <li>Transient session introspection via GET /api/v1/auth/me.</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService               authService;
    private final AuthAbuseProtectionService abuseProtectionService;

    /**
     * Authenticates a user with username + password.
     * Issues HttpOnly cookies and returns token metadata.
     */
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String clientIp = resolveClientIp(httpRequest);
        abuseProtectionService.checkLoginAllowed(clientIp, request.getUsername());

        try {
            TokenResponse tokens = authService.login(request);
            abuseProtectionService.recordSuccessfulLogin(clientIp, request.getUsername());

            // Issue HttpOnly cookies for access & refresh tokens
            boolean isSecure = httpRequest.isSecure();
            CookieUtils.addAccessTokenCookie(httpResponse, tokens.getAccessToken(), isSecure);
            CookieUtils.addRefreshTokenCookie(httpResponse, tokens.getRefreshToken(), isSecure);

            // Issue anti-CSRF token
            String csrfToken = UUID.randomUUID().toString();
            CookieUtils.addCsrfCookie(httpResponse, csrfToken, isSecure);

            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            abuseProtectionService.recordFailedLogin(clientIp, request.getUsername());
            throw e;
        }
    }

    /**
     * Registers a new user with the default USER role.
     * Protected by persistent IP rate limiting.
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = resolveClientIp(httpRequest);
        abuseProtectionService.checkRegistrationAllowed(clientIp);

        authService.register(request);
        abuseProtectionService.recordRegistrationAttempt(clientIp);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "User registered successfully"));
    }

    /**
     * Issues a new access token using HttpOnly cookie or request body.
     */
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String refreshToken = CookieUtils.getCookieValue(httpRequest, CookieUtils.REFRESH_TOKEN_COOKIE);
        if (!StringUtils.hasText(refreshToken) && body != null) {
            refreshToken = body.get("refreshToken");
        }

        if (!StringUtils.hasText(refreshToken)) {
            return ResponseEntity.badRequest().build();
        }

        TokenResponse tokens = authService.refresh(refreshToken);
        boolean isSecure = httpRequest.isSecure();
        CookieUtils.addAccessTokenCookie(httpResponse, tokens.getAccessToken(), isSecure);
        if (StringUtils.hasText(tokens.getRefreshToken())) {
            CookieUtils.addRefreshTokenCookie(httpResponse, tokens.getRefreshToken(), isSecure);
        }

        return ResponseEntity.ok(tokens);
    }

    /**
     * Clears authentication cookies and invalidates the active browser session.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        CookieUtils.clearAuthCookies(httpResponse, httpRequest.isSecure());
        SecurityContextHolder.clearContext();

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    /**
     * Returns the currently authenticated user's identity without requiring browser storage.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getActiveUser(Authentication auth) {
        Map<String, Object> resp = new HashMap<>();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            String role = auth.getAuthorities().stream()
                    .map(ga -> ga.getAuthority())
                    .findFirst()
                    .map(a -> a.replace("ROLE_", ""))
                    .orElse("USER");

            resp.put("authenticated", true);
            resp.put("username", auth.getName());
            resp.put("role", role);
            return ResponseEntity.ok(resp);
        }

        resp.put("authenticated", false);
        return ResponseEntity.ok(resp);
    }

    /**
     * Issues or verifies the Double-Submit anti-CSRF token cookie.
     */
    @GetMapping("/csrf")
    public ResponseEntity<Map<String, String>> getCsrfToken(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String csrfToken = CookieUtils.getCookieValue(httpRequest, CookieUtils.CSRF_COOKIE);
        if (!StringUtils.hasText(csrfToken)) {
            csrfToken = UUID.randomUUID().toString();
            CookieUtils.addCsrfCookie(httpResponse, csrfToken, httpRequest.isSecure());
        }

        return ResponseEntity.ok(Map.of("csrfToken", csrfToken));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
