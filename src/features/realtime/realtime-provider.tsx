"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { WebsocketClient, type ConnectionState } from "@/features/realtime/websocket-client";
import type { RealtimeEvent } from "@/features/realtime/realtime-types";

type RealtimeContextValue = {
  connectionState: ConnectionState;
  eventLog: RealtimeEvent[];
  lastEvent?: RealtimeEvent;
  send: (input: unknown) => boolean;
};

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [eventLog, setEventLog] = useState<RealtimeEvent[]>([]);
  const clientRef = useRef<WebsocketClient | null>(null);

  useEffect(() => {
    const wsClient = new WebsocketClient({
      onConnectionChange: setConnectionState,
      onEvent: (event) => setEventLog((prev) => [event, ...prev].slice(0, 300)),
    });
    clientRef.current = wsClient;
    wsClient.connect();
    return () => {
      wsClient.disconnect();
      clientRef.current = null;
    };
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connectionState,
      eventLog,
      lastEvent: eventLog[0],
      send: (input) => clientRef.current?.send(input) ?? false,
    }),
    [connectionState, eventLog],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtimeContext must be used within RealtimeProvider");
  return context;
}
