export type SessionItem = {
  sessionId: string;
  patientId: string;
  module: string;
  variant: string;
  status: "idle" | "started" | "ended";
  startedAt?: string;
  endedAt?: string;
};
