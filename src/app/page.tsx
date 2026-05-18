"use client";

import { ConnectionCard } from "@/components/cards/connection-card";
import { useRealtimeContext } from "@/features/realtime/realtime-provider";
import { env } from "@/lib/env";

export default function HomePage() {
  const { connectionState, lastEvent } = useRealtimeContext();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Test Dashboard</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ConnectionCard title="WebSocket Status" value={connectionState} />
        <ConnectionCard title="Environment" value={env.appEnv} />
        <ConnectionCard title="Last Event Received" value={lastEvent?.eventType ?? "-"} />
      </div>
    </div>
  );
}
