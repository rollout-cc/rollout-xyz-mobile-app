import { AppLayout } from "@/components/AppLayout";
import { RollyChat } from "@/components/rolly/RollyChat";

export default function Rolly() {
  return (
    <AppLayout title="ROLLY">
      <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] flex flex-col">
        <RollyChat />
      </div>
    </AppLayout>
  );
}
