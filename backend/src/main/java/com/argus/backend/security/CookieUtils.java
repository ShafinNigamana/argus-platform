package com.argus.backend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

/**
 * Utility for issuing and clearing hardened cookies conforming to OWASP specifications:
 * HttpOnly, SameSite=Strict, Secure (production / HTTPS), scoped paths.
 */
public final class CookieUtils {

    public static final String ACCESS_TOKEN_COOKIE = "argus_access_token";
    public static final String REFRESH_TOKEN_COOKIE = "argus_refresh_token";
    public static final String CSRF_COOKIE = "XSRF-TOKEN";

    private CookieUtils() {}

    public static void addAccessTokenCookie(HttpServletResponse response, String token, boolean isSecure) {
        ResponseCookie cookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(isSecure)
                .path("/")
                .maxAge(Duration.ofHours(1))
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public static void addRefreshTokenCookie(HttpServletResponse response, String token, boolean isSecure) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(isSecure)
                .path("/api/v1/auth")
                .maxAge(Duration.ofDays(7))
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public static void addCsrfCookie(HttpServletResponse response, String csrfToken, boolean isSecure) {
        ResponseCookie cookie = ResponseCookie.from(CSRF_COOKIE, csrfToken)
                .httpOnly(false) // Accessible to JavaScript for Double-Submit header inclusion
                .secure(isSecure)
                .path("/")
                .maxAge(Duration.ofDays(7))
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public static void clearAuthCookies(HttpServletResponse response, boolean isSecure) {
        ResponseCookie accessCookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(isSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(isSecure)
                .path("/api/v1/auth")
                .maxAge(0)
                .sameSite("Strict")
                .build();

        ResponseCookie csrfCookie = ResponseCookie.from(CSRF_COOKIE, "")
                .httpOnly(false)
                .secure(isSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, csrfCookie.toString());
    }

    public static String getCookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie c : request.getCookies()) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }
}
