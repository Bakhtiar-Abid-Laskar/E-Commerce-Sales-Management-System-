import SalesTrackerApp from "@/components/SalesTrackerApp";
import { ProtectedPage } from "@/components/ProtectedPage";

export default function Home() {
  return (
    <ProtectedPage>
      <SalesTrackerApp />
    </ProtectedPage>
  );
}
