import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminLoading() {
  return (
    <AdminLoader
      label="ADMIN WORKSPACE"
      sublabel="Synchronizing admin state & telemetry..."
      fullscreen={true}
    />
  );
}
