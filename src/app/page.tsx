import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UploadSection } from "@/components/upload/UploadSection";

export default function Home() {
  return (
    <DashboardLayout>
      <UploadSection />
    </DashboardLayout>
  );
}
