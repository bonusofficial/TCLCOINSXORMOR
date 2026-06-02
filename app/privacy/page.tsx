"use client";

import { useConfig } from "@/lib/contexts/PublicDataContext";
import LegalPage from "@/components/LegalPage";

export default function PrivacyPage() {
  const { config } = useConfig();
  return (
    <LegalPage
      title="นโยบายความเป็นส่วนตัว"
      html={config.privacyContent}
    />
  );
}
