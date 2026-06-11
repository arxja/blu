# 🚀 Performance Optimization Guide For SaaSify

This guide covers the essential metrics that affect user experience and SEO, with specific thresholds and actionable fixes for each.

## 📊 Core Metrics at a Glance

| Metric   | Target | Good   | Needs Fix |
| -------- | ------ | ------ | --------- |
| **TTFB** | <200ms | <400ms | >600ms    |
| **FCP**  | <1.0s  | <1.8s  | >3.0s     |
| **LCP**  | <2.5s  | <4.0s  | >4.0s     |
| **TTI**  | <3.0s  | <5.0s  | >7.0s     |
| **TBT**  | <200ms | <300ms | >600ms    |

## 🌐 Time to First Byte (TTFB)

**What it measures:** How long the server takes to respond with the first byte of data.

**Why it matters:** Slow TTFB means your server is the bottleneck, regardless of how optimized your frontend is.

### 🔴 Symptoms of Bad TTFB

- Page feels slow even with fast internet
- Empty white screen before any content appears
- Good Lighthouse scores except "Reduce initial server response time"

### ✅ How to Fix

**1. Move logic to appropriate layer**

```typescript
// ❌ Bad - Running heavy logic in Proxy
export function Proxy(request: NextRequest) {
  const session = await getServerSession(); // DB call
  const user = await fetchUserFromDB(session.user.id); // Another DB call
  const permissions = await checkPermissions(user); // Yet another
  // This blocks every request
}

// ✅ Good - Proxy only for auth checks, no DB calls
export function Proxy(request: NextRequest) {
  const token = request.cookies.get("token");
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}
```

**2. Use static generation where possible**

```ts
// ❌ Bad - Server rendering everything
export const dynamic = "force-dynamic"; // Forces SSR on every request

// ✅ Good - Static by default, dynamic only when needed
export const dynamic = "auto"; // Next.js decides
// Or remove the declaration entirely for static generation
```

**3. Move heavy computations to Edge or background**

```ts
// ❌ Bad - Heavy computation in API route
export async function POST(req: Request) {
  const data = await req.json();
  const result = await heavyProcessing(data); // Blocks response
  return Response.json(result);
}

// ✅ Good - Return immediately, process in background
export async function POST(req: Request) {
  const data = await req.json();

  // Start background processing
  queue.add("process-data", data);

  // Return immediately
  return Response.json({ accepted: true, jobId: generateId() });
}
```

**4. Enable compression**

```ts
// next.config.js
module.exports = {
  compress: true, // Already default, but verify it's not disabled
};
```

**5. Use proper caching strategies**

```ts
// Cache expensive API responses
export async function GET() {
  const data = await redis.get("expensive-data");

  if (data) {
    return Response.json(data, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=30",
      },
    });
  }

  const freshData = await fetchFromDatabase();
  await redis.set("expensive-data", freshData, "EX", 60);

  return Response.json(freshData);
}
```

## 🎨 First Contentful Paint (FCP)

**What it measures:** Time until the first content (text, image, canvas) appears on screen.

**Why it matters:** Users perceive speed based on when something first appears.

### 🔴 Symptoms of Bad FCP

- White screen for over 1 second
- Users start leaving before anything loads
- High bounce rate on marketing pages

### ✅ How to Fix

**1. Remove render-blocking resources**

```typescript
// ❌ Bad - Loading large fonts synchronously
import 'some-heavy-font.css'

// ✅ Good - Load fonts with display swap
// In global.css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2');
  font-display: swap;  /* Show fallback until font loads */
}
```

**2. Minimize main thread work during initial load**

```ts
// ❌ Bad - Heavy synchronous work on load
export default function Page() {
  const data = heavyCalculation() // Blocks rendering
  return <div>{data}</div>
}

// ✅ Good - Defer heavy work
export default function Page() {
  const [data, setData] = useState(null)

  useEffect(() => {
    // Run after first paint
    const result = heavyCalculation()
    setData(result)
  }, [])

  return <div>{data || <Skeleton />}</div>
}
```

## 🖼️ Largest Contentful Paint (LCP)

**What it measures:** Time until the largest visible element (hero image, video, large text block) renders.

**Why it matters:** This is Google's primary metric for load speed ranking.

### 🔴 Symptoms of Bad LCP

- Hero image appears slowly
- Main content jumps in after other content
- LCP element changes during load (causing CLS)

### ✅ How to Fix

**1. Prioritize LCP elements**

```typescript
// ❌ Bad - Hero image loading last
<Image src="/hero.jpg" width={1200} height={600} alt="Hero" />

// ✅ Good - Prioritize LCP element
<Image
  src="/hero.jpg"
  width={1200}
  height={600}
  alt="Hero"
  priority  // Forces preload
  fetchPriority="high"  // Browser hint
/>

// Add to next.config.js
module.exports = {
  images: {
    remotePatterns: [
      // your patterns
    ],
    minimumCacheTTL: 60,
  }
}
```

**2. Remove render-blocking for LCP elements**

```ts
// ❌ Bad - JavaScript blocking image load
useEffect(() => {
  const img = new Image();
  img.src = heroImageUrl;
}, []);

// ✅ Good - Let browser load naturally
// Just use priority attribute and let browser handle it
```

**3. Preconnect to critical origins**

```ts
// In layout.tsx or _document.tsx
export default function Layout({ children }) {
  return (
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://cdn.your-cdn.com" />
        <link rel="dns-prefetch" href="https://api.your-backend.com" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**4. Optimize hero images**

```ts
// ✅ Use appropriate sizes
<Image
  src="/hero.jpg"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  quality={85}  // Don't use 100 for large images
/>
```

## 🖱️ Time to Interactive (TTI)

**What it measures:** When the page becomes fully interactive (buttons respond, forms work).

**Why it matters:** Users can see content but can't use it yet.

### 🔴 Symptoms of Bad TTI

- Buttons click but nothing happens for a moment
- Form inputs feel laggy
- Page freezes briefly after loading

### ✅ How to Fix

**1. Break up long tasks (>50ms)**

```typescript
// ❌ Bad - One long task
function processAllData(items) {
  items.forEach(item => {
    heavyOperation(item)  // Blocks for hundreds of ms
  })
}

// ✅ Good - Yield to browser
async function processAllData(items) {
  for (let i = 0; i < items.length; i++) {
    heavyOperation(items[i])
    
    // Let browser breathe every 5 items
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
}
```

**2. Defer non-critical JavaScript**

```ts
// ❌ Bad - Loading everything upfront
import HeavyChart from './HeavyChart'
import AnalyticsTracker from './Analytics'

// ✅ Good - Load when needed
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  ssr: false
})

// Load analytics after interaction
useEffect(() => {
  const loadAnalytics = async () => {
    const tracker = await import('./Analytics')
    tracker.init()
  }
  
  // Wait for user interaction or idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadAnalytics)
  } else {
    setTimeout(loadAnalytics, 2000)
  }
}, [])
```

**3. Use web workers for heavy processing**

```ts
// ❌ Bad - Processing on main thread
const processed = expensiveOperation(largeDataset)

// ✅ Good - Offload to worker
const worker = new Worker(new URL('./data-worker.js', import.meta.url))
worker.postMessage(largeDataset)
worker.onmessage = (e) => {
  setProcessed(e.data)
}
```
## ⏱️ Total Blocking Time (TBT)

**What it measures:** Sum of all long tasks (>50ms) between FCP and TTI.

**Why it matters:** Directly correlates with user perception of responsiveness.

### 🔴 Symptoms of Bad TBT

- Scrolling feels janky
- Typing has lag
- Animations stutter

### ✅ How to Fix

**1. Optimize form validation**

```typescript
// ❌ Bad - Validate on every keystroke
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onChange'  // Validates on every input
})

// ✅ Good - Validate on blur or submit
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur',  // Only validates when leaving field
  reValidateMode: 'onChange'  // Or 'onBlur' for stricter
})
```

**2. Debounce expensive operations**

```ts
// ❌ Bad - Heavy operation on every input
function handleSearch(value) {
  const results = searchThroughLargeDatabase(value)  // Blocks
  setResults(results)
}

// ✅ Good - Debounced search
import { useDebouncedCallback } from 'use-debounce'

const handleSearch = useDebouncedCallback(
  async (value) => {
    const results = await searchAPI(value)
    setResults(results)
  },
  300  // Wait 300ms before executing
)
```

**3. Split client components**

```ts
// ❌ Bad - Everything client-side
'use client'

export default function Dashboard() {
  // All code here runs on client
  return <div>...</div>
}

// ✅ Good - Only interactive parts are client
// Server Component (no 'use client')
import { InteractiveChart } from './InteractiveChart'

export default function Dashboard() {
  // This part is SSR, no client JS
  return (
    <div>
      <h1>Dashboard</h1>
      <InteractiveChart />  {/* Only this is client */}
    </div>
  )
}
```

## Performance Check

- [ ] No unnecessary `'use client'` directives
- [ ] Images use next/image with appropriate sizes
- [ ] No large new dependencies (>30KB gzipped)
- [ ] Form validation uses `mode: 'onBlur'` where appropriate
- [ ] Expensive operations debounced or web-workered
- [ ] LCP element has `priority` attribute
- [ ] No synchronous API calls during render