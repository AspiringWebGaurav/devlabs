import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminTermsLoading() {
  return (
    <AdminLoader
      label="TERMS OF SERVICE"
      sublabel="Loading legal documentation..."
      fullscreen={true}
    />
  );
}
