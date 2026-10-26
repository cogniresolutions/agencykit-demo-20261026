import { redirect } from "next/navigation";

export default async function SubAccountIndex({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  redirect(`/app/${sub}/dashboard`);
}
