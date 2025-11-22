import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } =
      await supabaseClient.auth.getUser(token);

    if (authError || !userData?.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    const { bets } = await req.json();

    if (!Array.isArray(bets) || bets.length === 0) {
      throw new Error("No bets provided");
    }

    // Calculate total stake
    const totalStake = bets.reduce(
      (sum: number, bet: any) => sum + Number(bet.stake || 0),
      0,
    );

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error("Wallet not found");
    }

    if (Number(wallet.balance) < totalStake) {
      throw new Error("Insufficient balance");
    }

    // Deduct from wallet
    const { error: updateError } = await supabaseClient
      .from("user_wallets")
      .update({ balance: wallet.balance - totalStake })
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error("Failed to update wallet");
    }

    // Insert bets
    const { error: betsError } = await supabaseClient
      .from("bets")
      .insert(
        bets.map((bet: any) => {
          // 🔹 Extract pure fixture id from bet.id ("1379082-Chelsea" → "1379082")
          const rawId = String(bet.id ?? "");
          const fixtureId = rawId.split("-")[0]; // safe for both "1379082" and "1379082-Chelsea"

          return {
            user_id: user.id,
            match_id: fixtureId,
            league: bet.league,
            home_team: bet.homeTeam,
            away_team: bet.awayTeam,
            selection: bet.selection,
            odds: bet.odds,
            stake: bet.stake,
            potential_win: bet.stake * bet.odds,
            status: "pending",
          };
        }),
      );

    if (betsError) {
      console.error("betsError:", betsError);
      throw new Error("Failed to place bets");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Bets placed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in place-bet:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
