import type { DeviceItem } from "@/features/devices/device-types";
import { StatusBadge } from "@/components/debug/status-badge";

export function DeviceCard({ device }: { device: DeviceItem }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4 text-sm">
      <div className="font-medium">{device.deviceId}</div>
      <div className="mt-2"><StatusBadge value={device.status} /></div>
      <div className="mt-2 text-slate-600">Heartbeat: {device.lastHeartbeat ?? "-"}</div>
    </article>
  );
}
