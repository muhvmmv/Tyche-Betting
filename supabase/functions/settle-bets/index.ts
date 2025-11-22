import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const API_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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
    if (!pendingBets.length) {
      return new Response("No pending bets", { status: 200 });
    }

    console.log(`Found ${pendingBets.length} pending bets`);

    // 2. Loop through each bet → check result
    for (const bet of pendingBets) {
      const matchId = bet.match_id;

      // Fetch match result
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
        { headers: { "x-apisports-key": API_KEY } }
      );
      const json = await res.json();
      const match = json.response?.[0];

      if (!match) continue;

      const status = match.fixture.status.short;

      // Only settle if match is finished
      if (!["FT", "AET", "PEN"].includes(status)) continue;

      const homeScore = match.goals.home;
      const awayScore = match.goals.away;

      let result: "Home" | "Away" | "Draw";
      if (homeScore > awayScore) result = "Home";
      else if (awayScore > homeScore) result = "Away";
      else result = "Draw";

      // 3. Determine win or loss
      const didWin = bet.selection === result;

      // Update bet
      await supabase
        .from("bets")
        .update({
          status: didWin ? "won" : "lost",
          settled_at: new Date().toISOString(),
        })
        .eq("id", bet.id);

      // If lost → continue
      if (!didWin) continue;

      // 4. Credit user wallet
      await supabase.rpc("increment_balance", {
        user_id_input: bet.user_id,
        amount_input: bet.potential_win,
      });

      // 5. Insert transaction
      await supabase.from("transactions").insert({
        user_id: bet.user_id,
        type: "win",
        amount: bet.potential_win,
        status: "completed",
      });
    }

    return new Response("Bet settlement completed", { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Settlement error: " + error.message, { status: 500 });
  }
});
