package com.argus.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

/**
 * Double-Submit Cookie CSRF protection filter for cookie-authenticated browser requests.
 *
 * <p>Validates that mutating requests (POST, PUT, PATCH, DELETE) authenticated via session
 * cookies include a matching X-XSRF-TOKEN or X-CSRF-TOKEN header. Requests using Bearer tokens
 * in the Authorization header are inherently immune to CSRF and proceed without check.
 */
@Slf4j
@Component
public class CsrfProtectionFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String method = request.getMethod();
        String path = request.getRequestURI();

        // 1. Ensure CSRF cookie exists on safe requests or GET
        String csrfCookie = CookieUtils.getCookieValue(request, CookieUtils.CSRF_COOKIE);
        if (!StringUtils.hasText(csrfCookie)) {
            String newCsrf = UUID.randomUUID().toString();
            CookieUtils.addCsrfCookie(response, newCsrf, request.isSecure());
            csrfCookie = newCsrf;
        }

        // 2. Safe methods do not require CSRF token validation
        if (SAFE_METHODS.contains(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Skip public auth endpoints & health probes
        if (isExemptPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 4. If request uses Authorization: Bearer <token>, CSRF cannot be triggered by browser
        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 5. If request uses Cookie-based authentication, enforce Double-Submit Cookie verification
        String accessTokenCookie = CookieUtils.getCookieValue(request, CookieUtils.ACCESS_TOKEN_COOKIE);
        if (StringUtils.hasText(accessTokenCookie)) {
            String headerCsrf = request.getHeader("X-XSRF-TOKEN");
            if (!StringUtils.hasText(headerCsrf)) {
                headerCsrf = request.getHeader("X-CSRF-TOKEN");
            }

            if (!StringUtils.hasText(headerCsrf) || !headerCsrf.equals(csrfCookie)) {
                log.warn("CSRF token validation failed for path {}. Header: {}, Cookie: {}", path, headerCsrf, csrfCookie);
                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Invalid or missing CSRF token\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isExemptPath(String path) {
        return path.equals("/api/v1/auth/login")
                || path.equals("/api/v1/auth/register")
                || path.equals("/api/v1/auth/refresh")
                || path.equals("/api/v1/auth/logout")
                || path.equals("/api/v1/verify/health-check")
                || path.startsWith("/actuator/");
    }
}
