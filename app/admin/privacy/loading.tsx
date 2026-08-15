import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminPrivacyLoading() {
  return (
    <AdminLoader
      label="PRIVACY POLICY"
      sublabel="Loading security & privacy documentation..."
      fullscreen={true}
    />
  );
}
