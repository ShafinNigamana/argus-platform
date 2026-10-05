package com.argus.backend.service;

import com.argus.backend.dto.LoginRequest;
import com.argus.backend.dto.RegisterRequest;
import com.argus.backend.dto.TokenResponse;
import com.argus.backend.entity.AppUser;
import com.argus.backend.repository.AppUserRepository;
import com.argus.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Authentication service: login, register, token refresh.
 *
 * <p>Passwords are BCrypt-hashed before storage. JWT tokens are issued by
 * {@link JwtTokenProvider}. TDD §5.1–5.2.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final long ACCESS_TOKEN_EXPIRY_SECONDS = 3600L; // 1 hour

    private final AppUserRepository   userRepository;
    private final PasswordEncoder     passwordEncoder;
    private final JwtTokenProvider    tokenProvider;
    private final AuthenticationManager authManager;

    /**
     * Authenticates a user and issues JWT access + refresh tokens.
     *
     * @param request login credentials
     * @return token pair
     * @throws org.springframework.security.core.AuthenticationException on bad credentials
     */
    public TokenResponse login(LoginRequest request) {
        // Spring Security validates credentials and throws on failure
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        String role = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .map(a -> a.replace("ROLE_", ""))
                .orElse("USER");

        String accessToken  = tokenProvider.generateAccessToken(auth.getName(), role);
        String refreshToken = tokenProvider.generateRefreshToken(auth.getName());

        log.info("User '{}' authenticated successfully with role {}", auth.getName(), role);

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(ACCESS_TOKEN_EXPIRY_SECONDS)
                .username(auth.getName())
                .role(role)
                .build();
    }

    /**
     * Registers a new user with the default USER role.
     * SUPERADMIN can later elevate roles via user management (future).
     *
     * @param request registration data
     * @throws IllegalArgumentException if username or email already exists
     */
    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }

        AppUser user = AppUser.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(AppUser.Role.USER)
                .build();

        userRepository.save(user);
        log.info("Registered new user '{}'", request.getUsername());
    }

    /**
     * Issues a new access token from a valid refresh token.
     *
     * @param refreshToken the refresh JWT
     * @return new token pair
     * @throws IllegalArgumentException if the refresh token is invalid or expired
     */
    public TokenResponse refresh(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("Invalid or expired refresh token");
        }

        String username = tokenProvider.getUsernameFromToken(refreshToken);
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String role         = user.getRole().name();
        String newAccess    = tokenProvider.generateAccessToken(username, role);
        String newRefresh   = tokenProvider.generateRefreshToken(username);

        return TokenResponse.builder()
                .accessToken(newAccess)
                .refreshToken(newRefresh)
                .expiresIn(ACCESS_TOKEN_EXPIRY_SECONDS)
                .username(username)
                .role(role)
                .build();
    }
}
