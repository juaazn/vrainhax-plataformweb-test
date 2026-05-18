import { z } from "zod";

export const commandSchema = z.object({
  type: z.enum([
    "command.recenter_view",
    "command.start_session",
    "command.pause_session",
    "command.resume_session",
    "command.end_session",
    "command.update_config",
  ]),
  device_id: z.string().uuid("device_id must be a valid UUID"),
  session_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type CommandPayload = z.infer<typeof commandSchema>;
