import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Navbar from "@/app/components/Navbar";
import { SessionProvider } from "@/app/components/SessionProvider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen">
        <Navbar session={session} />
        <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
      </div>
    </SessionProvider>
  );
}
