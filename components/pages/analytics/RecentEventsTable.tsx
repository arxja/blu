import type { EventRow } from "@/lib/database/postgres/types";

function formatTimestamp(ts: Date): string {
  return ts.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function RecentEventsTable({ events }: { events: EventRow[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border-light bg-surface p-8 text-center text-sm text-text-tertiary">
        No events yet. Once your SDK sends its first events, they'll appear
        here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border-light bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-elevated text-text-secondary">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Event</th>
            <th className="px-4 py-2 text-left font-medium">User</th>
            <th className="px-4 py-2 text-left font-medium">Received</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr
              key={e.eventId}
              className="border-t border-border-light hover:bg-surface-elevated"
            >
              <td className="px-4 py-2 font-medium text-text-primary">
                {e.eventName}
              </td>
              <td className="px-4 py-2 text-text-secondary">
                {e.userId ?? "—"}
              </td>
              <td className="px-4 py-2 text-text-tertiary tabular-nums">
                {formatTimestamp(e.receivedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
