import { request } from "@/features/api/api-client";
import { z } from "zod";

const SyncUserResponseSchema = z.object({
  data: z.object({
    userId: z.string().uuid(),
    username: z.string(),
    email: z.string().email(),
    role: z.string(),
    active: z.boolean(),
  }),
});

export type SyncUserResponse = z.infer<typeof SyncUserResponseSchema>;

export async function syncUser(username: string, roleId: string): Promise<SyncUserResponse> {
  const response = await request<SyncUserResponse["data"]>("/api/v1/users/sync", {
    method: "POST",
    body: JSON.stringify({ username, roleId }),
  });
  return SyncUserResponseSchema.parse({ data: response.data });
}
