import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminLoginLoading() {
  return (
    <AdminLoader
      label="ADMIN SIGN-IN"
      sublabel="Establishing encrypted session..."
      fullscreen={true}
    />
  );
}
