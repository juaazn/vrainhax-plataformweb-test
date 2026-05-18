import { z } from "zod";

export const metricSchema = z.object({
  session_id: z.string().optional(),
  game_id: z.string().optional(),
  timestamp: z.string().optional(),
  metric: z.record(z.string(), z.unknown()).optional(),
});

export type MetricPayload = z.infer<typeof metricSchema>;
