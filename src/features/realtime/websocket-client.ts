import { env } from "@/lib/env";
import { parseRealtimeEvent, type RealtimeEvent } from "@/features/realtime/realtime-types";

export type ConnectionState = "connecting" | "connected" | "disconnected";

type Handlers = {
  onConnectionChange: (state: ConnectionState) => void;
  onEvent: (event: RealtimeEvent) => void;
};

export class WebsocketClient {
  private socket?: WebSocket;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private readonly handlers: Handlers;

  constructor(handlers: Handlers) {
    this.handlers = handlers;
  }

  connect(): void {
    this.handlers.onConnectionChange("connecting");
    this.socket = new WebSocket(env.wsUrl);

    this.socket.onopen = () => {
      this.handlers.onConnectionChange("connected");
    };

    this.socket.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data) as unknown;
        this.handlers.onEvent(parseRealtimeEvent(parsed));
      } catch {
        this.handlers.onEvent(parseRealtimeEvent(message.data));
      }
    };

    this.socket.onclose = () => {
      this.handlers.onConnectionChange("disconnected");
      this.retryTimer = setTimeout(() => this.connect(), 2000);
    };

    this.socket.onerror = () => {
      this.handlers.onConnectionChange("disconnected");
    };
  }

  disconnect(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.close();
  }

  send(data: unknown): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(data));
    return true;
  }
}
