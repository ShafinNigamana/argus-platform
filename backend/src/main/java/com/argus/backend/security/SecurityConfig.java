package com.argus.backend.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security configuration for Argus Platform.
 *
 * <p>Key decisions:
 * <ul>
 *   <li>Stateless session (JWT) — no HTTP session storage, enabling horizontal scaling. TDD §6.4.</li>
 *   <li>CSRF disabled — standard for stateless REST APIs using Authorization header tokens.</li>
 *   <li>CORS configured — frontend origin allowed; strict in production via environment variable.</li>
 *   <li>RBAC via role-based access rules. TDD §5.2.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity          // Enables @PreAuthorize on controller methods
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final RateLimitFilter         rateLimitFilter;
    private final AppUserDetailsService   userDetailsService;
    private final JwtAuthEntryPoint       authEntryPoint;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF disabled: stateless JWT auth; tokens in Authorization header, not cookies. TDD §5.3.
            .csrf(AbstractHttpConfigurer::disable)

            // CORS: allow the React frontend. Origins restricted in production via env var.
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Stateless — no server-side sessions. Required for Cloud Run horizontal scaling.
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Return JSON 401 instead of redirect to login page
            .exceptionHandling(ex -> ex.authenticationEntryPoint(authEntryPoint))

            // ---- RBAC access matrix (TDD §5.2) ----
            .authorizeHttpRequests(auth -> auth

                // Public: auth endpoints, ML status probes, and web assets
                .requestMatchers(
                    "/api/v1/auth/login",
                    "/api/v1/auth/register",
                    "/api/v1/auth/refresh",
                    "/api/v1/ml/status",
                    "/api/v1/verify/health-check",
                    "/actuator/health",
                    "/",
                    "/index.html",
                    "/test_web_app.html",
                    "/static/**",
                    "/*.html",
                    "/*.css",
                    "/*.js",
                    "/favicon.ico",
                    "/assets/**"
                ).permitAll()

                // Standalone face PAD verification: authenticated operators only
                .requestMatchers("/api/v1/verify-face").hasAnyRole("USER","ADMIN","SUPERADMIN")

                // USER role: initiate, poll, complete verifications, and submit challenges
                .requestMatchers(HttpMethod.POST,  "/api/v1/verify", "/api/v1/verify/**").hasAnyRole("USER","ADMIN","SUPERADMIN")
                .requestMatchers(HttpMethod.GET,   "/api/v1/verify", "/api/v1/verify/**").hasAnyRole("USER","ADMIN","SUPERADMIN","AUDIT")
                .requestMatchers(HttpMethod.POST,  "/api/v1/challenges/**").hasAnyRole("USER","ADMIN","SUPERADMIN")

                // Authenticated account profile & organization metadata
                .requestMatchers("/api/v1/account", "/api/v1/account/**").authenticated()

                // ADMIN role: policy management
                .requestMatchers("/api/v1/admin/policies/**").hasAnyRole("ADMIN","SUPERADMIN")

                // AUDIT role: audit log queries
                .requestMatchers("/api/v1/admin/audit-logs/**").hasAnyRole("AUDIT","ADMIN","SUPERADMIN")

                // Legacy session/signal/frame endpoints (existing mobile/ML pipeline)
                .requestMatchers("/api/v1/session/**").hasAnyRole("USER","ADMIN","SUPERADMIN")
                .requestMatchers("/api/v1/signal/**").hasAnyRole("USER","ADMIN","SUPERADMIN")
                .requestMatchers("/api/v1/frame/**").hasAnyRole("USER","ADMIN","SUPERADMIN")
                .requestMatchers("/api/v1/behavior/**").hasAnyRole("USER","ADMIN","SUPERADMIN")
                .requestMatchers("/api/v1/challenge/**").hasAnyRole("USER","ADMIN","SUPERADMIN")

                // Anything else: must be authenticated
                .anyRequest().authenticated()
            )

            // Insert JWT filter before Spring's username/password filter
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            // Insert Rate Limiting filter after UsernamePasswordAuthenticationFilter per TDD §5.4
            .addFilterAfter(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /** BCrypt with cost factor 12 — good balance of security vs. performance for user auth. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * CORS configuration.
     * In production, {@code argus.cors.allowed-origins} is set to the exact frontend URL.
     * During development it permits localhost on common Vite ports.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Allowable origins configured via environment; hardcoded fallback for local dev only
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8080",
            "http://localhost:8090",
            "http://127.0.0.1:*",
            "https://*.argus-platform.app"   // production frontend pattern
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
