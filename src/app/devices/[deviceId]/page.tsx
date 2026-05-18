import { DeviceDetailClient } from "./DeviceDetailClient";

type PageProps = {
  params: Promise<{ deviceId: string }>;
};

export default async function DeviceDetailPage({ params }: PageProps) {
  const { deviceId } = await params;
  return <DeviceDetailClient deviceId={deviceId} />;
}
