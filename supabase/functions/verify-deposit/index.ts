import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const userId = session.metadata?.user_id;
    const amount = parseFloat(session.metadata?.amount || "0");

    if (!userId || !amount) {
      throw new Error("Invalid session metadata");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current balanc
    const { data: wallet } = await supabaseClient
      .from("user_wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const currentBalance = wallet?.balance || 0;
    const newBalance = currentBalance + amount;

    // Update wallet
    await supabaseClient
      .from("user_wallets")
      .update({ balance: newBalance })
      .eq("user_id", userId);

    // Record transaction
    await supabaseClient
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount: amount,
        status: "completed",
        stripe_payment_id: session.payment_intent
      });

    return new Response(
      JSON.stringify({ success: true, amount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
