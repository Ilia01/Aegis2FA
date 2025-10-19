# System Architecture

## Overview

The 2FA Authentication Service is a production-ready microservice built on a modern, scalable architecture. It provides enterprise-grade two-factor authentication capabilities through a RESTful API.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        API_CLIENT[Third-party Client]
    end

    subgraph "API Gateway Layer"
        LB[Load Balancer]
        NGINX[Nginx / Reverse Proxy]
    end

    subgraph "Application Layer"
        BE1[Backend Instance 1]
        BE2[Backend Instance 2]
        BE3[Backend Instance N]
        WORKER[Background Workers]
    end

    subgraph "Service Layer"
        AUTH[Auth Service]
        TFA[2FA Service]
        WEBHOOK[Webhook Service]
        AUDIT[Audit Service]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL)]
        REDIS[(Redis)]
    end

    subgraph "External Services"
        TWILIO[Twilio SMS]
        SMTP[SMTP Email]
    end

    WEB --> LB
    MOBILE --> LB
    API_CLIENT --> LB
    LB --> NGINX
    NGINX --> BE1
    NGINX --> BE2
    NGINX --> BE3

    BE1 --> AUTH
    BE2 --> AUTH
    BE3 --> AUTH

    BE1 --> TFA
    BE2 --> TFA
    BE3 --> TFA

    WORKER --> WEBHOOK
    WORKER --> AUDIT

    AUTH --> PG
    AUTH --> REDIS
    TFA --> PG
    TFA --> REDIS
    WEBHOOK --> PG
    AUDIT --> PG

    TFA -.->|SMS 2FA| TWILIO
    TFA -.->|Email 2FA| SMTP
    WEBHOOK -.->|Notifications| SMTP
```

## Component Breakdown

### 1. Client Layer

**Purpose**: Applications that consume the 2FA service

- **Web Applications**: Next.js frontend (included) or custom web apps
- **Mobile Apps**: iOS, Android, React Native, Flutter
- **Third-party Clients**: Services integrating via API keys

### 2. API Gateway Layer

**Purpose**: Traffic routing and load balancing

- **Load Balancer**: Distributes requests across backend instances
- **Reverse Proxy**: Nginx for SSL termination, static content, rate limiting
- **Features**:
  - SSL/TLS termination
  - Request routing
  - Static file serving
  - Compression

### 3. Application Layer

**Purpose**: Core business logic execution

#### Backend Instances
- Node.js/Express applications
- Horizontally scalable
- Stateless design (sessions in Redis)
- JWT-based authentication

#### Background Workers
- BullMQ job processors
- Handles async operations:
  - Webhook delivery
  - Email sending
  - Audit log processing
  - Cleanup tasks

### 4. Service Layer

**Purpose**: Domain-specific business logic

#### Authentication Service
- User registration and login
- Password hashing (Argon2id)
- JWT token management
- Session management

#### 2FA Service
- TOTP generation and verification
- SMS OTP delivery
- Email OTP delivery
- Backup code management
- Trusted device tracking

#### Webhook Service
- Event notification delivery
- HMAC signature generation
- Retry logic with exponential backoff
- Delivery tracking

#### Audit Service
- Security event logging
- User activity tracking
- Compliance monitoring

### 5. Data Layer

**Purpose**: Persistent and transient data storage

#### PostgreSQL
- Primary data store
- User accounts
- 2FA settings
- API keys
- Webhooks
- Audit logs
- Connection pooling via Prisma

#### Redis
- OTP code storage (temporary)
- Rate limiting counters
- Session storage
- Job queue (BullMQ)
- Cache layer

### 6. External Services

**Purpose**: Third-party integrations

- **Twilio**: SMS delivery for SMS 2FA
- **SMTP**: Email delivery for Email 2FA
- Optional: Can be disabled for TOTP-only deployments

## Data Flow

### Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant LB as Load Balancer
    participant API as Backend API
    participant Service as Service Layer
    participant DB as PostgreSQL
    participant Cache as Redis

    Client->>LB: HTTP Request
    LB->>API: Route to instance
    API->>API: Validate request
    API->>Cache: Check cache
    alt Cache hit
        Cache-->>API: Return cached data
    else Cache miss
        API->>Service: Process request
        Service->>DB: Query data
        DB-->>Service: Return data
        Service->>Cache: Update cache
        Service-->>API: Return result
    end
    API-->>LB: HTTP Response
    LB-->>Client: Return response
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthSvc as Auth Service
    participant DB as PostgreSQL
    participant Redis

    Client->>API: POST /auth/login
    API->>AuthSvc: Validate credentials
    AuthSvc->>DB: Query user
    DB-->>AuthSvc: User data
    AuthSvc->>AuthSvc: Verify password (Argon2)

    alt Password valid
        AuthSvc->>DB: Check 2FA status
        alt 2FA enabled
            AuthSvc->>Redis: Store temp token
            AuthSvc-->>API: Return temp token
            API-->>Client: 200 {tempToken, requires2FA: true}
        else 2FA disabled
            AuthSvc->>AuthSvc: Generate JWT tokens
            AuthSvc->>Redis: Store session
            AuthSvc-->>API: Return tokens
            API-->>Client: 200 {accessToken, refreshToken}
        end
    else Password invalid
        AuthSvc-->>API: Unauthorized
        API-->>Client: 401 Unauthorized
    end
```

## Deployment Architectures

### Single Instance (Development)

```mermaid
graph LR
    CLIENT[Client] --> BACKEND[Backend + Frontend]
    BACKEND --> PG[(PostgreSQL)]
    BACKEND --> REDIS[(Redis)]
```

**Use case**: Local development, testing

**Resources**: Docker Compose, 2GB RAM

### Free Tier (Zero Budget)

```mermaid
graph LR
    CLIENT[Client] --> RAILWAY[Railway/Render]
    RAILWAY --> SUPABASE[(Supabase PG)]
    RAILWAY --> UPSTASH[(Upstash Redis)]
```

**Use case**: Small projects, POC, < 100 users

**Cost**: $0/month

**Limitations**:
- Single instance
- 500-750 hours/month
- 10MB Redis
- Cold starts

### Production (Small Scale)

```mermaid
graph TB
    CLIENT[Client] --> CF[Cloudflare CDN]
    CF --> LB[Load Balancer]
    LB --> BE1[Backend 1]
    LB --> BE2[Backend 2]
    BE1 --> PG[(PostgreSQL)]
    BE2 --> PG
    BE1 --> REDIS[(Redis)]
    BE2 --> REDIS
    WORKER[Worker] --> PG
    WORKER --> REDIS
```

**Use case**: Production apps, 1K-10K users

**Cost**: $25-50/month

**Features**:
- Multiple instances
- Auto-scaling
- High availability
- Monitoring

### Production (Enterprise)

```mermaid
graph TB
    CLIENT[Client] --> CDN[CDN]
    CDN --> WAF[WAF]
    WAF --> ALB[Application Load Balancer]

    subgraph "Application Tier"
        BE1[Backend 1]
        BE2[Backend 2]
        BE3[Backend 3]
    end

    subgraph "Worker Tier"
        W1[Worker 1]
        W2[Worker 2]
    end

    subgraph "Data Tier"
        PRIMARY[(Primary DB)]
        REPLICA1[(Read Replica 1)]
        REPLICA2[(Read Replica 2)]
        REDIS_CLUSTER[Redis Cluster]
    end

    ALB --> BE1
    ALB --> BE2
    ALB --> BE3

    BE1 --> PRIMARY
    BE2 --> PRIMARY
    BE3 --> PRIMARY

    BE1 --> REPLICA1
    BE2 --> REPLICA2
    BE3 --> REPLICA1

    BE1 --> REDIS_CLUSTER
    BE2 --> REDIS_CLUSTER
    BE3 --> REDIS_CLUSTER

    W1 --> PRIMARY
    W2 --> PRIMARY
    W1 --> REDIS_CLUSTER
    W2 --> REDIS_CLUSTER
```

**Use case**: Enterprise, 100K+ users

**Cost**: $500+/month

**Features**:
- Multi-region deployment
- Database replication
- Redis cluster
- WAF protection
- DDoS mitigation
- 99.9% SLA

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Validation**: Zod
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: Argon2id
- **Job Queue**: BullMQ

### Frontend
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State**: React Context
- **HTTP Client**: Axios

### Infrastructure
- **Database**: PostgreSQL 14+
- **Cache**: Redis 6+
- **Container**: Docker
- **Orchestration**: Docker Compose / Kubernetes
- **CI/CD**: GitHub Actions

### External Services
- **SMS**: Twilio (optional)
- **Email**: SMTP / Nodemailer
- **Monitoring**: Custom health checks

## Security Architecture

### Defense in Depth

```mermaid
graph TB
    subgraph "Layer 1: Network"
        FIREWALL[Firewall Rules]
        DDOS[DDoS Protection]
    end

    subgraph "Layer 2: Application"
        RATELIMIT[Rate Limiting]
        CSRF[CSRF Protection]
        HELMET[Security Headers]
    end

    subgraph "Layer 3: Authentication"
        JWT[JWT Tokens]
        TFA[2FA Verification]
        SESSION[Session Management]
    end

    subgraph "Layer 4: Authorization"
        RBAC[Role-Based Access]
        APIKEY[API Key Scopes]
    end

    subgraph "Layer 5: Data"
        ENCRYPTION[At-Rest Encryption]
        HASHING[Password Hashing]
        PARAMETERIZED[Parameterized Queries]
    end

    FIREWALL --> RATELIMIT
    DDOS --> CSRF
    RATELIMIT --> JWT
    CSRF --> TFA
    JWT --> RBAC
    TFA --> APIKEY
    RBAC --> ENCRYPTION
    APIKEY --> HASHING
```

### Security Features

- **Password Security**: Argon2id with configurable memory, iterations, parallelism
- **JWT Security**: Short-lived access tokens (15 min), rotating refresh tokens
- **2FA Methods**: TOTP, SMS, Email, Backup codes, Trusted devices
- **Rate Limiting**: Per-endpoint limits, IP-based, user-based
- **CSRF Protection**: Double-submit cookie pattern
- **Security Headers**: Helmet.js (CSP, HSTS, X-Frame-Options)
- **Input Validation**: Zod schemas, sanitization
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **Audit Logging**: All security events tracked

## Scalability

### Horizontal Scaling

The service is designed for horizontal scaling:

- **Stateless Design**: All state in PostgreSQL/Redis
- **Session Storage**: Redis-backed sessions
- **Load Balancing**: Round-robin, least connections
- **Auto-scaling**: Based on CPU, memory, request rate

### Performance Optimizations

- **Worker Pool**: Piscina for CPU-intensive operations (password hashing)
- **Connection Pooling**: Prisma connection pool
- **Caching**: Redis for frequently accessed data
- **Async Processing**: BullMQ for background jobs
- **Compression**: gzip/brotli for responses

### Resource Limits

| Deployment | Users | RPS | Database | Redis |
|------------|-------|-----|----------|-------|
| Free Tier | 100 | 10 | 500MB | 10MB |
| Small | 1,000 | 50 | 2GB | 100MB |
| Medium | 10,000 | 200 | 10GB | 1GB |
| Large | 100,000+ | 1,000+ | 100GB+ | 10GB+ |

## Monitoring & Observability

### Health Checks

- `/api/health` - Overall health
- `/api/health/live` - Liveness probe
- `/api/health/ready` - Readiness probe

### Metrics

- Request rate
- Response time (p50, p95, p99)
- Error rate
- Database query performance
- Redis hit/miss ratio
- Worker queue depth

### Logging

- Application logs (Winston)
- Audit logs (database)
- Access logs (Nginx)
- Error tracking

## Next Steps

- [Authentication Flow](authentication-flow.md) - Detailed authentication process
- [Database Schema](database-schema.md) - Data model and relationships
- [Security Architecture](security.md) - Security controls and best practices
- [Deployment Guide](../deployment/docker.md) - Deploy to production
