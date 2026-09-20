import { AccountsApp } from "../accounts-app";
import { requireAppUser, requireOwnedBusiness } from "../auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireAppUser();
  const business = await requireOwnedBusiness(user.id);
  return <AccountsApp user={{ name: user.name, email: user.email }} business={business} signOutPath="/api/auth/signout"/>;
}
