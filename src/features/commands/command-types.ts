export type CommandStatus = "created" | "sent" | "delivered" | "executed" | "failed" | "timeout";

export type CommandAck = {
  status: CommandStatus;
  at: string;
  payload?: unknown;
};
