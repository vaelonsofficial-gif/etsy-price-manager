import { cookies } from "next/headers";
import ManagerClient from "./ManagerClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const store = await cookies();
  const initialConnected = Boolean(store.get("etsy_refresh_token")?.value);

  return <ManagerClient initialConnected={initialConnected} />;
}
