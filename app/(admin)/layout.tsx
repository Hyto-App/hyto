import { Marco } from "@/components/admin/Marco";

export default function LayoutAdmin({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <Marco>{children}</Marco>
    </div>
  );
}
