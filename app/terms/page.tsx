"use client";

import { useConfig } from "@/lib/contexts/PublicDataContext";
import LegalPage from "@/components/LegalPage";

export default function TermsPage() {
  const { config } = useConfig();
  return (
    <LegalPage
      title="ข้อกำหนดเงื่อนไขการใช้บริการ"
      html={config.termsContent}
    />
  );
}
