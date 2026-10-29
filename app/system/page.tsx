import { CheckList } from "@/components/check-list";
import { PageHeader } from "@/components/page-header";

export default function SystemPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="System-Check">Wird bei jedem Start und alle 15 Sekunden geprüft. Rote Punkte blockieren das Dashboard, gelbe sind Hinweise.</PageHeader>
      <CheckList />
    </div>
  );
}
