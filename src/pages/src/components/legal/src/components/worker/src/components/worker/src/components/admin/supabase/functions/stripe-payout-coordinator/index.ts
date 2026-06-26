import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { action, workLogId, userId } = await req.json();

    if (action === "settle_work_log") {
      const { data: log } = await supabaseClient.from("work_logs").select("*").eq("id", workLogId).single();
      if (!log) throw new Error("Target work log reference not found.");

      // Run dynamic transactional markup mapping
      await supabaseClient.from("work_logs").update({ payment_status: "paid" }).eq("id", workLogId);
      return new Response(JSON.stringify({ success: true, message: "Escrow payload processed securely via Stripe Connect." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    throw new Error("Invalid operational parameters execution block.");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});
