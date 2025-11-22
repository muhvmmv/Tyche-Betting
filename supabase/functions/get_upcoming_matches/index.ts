import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LEAGUES = [39, 140, 78, 135, 61, 2]; // EPL, La Liga, Bundesliga, Serie A, Ligue 1, UCL
const SEASON = 2025; // Current season in API-Football terms

const LIVE_STATUSES = [
  "1H",
  "2H",
  "HT",
  "ET",
  "BT",
  "P",
  "SUSP",
  "INT",
  "LIVE",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiFootballKey = Deno.env.get("API_FOOTBALL_KEY");

    if (!apiFootballKey) {
      console.error("API_FOOTBALL_KEY not configured");
      return new Response(
        JSON.stringify({ fixtures: [], error: "API_FOOTBALL_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers = {
      "x-apisports-key": apiFootballKey,
    };

    // Calculate date range: today + 6 days
    const today = new Date();
    const toDate = new Date(today);
    toDate.setDate(today.getDate() + 6);

    const from = today.toISOString().split("T")[0];
    const to = toDate.toISOString().split("T")[0];

    console.log(`Fetching fixtures from ${from} to ${to} for season ${SEASON}`);

    const baseFixturesUrl = "https://v3.football.api-sports.io/fixtures";

    // Helper: fetch fixtures for one league with range, then fallback to next=20
    async function fetchLeagueFixtures(leagueId: number) {
      try {
        // 1) try date range (from / to)
        const urlRange =
          `${baseFixturesUrl}?league=${leagueId}&season=${SEASON}&from=${from}&to=${to}`;
        console.log(`League ${leagueId}: range URL = ${urlRange}`);

        let res = await fetch(urlRange, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error(
            `Error fetching league ${leagueId} (range). Status ${res.status}: ${text}`,
          );
          // if range call fails, still attempt next=20
        }

        let json: any = res.ok ? await res.json() : { response: [] };
        let fixtures: any[] = Array.isArray(json.response) ? json.response : [];

        console.log(`League ${leagueId}: range fixtures = ${fixtures.length}`);

        // If range returned results, use them
        if (fixtures.length > 0) {
          return fixtures;
        }

        // 2) fallback: use next=20 so we always have something
        const urlNext =
          `${baseFixturesUrl}?league=${leagueId}&season=${SEASON}&next=20`;
        console.log(`League ${leagueId}: fallback URL = ${urlNext}`);

        res = await fetch(urlNext, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error(
            `Error fetching league ${leagueId} (next). Status ${res.status}: ${text}`,
          );
          return [];
        }

        json = await res.json();
        fixtures = Array.isArray(json.response) ? json.response : [];

        console.log(`League ${leagueId}: fallback fixtures = ${fixtures.length}`);

        return fixtures;
      } catch (err) {
        console.error(`Error fetching fixtures for league ${leagueId}:`, err);
        return [];
      }
    }

    // Fetch fixtures for all leagues
    const leagueResults = await Promise.all(LEAGUES.map(fetchLeagueFixtures));
    const allFixturesRaw = leagueResults.flat();

    console.log(`Total raw fixtures fetched (with duplicates): ${allFixturesRaw.length}`);

    // Remove duplicates by fixture ID
    const uniqueFixtures = Array.from(
      new Map(allFixturesRaw.map((f: any) => [f.fixture?.id, f])).values(),
    );

    console.log(`Unique fixtures after dedupe: ${uniqueFixtures.length}`);

    // Identify live fixtures
    const liveFixtures = uniqueFixtures.filter((f: any) =>
      LIVE_STATUSES.includes(f.fixture?.status?.short)
    );

    console.log(`Live fixtures: ${liveFixtures.length}`);

    // Fetch live odds for live fixtures
    const oddsBaseUrl = "https://v3.football.api-sports.io/odds/live";

    const oddsPromises = liveFixtures.map((fixture: any) =>
      (async () => {
        const fixtureId = fixture.fixture?.id;
        if (!fixtureId) {
          return { fixtureId: null, odds: [] };
        }

        try {
          const url = `${oddsBaseUrl}?fixture=${fixtureId}`;
          const res = await fetch(url, { headers });

          if (!res.ok) {
            const text = await res.text();
            console.error(
              `Error fetching odds for fixture ${fixtureId}. Status ${res.status}: ${text}`,
            );
            return { fixtureId, odds: [] };
          }

          const data = await res.json();
          const matchWinner =
            data.response?.[0]?.bookmakers?.[0]?.bets?.find(
              (b: any) => b.name === "Match Winner",
            )?.values || [];

          return { fixtureId, odds: matchWinner };
        } catch (err) {
          console.error(`Error fetching odds for fixture ${fixtureId}:`, err);
          return { fixtureId, odds: [] };
        }
      })()
    );

    const oddsResults = await Promise.all(oddsPromises);
    const oddsMap = new Map<number, any[]>(
      oddsResults
        .filter((o) => o.fixtureId != null)
        .map((o) => [o.fixtureId as number, o.odds]),
    );

    // Process fixtures and attach odds (live odds where available, random for others)
    const processedFixtures = uniqueFixtures.map((fixture: any) => {
      const fixtureId = fixture.fixture?.id as number | undefined;
      const homeTeam = fixture.teams?.home?.name || "Home";
      const awayTeam = fixture.teams?.away?.name || "Away";
      const statusShort = fixture.fixture?.status?.short;
      const isLive = LIVE_STATUSES.includes(statusShort);

      let homeOdds = 2.0;
      let drawOdds = 3.2;
      let awayOdds = 3.5;

      if (isLive && fixtureId && oddsMap.has(fixtureId)) {
        const liveOdds = oddsMap.get(fixtureId);
        if (liveOdds && liveOdds.length >= 3) {
          homeOdds = parseFloat(
            liveOdds.find((o: any) => o.value === "Home")?.odd || homeOdds,
          );
          drawOdds = parseFloat(
            liveOdds.find((o: any) => o.value === "Draw")?.odd || drawOdds,
          );
          awayOdds = parseFloat(
            liveOdds.find((o: any) => o.value === "Away")?.odd || awayOdds,
          );
        }
      } else {
        // Generate realistic pre-match odds (still random but shaped)
        const rand = Math.random();
        if (rand < 0.33) {
          homeOdds = 1.6 + Math.random() * 0.8;
          drawOdds = 3.4 + Math.random() * 0.8;
          awayOdds = 4.5 + Math.random() * 2.5;
        } else if (rand < 0.66) {
          homeOdds = 2.4 + Math.random() * 1.0;
          drawOdds = 3.1 + Math.random() * 0.6;
          awayOdds = 2.7 + Math.random() * 1.0;
        } else {
          homeOdds = 4.5 + Math.random() * 2.5;
          drawOdds = 3.4 + Math.random() * 0.8;
          awayOdds = 1.6 + Math.random() * 0.8;
        }
      }

      const matchDate = new Date(fixture.fixture?.date);
      let timeDisplay: string;

      if (isLive) {
        const elapsed = fixture.fixture?.status?.elapsed || 0;
        timeDisplay = `${elapsed}'`;
      } else {
        const timeString = matchDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const dateString = matchDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        timeDisplay = `${dateString} ${timeString}`;
      }

      return {
        id: fixtureId?.toString() || Math.random().toString(),
        league: fixture.league?.name || "Unknown League",
        homeTeam,
        awayTeam,
        homeOdds: Number(homeOdds.toFixed(2)),
        drawOdds: Number(drawOdds.toFixed(2)),
        awayOdds: Number(awayOdds.toFixed(2)),
        time: timeDisplay,
        isLive,
        homeScore: fixture.goals?.home ?? 0,
        awayScore: fixture.goals?.away ?? 0,
        highVolume: Math.random() > 0.5,
        homeInitials: homeTeam.substring(0, 3).toUpperCase(),
        awayInitials: awayTeam.substring(0, 3).toUpperCase(),
      };
    });

    console.log(`Returning ${processedFixtures.length} fixtures`);

    return new Response(
      JSON.stringify({ fixtures: processedFixtures }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in get_upcoming_matches:", error);
    return new Response(
      JSON.stringify({
        fixtures: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
