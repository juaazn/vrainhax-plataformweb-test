export type MetricEvent = {
  sessionId?: string;
  gameId?: string;
  timestamp?: string;
  metric?: Record<string, unknown>;
};
