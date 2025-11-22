import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // get and verify user from bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("User not authenticated");
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      throw new Error("Invalid JSON body");
    }

    const amount = Number(body.amount);
    const method = body.method ?? "manual";
    const details = body.details ?? null;

    if (!amount || amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }

    // load wallet
    const { data: wallet, error: walletError } = await supabase
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (walletError) {
      console.error("Wallet error:", walletError);
      throw new Error("Wallet not found");
    }

    const currentBalance = Number(wallet.balance ?? 0);
    if (currentBalance < amount) {
      throw new Error("Insufficient balance");
    }

    // create withdrawal request
    const { data: withdrawal, error: insertError } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount,
        method,
        details,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert withdrawal error:", insertError);
      throw new Error("Could not create withdrawal request");
    }

    // decrease wallet balance
    const { error: walletUpdateError } = await supabase
      .from("user_wallets")
      .update({ balance: currentBalance - amount })
      .eq("user_id", user.id);

    if (walletUpdateError) {
      console.error("Wallet update error:", walletUpdateError);
      throw new Error("Could not update wallet balance");
    }

    // insert transaction record
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "withdraw_request",
      amount,
      status: "pending",
      stripe_payment_id: null,
    });

    if (txError) {
      console.error("Transaction insert error:", txError);
      // do not throw here, wallet and withdrawal are already correct
    }

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("request-withdrawal error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error in withdrawal";

    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
