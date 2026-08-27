# Blu Architecture

## System Overview Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js App<br/>React + Tailwind]
        B[Main Dashboard<br/>/dashboard]
        C[Workspace Dashboard<br/>subdomain.app.com]
        D[Public API Endpoints<br/>/api/track]
    end

    subgraph "Authentication Layer"
        E[JWT Auth]
        F[Global User Session]
        G[Workspace Context]
        H[Role-based Access]
    end

    subgraph "Backend Layer - Next.js API Routes"
        I[Auth Routes<br/>/api/auth/*]
        J[Workspace Routes<br/>/api/workspaces/*]
        K[Analytics Routes<br/>/api/analytics/*]
        L[Admin Routes<br/>/api/admin/*]
    end

    subgraph "Database Layer - MongoDB"
        M[(DashboardUser)]
        N[(Tenant)]
        O[(Membership)]
        P[(Event)]
        Q[(ApiKey)]
        R[(Dashboard)]
        S[(Report)]
        T[(Invitation)]
    end

    subgraph "External Services"
        U[Stripe<br/>Billing]
        V[Resend<br/>Emails]
        W[Redis<br/>Rate Limiting]
    end

    A --> E
    B --> F
    C --> G
    D --> K

    E --> I
    F --> J
    G --> L

    I --> M
    J --> N
    J --> O
    K --> P
    K --> Q
    L --> R
    L --> S
    L --> T

    I --> U
    I --> V
    K --> W

    style M fill:#f9f,stroke:#333,stroke-width:2px
    style N fill:#bbf,stroke:#333,stroke-width:2px
    style O fill:#bfb,stroke:#333,stroke-width:2px
```

## User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Auth API
    participant DB as MongoDB
    participant J as JWT Service

    rect rgb(0, 0, 0)
        Note over U,J: SIGN UP FLOW
        U->>F: Enter email, name, password
        F->>A: POST /api/auth/signup
        A->>DB: Check if email exists
        DB-->>A: User not found
        A->>DB: Create DashboardUser
        DB-->>A: User created
        A->>J: Generate JWT (global)
        J-->>A: Token
        A-->>F: {token, user}
        F-->>U: Redirect to /dashboard
    end

    rect rgb(0, 0, 0)
        Note over U,J: SIGN IN FLOW
        U->>F: Enter email, password
        F->>A: POST /api/auth/signin
        A->>DB: Find user by email
        DB-->>A: User found
        A->>A: Verify password
        A->>DB: Get memberships
        DB-->>A: List of workspaces
        A->>J: Generate JWT
        J-->>A: Token
        A-->>F: {token, user, workspaces}
        F-->>U: Show workspace selector
    end
```

## Workspace Management Flow

```mermaid
flowchart TD
    Start([User Authenticated]) --> Check{Has Workspaces?}

    Check -->|No| CreateFirst[Show Empty State]
    CreateFirst --> CreateWorkspace[Create Workspace Form]
    CreateWorkspace --> ValidateSubdomain{Check Subdomain<br/>Availability}

    ValidateSubdomain -->|Taken| ShowError[Show Error Message]
    ShowError --> CreateWorkspace

    ValidateSubdomain -->|Available| CreateTenant[Create Tenant]
    CreateTenant --> CreateMembership[Create Membership<br/>Role: Owner]
    CreateMembership --> GenerateJWT[Generate JWT with<br/>Tenant Context]
    GenerateJWT --> RedirectSubdomain[Redirect to<br/>workspace.app.com]

    Check -->|Yes| ShowWorkspaces[Show Workspace Cards]
    ShowWorkspaces --> UserAction{User Action}

    UserAction -->|Select Workspace| SwitchWorkspace[Switch Workspace]
    SwitchWorkspace --> UpdateJWT[Update JWT Context]
    UpdateJWT --> RedirectSelected[Redirect to Selected<br/>Workspace]

    UserAction -->|Create New| CreateWorkspace
    UserAction -->|Join via Invite| AcceptInvite[Accept Invitation]
    AcceptInvite --> CreateMembership2[Create Membership<br/>With Invited Role]
    CreateMembership2 --> RedirectInvited[Redirect to<br/>Workspace]

    RedirectSubdomain --> Dashboard([Workspace Dashboard])
    RedirectSelected --> Dashboard
    RedirectInvited --> Dashboard

    style Start fill:#2b2b2b
    style Dashboard fill:#162E93
    style CreateTenant fill:#1A1953
    style CreateMembership fill:#1A1953
```

## Data Model Relationships

```mermaid
erDiagram
    DashboardUser ||--o{ Membership : has
    DashboardUser ||--o{ Invitation : creates
    DashboardUser ||--o{ Dashboard : creates
    DashboardUser ||--o{ Report : creates

    Tenant ||--o{ Membership : contains
    Tenant ||--o{ ApiKey : owns
    Tenant ||--o{ Event : receives
    Tenant ||--o{ Dashboard : contains
    Tenant ||--o{ Report : contains
    Tenant ||--o{ Invitation : sends

    Membership {
        ObjectId userId
        ObjectId tenantId
        enum role
        boolean isActive
        date lastAccessedAt
        date joinedAt
    }

    DashboardUser {
        ObjectId id PK
        string email UK
        string name
        string passwordHash
        boolean isActive
        date lastLoginAt
    }

    Tenant {
        ObjectId id PK
        string name
        string subdomain UK
        ObjectId ownerId FK
        string plan
        string status
        object quotas
    }

    Event {
        ObjectId id PK
        ObjectId tenantId FK
        string eventName
        object properties
        date timestamp
    }

    ApiKey {
        ObjectId id PK
        ObjectId tenantId FK
        string keyHash UK
        array permissions
    }
```

## Request Flow for Analytics Tracking

```mermaid
sequenceDiagram
    participant C as Client App
    participant E as Edge/Middleware
    participant A as API Route
    participant R as Redis
    participant DB as MongoDB
    participant Q as Queue (JetQueue)
    participant W as Worker

    C->>E: POST /api/track<br/>{event, properties}

    rect rgb(22, 46, 147)
        Note over E: Rate Limiting Check
        E->>R: Check API Key limits
        R-->>E: Within limits
        E->>E: Validate API Key
    end

    E->>A: Forward request with tenant context
    A->>DB: Find Tenant by API Key
    DB-->>A: Tenant found

    rect rgb(47, 47, 228)
        Note over A,W: Async Processing
        A->>Q: Add event to queue
        Q-->>A: Acknowledged
        A-->>C: 202 Accepted
    end

    Q->>W: Process batch (every 5 sec)
    W->>W: Validate schema
    W->>W: Enrich data (IP, UA)
    W->>DB: Bulk insert events
    W->>R: Update usage metrics
    W->>DB: Update Tenant quotas

    Note over C: Response sent immediately
    Note over W,DB: Background processing
```

## Multi-Workspace Architecture

```mermaid
graph LR
    subgraph "Global User Account"
        U1[DashboardUser john@email.com]
        U2[DashboardUser jane@email.com]
    end

    subgraph "Workspace A - Acme Inc"
        direction TB
        T1[Tenant acme]
        M1[Membership John: Owner]
        M2[Membership Jane: Admin]
        D1[(Analytics Data Events, Dashboards)]
    end

    subgraph "Workspace B - Beta Corp"
        direction TB
        T2[Tenant beta]
        M3[Membership John: Viewer]
        D2[(Analytics Data)]
    end

    U1 --> M1
    U1 --> M3
    U2 --> M2

    M1 --> T1
    M2 --> T1
    T1 --> D1

    M3 --> T2
    T2 --> D2

    style U1 fill:#162E93
    style U2 fill:#162E93
    style T1 fill:#2F2FE4
    style T2 fill:#2F2FE4
```

## Tenancy Flow (technical)

```mermaid
flowchart TD
    subgraph Entry_Points [Entry Points]
        Root["Root / Control Plane<br>(app.bu.test)"]
        TenantDemo["Tenant Host<br>(demo.bu.test)"]
        TenantAcme["Tenant Host<br>(acme.bu.test)"]
    end

    subgraph Middleware [Middleware]
        Proxy["Next.js Proxy (proxy.ts)<br>Request Interception & Routing"]
    end

    subgraph Application [Next.js Application]
        direction TB
        subgraph ControlPlaneFlow [Control Plane Flow]
            CPRoutes["Control Plane Routes<br>/ (Home), /pricing, /sign-in,<br>/sign-up, /api/workspaces/*"]
        end

        subgraph TenantFlow [Tenant Flow]
            TRoutes["Tenant Routes (Internal)<br>/tenant/*<br>TenantHomePage"]
        end

        subgraph APIShared [API Routes]
            APIRoutes["API Routes (Shared)<br>/api/isr/me, /api/auth/...,<br>/api/projects/..., /api/webhooks/..."]
        end
    end

    subgraph Infrastructure [Infrastructure & Services]
        DB[("Database (MongoDB)<br>Users, Tenants, Memberships, Workspaces")]
        Redis[("Redis<br>Caching, Rate Limiting, Sessions")]
        ServiceLayer["Services<br>Tenant Access, Quota Service, Billing, Feature Flags"]
        Integrations["Integrations<br>Stripe, Email, Webhooks, Queue System"]
    end

    subgraph Security_Box [Security]
        Auth["Shared Authentication<br>JWT stored in cookie (Domain=bu.test)"]
        TenantAuth["Tenant Authorization<br>Role-based access control<br>Isolated tenant data"]
        HostRes["Hostname Resolution<br>demo.bu.test -> tenant: demo"]
    end

    %% Control Plane Flow
    Root -->|"1. User requests /dashboard"| Proxy
    Proxy -->|"2. Proxy validates auth"| CPRoutes
    CPRoutes -->|"3. Request proceeds normally"| CPRoutes
    CPRoutes -->|"4. Next.js handles the request"| DB
    CPRoutes --> Redis
    CPRoutes --> ServiceLayer
    CPRoutes --> Integrations

    %% Tenant Flow
    TenantDemo -->|"1. User requests /"| Proxy
    TenantAcme -->|"1. User requests /"| Proxy
    Proxy -->|"2. Proxy validates auth"| TRoutes
    TRoutes -->|"3. Rewrite to /tenant"| TRoutes
    TRoutes -->|"4. Next.js handles internally"| DB
    TRoutes --> Redis
    TRoutes --> ServiceLayer
    TRoutes --> Integrations

    %% API Routes
    Proxy -->|"Allow API routes to pass through"| APIRoutes
    APIRoutes --> DB
    APIRoutes --> Redis
    APIRoutes --> ServiceLayer
    APIRoutes --> Integrations

    %% Security Connections
    Auth -.-> Proxy
    TenantAuth -.-> TRoutes
    HostRes -.-> Proxy
```
