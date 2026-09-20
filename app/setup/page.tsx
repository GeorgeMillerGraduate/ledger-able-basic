import { BrandLogo } from "@/components/brand-logo";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getOwnedBusiness, requireAppUser } from "../auth";
import { BusinessSetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function Setup() {
  const user = await requireAppUser();
  if (await getOwnedBusiness(user.id)) redirect("/dashboard");
  return <main className="setup-page"><Link className="welcome-brand" href="/"><BrandLogo/></Link><section className="setup-card"><p className="welcome-eyebrow">One quick step</p><h1>Create your first business</h1><p>Welcome, {user.name}. These details give your new set of books a clean starting point.</p><BusinessSetupForm/></section></main>;
}
