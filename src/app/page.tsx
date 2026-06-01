import { scrapeCptHedgeServers } from "@/lib/cpt-hedge";
import ServerDashboard from "@/components/server-dashboard";

export const revalidate = 0;

export default async function Home() {
  const { anchorServer, sameSeasonServers, sameSeasonWithShinyTask, totalServers } =
    await scrapeCptHedgeServers();

  return (
    <ServerDashboard
      anchorServer={anchorServer}
      sameSeasonServers={sameSeasonServers}
      sameSeasonWithShinyTask={sameSeasonWithShinyTask}
      totalServers={totalServers}
    />
  );
}
