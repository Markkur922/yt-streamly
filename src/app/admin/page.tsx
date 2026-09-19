import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminView } from "@/components/admin/AdminView";

export const metadata: Metadata = {
  title: "Streamly Admin Studio",
  description: "Панель модерации видео и управления каналами Streamly",
};

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") notFound();
  return <AdminView adminName={user.name} />;
}
