import { notFound } from "next/navigation";

import { EventsChart } from "@/components/pages/analytics/EventsChart";
import { RecentEventsTable } from "@/components/pages/analytics/RecentEventsTable";
import { StatCard } from "@/components/pages/analytics/StatCard";
import { getAnalyticsOverview } from "@/services/analytics.service";
import { getTenantContext } from "@/lib/tenancy/tenant-context";

const WINDOW_DAYS = 30;

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  const ctx = await getTenantContext(subdomain);
  if (!ctx) notFound();

  const overview = await getAnalyticsOverview(ctx.tenant.publicId, WINDOW_DAYS);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-sm text-text-tertiary">Last {WINDOW_DAYS} days</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total events"
          value={overview.totalEvents.toLocaleString()}
        />
        <StatCard
          label="Unique users"
          value={overview.uniqueUsers.toLocaleString()}
        />
        <StatCard
          label="Top event"
          value={overview.topEvent?.eventName ?? "—"}
          hint={
            overview.topEvent
              ? `${overview.topEvent.count.toLocaleString()} events`
              : undefined
          }
        />
        <StatCard
          label="Events today"
          value={(overview.eventsPerDay.at(-1)?.count ?? 0).toLocaleString()}
        />
      </div>

      <EventsChart data={overview.eventsPerDay} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Recent events
        </h2>
        <RecentEventsTable events={overview.recentEvents} />
      </div>
    </div>
  );
}
