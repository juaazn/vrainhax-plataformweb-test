export function safeJsonParse(input: string): unknown {
  return JSON.parse(input) as unknown;
}

export function safeStringify(input: unknown): string {
  return JSON.stringify(input, null, 2);
}
