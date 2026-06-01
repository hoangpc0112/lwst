const SERVER_PAGE_URL = "https://cpt-hedge.com/servers";
const DATA_MARKER = "52164:function(e){e.exports=JSON.parse('";

export type CptHedgeServer = {
  id: string;
  server: string;
  timestamp: string | number;
  currentSeason: number;
  isPostSeason: boolean;
  currentWeek?: number;
  updatedAt?: number;
  region?: string[];
  seasonStartTimestamps?: Record<string, string>;
};

type CptHedgeDataset = {
  c: CptHedgeServer[];
};

export type ScrapedServer = CptHedgeServer & {
  timestamp: number;
  serverDay: number;
  hasShinyTask: boolean;
  seasonLabel: string;
};

function computeServerDay(timestamp: number) {
  const sourceDate = new Date(timestamp);
  const today = new Date();
  const shiftedSource = new Date(sourceDate.getTime() - 7_200_000);
  const shiftedToday = new Date(today.getTime() - 7_200_000);
  const sourceDay = new Date(
    Date.UTC(
      shiftedSource.getUTCFullYear(),
      shiftedSource.getUTCMonth(),
      shiftedSource.getUTCDate(),
    ),
  );
  const todayDay = new Date(
    Date.UTC(shiftedToday.getUTCFullYear(), shiftedToday.getUTCMonth(), shiftedToday.getUTCDate()),
  );

  return Math.floor((todayDay.getTime() - sourceDay.getTime()) / 86_400_000) + 1;
}

function hasShinyTask(timestamp: number) {
  return (computeServerDay(timestamp) - 1) % 3 === 0;
}

function formatSeasonLabel(server: CptHedgeServer) {
  if (!server.currentSeason) {
    return "Season 0";
  }

  if (server.isPostSeason) {
    const week = server.currentWeek ?? 0;
    return week > 0
      ? `Season ${server.currentSeason} - Post-season week ${week}`
      : `Season ${server.currentSeason} - Post-season`;
  }

  const week = server.currentWeek ?? 0;
  return week > 0 ? `Season ${server.currentSeason} - Week ${week}` : `Season ${server.currentSeason}`;
}

function parseDataset(source: string) {
  const markerIndex = source.indexOf(DATA_MARKER);

  if (markerIndex < 0) {
    throw new Error("Could not locate the embedded server dataset.");
  }

  const jsonStart = markerIndex + DATA_MARKER.length;
  let jsonEnd = -1;
  let escaped = false;

  for (let index = jsonStart; index < source.length; index += 1) {
    const character = source[index];

    if (!escaped && character === "'") {
      jsonEnd = index;
      break;
    }

    if (!escaped && character === "\\") {
      escaped = true;
      continue;
    }

    escaped = false;
  }

  if (jsonEnd < 0) {
    throw new Error("Could not determine the end of the embedded dataset.");
  }

  const payload = source.slice(jsonStart, jsonEnd);
  const dataset = JSON.parse(payload) as CptHedgeDataset;

  if (!dataset || !Array.isArray(dataset.c)) {
    throw new Error("Embedded dataset has an unexpected shape.");
  }

  return dataset.c;
}

async function fetchChunkSources() {
  const response = await fetch(SERVER_PAGE_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${SERVER_PAGE_URL}: ${response.status}`);
  }

  const html = await response.text();

  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => {
    const url = new URL(match[1], SERVER_PAGE_URL);
    return url.href;
  });
}

export async function scrapeCptHedgeServers() {
  const chunkUrls = await fetchChunkSources();
  const chunkContents = await Promise.all(
    chunkUrls.map(async (url) => {
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        return null;
      }

      return {
        url,
        source: await response.text(),
      };
    }),
  );

  const dataChunk = chunkContents.find(
    (chunk): chunk is { url: string; source: string } =>
      Boolean(chunk && chunk.source.includes("State#1927") && chunk.source.includes(DATA_MARKER)),
  );

  if (!dataChunk) {
    throw new Error("Could not find the server data chunk.");
  }

  const servers = parseDataset(dataChunk.source).map((server) => {
    const numericTimestamp = Number.parseInt(String(server.timestamp), 10);

    return {
      ...server,
      timestamp: numericTimestamp,
      serverDay: computeServerDay(numericTimestamp),
      hasShinyTask: hasShinyTask(numericTimestamp),
      seasonLabel: formatSeasonLabel(server),
    } satisfies ScrapedServer;
  });

  const anchorServer = servers.find((server) => server.id === "1927");

  if (!anchorServer) {
    throw new Error("Server 1927 was not found in the scraped dataset.");
  }

  const sameSeasonServers = servers.filter(
    (server) => server.currentSeason === anchorServer.currentSeason,
  );

  const sameSeasonWithShinyTask = sameSeasonServers.filter((server) => server.hasShinyTask);

  return {
    anchorServer,
    sameSeasonServers,
    sameSeasonWithShinyTask,
    totalServers: servers.length,
  };
}