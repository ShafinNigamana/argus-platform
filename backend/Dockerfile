# ============================================================
# Stage 1: Build artifact using Maven and Temurin JDK 17
# ============================================================
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /workspace

# Cache dependencies
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN mvn dependency:go-offline -B

# Compile and package application
COPY src src
RUN mvn clean package -DskipTests -B

# ============================================================
# Stage 2: Minimal, secure runtime using Temurin JRE 17
# ============================================================
FROM eclipse-temurin:17-jre-jammy

# Install curl for container health check
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Run as dedicated non-root user for security compliance (PRD §6.3, TDD §5.3)
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash -m appuser

WORKDIR /app

# Copy packaged jar from build stage
COPY --from=build --chown=appuser:appgroup /workspace/target/*.jar app.jar

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-jar", "app.jar"]
