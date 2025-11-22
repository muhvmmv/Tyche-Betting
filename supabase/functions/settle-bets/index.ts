import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const API_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async () => {
  try {
    console.log("Starting bet settlement...");

    // 1. Get all pending bets
    const { data: pendingBets, error: betsError } = await supabase
      .from("bets")
      .select("*")
      .eq("status", "pending");

    if (betsError) throw betsError;
    if (!pendingBets || pendingBets.length === 0) {
      console.log("No pending bets");
      return new Response("No pending bets", { status: 200 });
    }

    console.log(`Found ${pendingBets.length} pending bets`);

    // 2. Loop through each bet → check result
    for (const bet of pendingBets) {
      if (!bet.match_id) continue;

      // Handle both old style "1379082-Chelsea" and new "1379082"
      const matchId = String(bet.match_id).split("-")[0];

      console.log(`Checking match ${matchId} for bet ${bet.id}`);

      // Fetch match result
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
        { headers: { "x-apisports-key": API_KEY } },
      );

      if (!res.ok) {
        console.error(`API error for match ${matchId}:`, await res.text());
        continue;
      }

      const json = await res.json();
      const match = json.response?.[0];

      if (!match) {
        console.log(`No fixture found for ${matchId}`);
        continue;
      }

      const status = match.fixture?.status?.short;
      const homeScore = match.goals?.home;
      const awayScore = match.goals?.away;

      // Only settle if match is finished
      if (!["FT", "AET", "PEN"].includes(status)) {
        console.log(`Match ${matchId} not finished yet (status: ${status})`);
        continue;
      }

      // ---- NEW WIN LOGIC ----
      const homeName = (match.teams?.home?.name || "").toString().toLowerCase().trim();
      const awayName = (match.teams?.away?.name || "").toString().toLowerCase().trim();

      const selection = (bet.selection || "").toString().toLowerCase().trim();

      const isHomeSelection =
        selection === "home" || selection === homeName;
      const isAwaySelection =
        selection === "away" || selection === awayName;
      const isDrawSelection =
        selection === "draw" || selection === "x";

      let didWin = false;

      if (homeScore > awayScore) {
        didWin = isHomeSelection;
      } else if (awayScore > homeScore) {
        didWin = isAwaySelection;
      } else {
        didWin = isDrawSelection;
      }
      // ---- END NEW WIN LOGIC ----

      console.log(
        `Bet ${bet.id}: selection=${bet.selection}, home=${homeName}, away=${awayName}, score=${homeScore}-${awayScore}, didWin=${didWin}`,
      );

      // Update bet
      const { error: updateError } = await supabase
        .from("bets")
        .update({
          status: didWin ? "won" : "lost",
          settled_at: new Date().toISOString(),
        })
        .eq("id", bet.id);

      if (updateError) {
        console.error("Failed to update bet:", updateError);
        continue;
      }

      // If lost → nothing else to do
      if (!didWin) continue;

      // 4. Credit user wallet
      const { error: walletError } = await supabase.rpc("increment_balance", {
        user_id_input: bet.user_id,
        amount_input: bet.potential_win,
      });

      if (walletError) {
        console.error("Failed to increment wallet:", walletError);
        continue;
      }

      // 5. Insert transaction
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: bet.user_id,
        type: "win",
        amount: bet.potential_win,
        status: "completed",
      });

      if (txError) {
        console.error("Failed to insert win transaction:", txError);
      }
    }

    return new Response("Bet settlement completed", { status: 200 });
  } catch (error: any) {
    console.error("Settlement error:", error);
    return new Response("Settlement error: " + error.message, { status: 500 });
  }
});
