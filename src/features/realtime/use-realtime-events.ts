"use client";

import { useMemo } from "react";
import { useRealtimeContext } from "@/features/realtime/realtime-provider";

export function useRealtimeEvents(eventName?: string) {
  const { eventLog, ...rest } = useRealtimeContext();

  const events = useMemo(() => {
    if (!eventName) return eventLog;
    return eventLog.filter((event) => event.eventType === eventName);
  }, [eventLog, eventName]);

  return { ...rest, events };
}
