import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import Navbar from "@/components/layout/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // Middleware already blocks unauthenticated requests, but this is defensive.
    redirect("/sign-in");
  }

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Navbar />
        {children}
      </main>
    </div>
  );
}
