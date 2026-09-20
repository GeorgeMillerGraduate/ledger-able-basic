import { getAppUser } from "./auth";
import { Welcome } from "./welcome";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const [user, params] = await Promise.all([getAppUser(), searchParams]);
  return <Welcome signedIn={!!user} configured={!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} error={params.auth_error}/>;
}
