# Seed System Documentation

<!-- ToDo: sync with new simplified version -->

> The seed system populates your database with initial test data for development and testing purposes. It creates tenants, users, events, dashboards, reports, and invitations.

## File Structure

```text
scripts/seed/
├── index.ts           # Main entry point
├── utils.ts           # Helper functions
├── tenants.ts         # Tenant data
├── users.ts           # Dashboard users data
├── apiKeys.ts         # API keys data
├── events.ts          # Event data
├── dashboards.ts      # Dashboard data
├── reports.ts         # Report data
└── invitations.ts     # Invitation data
```

## Prerequisites

### Environment Variables

Create a `.env` file in your project root

```bash
# Required
DATABASE_URL=mongodb://localhost:27017/saasify
JWT_SECRET=your-super-secret-key-min-32-chars

# Optional (for development)
NODE_ENV=development
LOG_LEVEL=debug
```

### MongoDB Setup

**Option 1: Local MongoDB**:

```bash
# Start MongoDB
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Or use system MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongodb           # Linux
net start MongoDB                       # Windows
```

**Option 2: MongoDB Atlas**:

1. Add your IP to whitelist
2. Get connection string
3. Update `DATABASE_URL` in `.env`

## Installation

```bash
# Dependencies are already configured in package.json
# Just run:
pnpm install

# Run seed
pnpm run seed
```

## Package.json Scripts

```json
{
  "scripts": {
    "seed": "bun run scripts/seed/index.ts"
  }
}
```

## API Reference

### Main Module: `index.ts`

The entry point that orchestrates all seeding operations

Export: None (runs directly)

**Flow**:

1. Connect to database
2. Clear existing data
3. Create tenants
4. Create dashboard users
5. Create API keys
6. Create events
7. Create dashboards
8. Create reports
9. Create invitations
10. Output summary

### Utils Module: `utils.ts`

Helper functions for seeding operations.

#### `clearDatabase()`

Deletes all data from all collections.

```ts
await clearDatabase();
// Clears: tenants, dashboard_users, api_keys, events, dashboards, reports, invitations
```

#### generateRandomEvents(tenantId, daysBack)

Generates random event data for testing.

**Parameters**:

- `tenantId: mongoose.Types.ObjectId` - Tenant to generate events for
- `daysBack: number` - Number of days of data to generate

**Returns**: `Array<object>` - Array of event objects

```ts
const events = generateRandomEvents(tenantId, 30);
// Creates 30 days of random events (20-50 events per day)
```

### Tenant Module: `tenants.ts`

Creates tenant/company records.
Exports: `default function seedTenants(): Promise<ITenant[]>`

\*_Data Created_:

| Tenant           | Plan       | Status   | Subdomain |
| ---------------- | ---------- | -------- | --------- |
| Acme Corporation | Pro        | Active   | acme      |
| StartupX         | Free       | Active   | startupx  |
| Beta Inc         | Enterprise | Trialing | beta      |

### Users Module: `users.ts`

Creates dashboard user accounts.

Exports: `default function seedUsers(tenants: ITenant[]): Promise<IDashboardUser[]>`

**Parameters**:

- `tenants` - Array of created tenants

**Data Created**:

| Name          | Email                | Role    | Tenant   |
| ------------- | -------------------- | ------- | -------- |
| John CEO      | ceo@acme.com         | owner   | Acme     |
| Sarah Analyst | analyst@acme.com     | analyst | Acme     |
| Mike Viewer   | viewer@acme.com      | viewer  | Acme     |
| Alex Founder  | founder@startupx.com | owner   | StartupX |
| Beta Admin    | admin@beta.io        | admin   | Beta Inc |

Default Password: `Test123!` (hashed with bcrypt)

### API Keys Module: `apiKeys.ts`

Creates API keys for data ingestion.

**Exports**: `default function seedApiKeys(tenants: ITenant[]): Promise<void>`

**Parameters**:

- tenants - Array of created tenants

**Data Created**:

| Name            | Tenant   | Permissions            |
| --------------- | -------- | ---------------------- |
| Acme Production | Acme     | track, identify, query |
| Acme Staging    | Acme     | track, identify        |
| StartupX Prod   | StartupX | track, identify        |
| Beta API Key    | Beta Inc | track, identify, query |

### Events Module: `events.ts`

Creates analytics event data.

**Exports**: `default function seedEvents(tenants: ITenant[]): Promise<void>`

**Parameters**:

- tenants - Array of created tenants

**Data Created**:

| Tenant   | Days | Events (approx) |
| -------- | ---- | --------------- |
| Acme     | 30   | 750             |
| StartupX | 15   | 375             |
| Beta Inc | 45   | 1,125           |

**Event Types**:

- page_view - Page view tracking
- signup - User registration
- purchase - Purchase transaction
- click_button - Button clicks
- view_pricing - Pricing page views

**Event Properties**:

```typescript
{
  url: string,
  price?: number,        // For purchase events
  referrer: string,      // "google.com" or "direct"
  browser: string        // "Chrome", "Firefox", "Safari"
}
```

### Dashboards Module: `dashboards.ts`

Creates saved dashboard configurations.

**Exports**: `default function seedDashboards(tenants: ITenant[], users: IDashboardUser[]): Promise<void>`

**Parameters**:

- tenants - Array of created tenants
- users - Array of created users

**Data Created**:

| Dashboard        | Tenant   | Owner   | Widgets       |
| ---------------- | -------- | ------- | ------------- |
| Sales Dashboard  | Acme     | CEO     | 2 (line, bar) |
| Traffic Overview | Acme     | Analyst | 1 (pie)       |
| Startup Metrics  | StartupX | Founder | 1 (line)      |

### Reports Module: `reports.ts`

Creates saved report configurations.

**Exports**: `default function seedReports(tenants: ITenant[], users: IDashboardUser[]): Promise<void>`

**Parameters**:

- tenants - Array of created tenants
- users - Array of created users

**Data Created**:

| Report                   | Tenant   | Owner   | Schedule |
| ------------------------ | -------- | ------- | -------- |
| High Value Customers     | Acme     | Analyst | Weekly   |
| Weekly Conversion Report | Acme     | CEO     | Daily    |
| User Activity Report     | StartupX | Founder | Manual   |

### Invitations Module: `invitations.ts`

Creates pending team invitations.

**Exports**: `default function seedInvitations(tenants: ITenant[], users: IDashboardUser[]): Promise<void>`

**Parameters**:

- tenants - Array of created tenants
- users - Array of created users

**Data Created**:

| Email                  | Role    | Tenant   | Status  |
| ---------------------- | ------- | -------- | ------- |
| new-analyst@acme.com   | analyst | Acme     | pending |
| marketing@startupx.com | viewer  | StartupX | pending |

## Usage Examples

### Basic Usage

```bash
# Run full seed
pnpm run seed

# Or with bun
bun run scripts/seed/index.ts
```

### In Code Usage

```ts
import { connectDB } from "@/lib/database/connection";
import seedTenants from "./seed/tenants";
import seedUsers from "./seed/users";

async function customSeed() {
  await connectDB();

  // Seed only tenants
  const tenants = await seedTenants();

  // Seed only users for specific tenant
  const acme = tenants.find((t) => t.subdomain === "acme");
  if (acme) {
    const users = await seedUsers([acme]);
  }
}
```

### Running in Different Environments

```bash
# Development
NODE_ENV=development pnpm run seed

# Staging (different database)
DATABASE_URL=mongodb://localhost:27017/saasify_staging pnpm run seed

# With custom seed
bun run scripts/seed/index.ts -- --custom-data
```

## Test Credentials

After seeding, use these credentials to log in:

| Email                | Password | Role    | Tenant   | Subdomain            |
| -------------------- | -------- | ------- | -------- | -------------------- |
| ceo@acme.com         | Test123! | owner   | Acme     | acme.localhost:3000     |
| analyst@acme.com     | Test123! | analyst | Acme     | acme.localhost:3000     |
| viewer@acme.com      | Test123! | viewer  | Acme     | acme.localhost:3000     |
| founder@startupx.com | Test123! | owner   | StartupX | startupx.localhost:3000 |
| admin@beta.io        | Test123! | admin   | Beta Inc | beta.localhost:3000     |

### API Keys (For Testing)

| Key Name        | Tenant   | Key Prefix (use for testing)   |
| --------------- | -------- | ------------------------------ |
| Acme Production | Acme     | First 8 chars of generated key |
| StartupX Prod   | StartupX | First 8 chars of generated key |

## Output Example

```text
📦 Starting database seed...

🧹 Clearing existing data...
✅ Cleared existing data

📦 Creating tenants...
✅ Created 3 tenants

👥 Creating dashboard users...
✅ Created 5 dashboard users

🔑 Creating API keys...
✅ Created API keys

📊 Creating events...
✅ Created 2250 events (Acme:750, StartupX:375, Beta:1125)

📈 Creating dashboards...
✅ Created 3 dashboards

📑 Creating reports...
✅ Created 3 reports

✉️ Creating invitations...
✅ Created 2 invitations

🎉 SEED COMPLETED SUCCESSFULLY!

🔐 Test Logins (password: Test123!):
   Acme CEO:     ceo@acme.com
   Acme Analyst: analyst@acme.com
   Acme Viewer:  viewer@acme.com
   StartupX:     founder@startupx.com
   Beta Inc:     admin@beta.io

🌐 Subdomains:
   http://acme.localhost:3000
   http://startupx.localhost:3000
   http://beta.localhost:3000
```

## Notes

- The seed clears all existing data before running
- Passwords are hashed using bcrypt
- All timestamps are generated dynamically
- Events are randomly distributed across days and hours
- The seed maintains referential integrity (foreign keys)
- Run in development environment only, never in production
- **All the references (names, emails, organizations/companies etc) in this seed data are just fictional samples and used for the development use cases**
