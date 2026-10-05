**Argus**

*A Human Verification and Digital Trust Platform*

**TECHNICAL DESIGN DOCUMENT (TDD)**

Project Type: Student Group Project (SGP)

Duration: 4 Months

Domain: Multidisciplinary

Focus Areas: Cybersecurity, Artificial Intelligence, Computer Vision,
Cloud Computing, Web Technologies

# Table of Contents

(Generated automatically in PDF)

# 1. System Architecture

## 1.1 Architecture Style

Argus employs a Modular Monolithic Architecture with Layered Design
Pattern. This approach provides:

- Clear separation of concerns across application layers

- Modular component design enabling independent testing and maintenance

- Monolithic deployment simplifying initial development and deployment

- Foundation for future microservices migration if needed

## 1.2 Architecture Paradigm

Event-Driven Verification Pipeline: The system processes verification
workflows as discrete events flowing through specialized processing
stages.

- Event: Verification initiated by user or application

- Processing stages: Physiological analysis → Behavioral analysis →
  Challenge validation → Scoring

- Output: Confidence score and verification result

# 2. System Components

## 2.1 Presentation Layer

React-based frontend with TypeScript providing:

- Verification interface with real-time video stream

- Management dashboard for verification history and analytics

- Administrative panel for policy configuration

- Responsive design for modern web browsers

## 2.2 API Gateway Layer

Spring Boot REST API providing:

- JWT authentication and authorization

- Rate limiting and request validation

- Comprehensive error handling and logging

- CORS and security headers configuration

## 2.3 Business Logic Layer

Core verification services:

- Verification Orchestrator: Workflow coordination

- Signal Processing: MediaPipe and OpenCV integration for physiological
  analysis

- Behavioral Analysis: Attention and engagement tracking

- Challenge Service: Dynamic challenge generation and validation

- AI Confidence Engine: Weighted scoring algorithm

## 2.4 Data Access Layer

Repository pattern implementation:

- Verification Repository: Verification records management

- Audit Log Repository: Compliance and audit trail

- Policy Repository: Configuration management

- Certificate Repository: Verification certificate storage

## 2.5 Data Persistence Layer

Cloud infrastructure:

- PostgreSQL: Primary relational database

- Google Cloud KMS: Encryption key management

- Google Cloud Storage: Certificate and backup storage

# 3. Database Design

## 3.1 Key Entities

### 3.1.1 Verification

Stores all verification attempts with:

- Unique verification ID (UUID)

- User identifier and operation type

- Status tracking (INITIATED, IN_PROGRESS, COMPLETED, FAILED)

- Confidence score and component scores (JSONB)

- Timestamps and certificate reference

- Flexible metadata storage

### 3.1.2 AuditLog

Immutable audit trail containing:

- Event type classification

- User and resource identification

- Action details and metadata

- Timestamp and IP address tracking

- Immutability flag for compliance

### 3.1.3 VerificationCertificate

Cryptographic proof of verification:

- Certificate data in JSON format

- SHA-256 signature for authenticity

- Public key for third-party validation

- Issue and expiration timestamps

- Revocation flag support

### 3.1.4 Policy

Organization-specific verification policies:

- Policy name and organization association

- Confidence threshold configuration

- Challenge types and maximum duration

- Active/inactive status toggle

- Creation and modification tracking

# 4. API Design

## 4.1 Core Endpoints

POST /api/v1/verify

Initiate verification workflow. Request includes userId, operationType,
metadata. Response includes verificationId and redirectUrl.

GET /api/v1/verify/{verificationId}

Retrieve verification status and results including status,
confidenceScore, and componentScores.

GET /api/v1/verify/{verificationId}/certificate

Retrieve signed verification certificate with certificate data,
signature, and public key.

POST /api/v1/challenges/{verificationId}

Submit challenge response for validation. Request includes challengeId,
response, and timestamp.

POST /api/v1/admin/policies

Create or update verification policies (requires ADMIN role).

GET /api/v1/admin/audit-logs

Query audit logs with filtering by date range, userId, status, limit
(requires AUDIT role).

## 4.2 Error Response Format

All errors follow consistent format including:

- HTTP status code (400, 401, 403, 404, 500, etc.)

- Error code for programmatic handling

- User-friendly error message

- Details object with additional context

- Request ID for logging and debugging

- Timestamp of error occurrence

# 5. Security Design

## 5.1 Authentication

JWT Token-Based Authentication:

- Users authenticate and receive JWT token

- Token includes user identifier and assigned roles

- Token expiration: 1 hour for regular tokens, 7 days for refresh tokens

- Signed with HS256 algorithm using secret key stored in Google Cloud
  Secret Manager

## 5.2 Authorization

Role-Based Access Control (RBAC):

- USER role: Can initiate verifications

- ADMIN role: Can manage policies and configure thresholds

- AUDIT role: Can query audit logs

- SUPERADMIN role: System administration and user management

## 5.3 Data Protection

Encryption strategies:

- At Rest: PostgreSQL encryption, sensitive fields additionally
  encrypted via Cloud KMS

- In Transit: HTTPS/TLS 1.2+ for all communications, WSS for WebSocket

- Cryptographic Signing: SHA-256 for verification certificates

- Video Data: No raw video storage, only extracted physiological signals

## 5.4 Threat Mitigation

- Replay Attack Prevention: Nonce validation, timestamp verification,
  single-use IDs

- Session Hijacking Prevention: IP binding (optional), HttpOnly cookies,
  CSRF tokens

- Input Validation: All inputs validated and sanitized, SQL injection
  prevention via parameterized queries

- Rate Limiting: 100 requests per minute per user, brute force
  protection

- Privacy: No facial images stored, privacy-first design principle

# 6. Cloud Deployment

## 6.1 Google Cloud Services

- Cloud Run: Serverless container deployment with automatic scaling

- Cloud SQL: Managed PostgreSQL database with HA and automated backups

- Cloud KMS: Encryption key management

- Secret Manager: Secure credentials and secrets storage

- Cloud Logging: Log aggregation and analysis

- Cloud Monitoring: Performance metrics and alerting

- Cloud Storage: Certificate and backup storage

- Cloud Build: CI/CD pipeline automation

## 6.2 Scalability Features

- Horizontal Scaling: Cloud Run auto-scales based on traffic

- Database Optimization: Connection pooling, query optimization, read
  replicas

- Caching Strategy: Redis layer (future enhancement) for frequently
  accessed data

- Performance Targets: 10,000 verifications/day, 100 concurrent users,
  \<500ms p99 API response

# 7. Testing Strategy

## 7.1 Test Coverage

- Unit Testing: \> 80% code coverage, component-level testing

- Integration Testing: Module interaction, database operations, API
  chains

- End-to-End Testing: Complete user workflows, browser automation

- Performance Testing: Load simulation, response time benchmarks

- Security Testing: OWASP Top 10 scanning, dependency checks,
  vulnerability assessment

## 7.2 CI/CD Pipeline

Automated deployment workflow:

- Build Stage: Compilation, unit tests, code quality checks

- Test Stage: Integration and end-to-end tests, security scanning

- Image Build: Docker image creation and vulnerability scanning

- Deployment: Staging deployment, smoke tests, production blue-green
  deployment

- Monitoring: Health checks, automated alerts, log analysis

# 8. Development Standards

## 8.1 Code Quality

- Java Backend: Google Java Style Guide compliance

- TypeScript Frontend: Airbnb JavaScript Style Guide adapted for React

- Comments: Javadoc for public APIs, inline for complex logic

- Type Safety: Strict TypeScript, no implicit any

- Null Safety: Optional\<T\> usage, null checks minimized

## 8.2 Version Control

Git flow branching strategy:

- main: Production-ready code, tagged with release versions

- develop: Integration branch for ongoing development

- feature/: Feature development branches

- release/: Release preparation branches

- hotfix/: Production bug fixes

## 8.3 Code Review Requirements

- All code requires peer review before merging

- At least 2 approvals required for main branch

- Automated checks must pass (linting, formatting, tests)

- Comments required for complex or non-obvious code

# 9. Monitoring & Logging

## 9.1 Logging Strategy

- Structured Logging: JSON format for easy parsing

- Log Levels: DEBUG, INFO, WARN, ERROR with appropriate usage

- Audit Logs: Immutable compliance trail, 1-year retention

- Application Logs: 30-day retention via Cloud Logging

- Query Capabilities: Comprehensive filtering and analysis

## 9.2 Performance Monitoring

- Metrics Collection: CPU, memory, requests, latency

- Uptime Monitoring: Continuous availability tracking

- Alert Policies: Automated notifications for threshold breaches

- Dashboards: Real-time visualization of system health

# 10. Future Migration Path

## 10.1 Microservices Migration

The current modular architecture supports future microservices
decomposition:

- Signal Processing Service: Separated for compute-intensive work

- AI Engine Service: Independent ML inference scaling

- Verification Service: Core orchestration service

- Audit Service: Dedicated compliance and logging

## 10.2 Technology Updates

Planned updates and upgrades:

- Spring Boot: Regular LTS updates

- React: Yearly major version updates

- Dependencies: Regular security patches

- Database: PostgreSQL version updates
