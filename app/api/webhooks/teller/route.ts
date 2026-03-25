import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

/**
 * Verify Teller webhook signature
 */
function verifyTellerSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.TELLER_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn("TELLER_WEBHOOK_SECRET is not set. Skipping signature verification in development.");
    return true; 
  }

  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest("hex");

  return expectedSignature === signature;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("Teller-Signature");

    if (!verifyTellerSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signatures" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Teller nests everything inside `payload` and we check for type `transactions.processed`
    if (body.type === "transactions.processed" && body.payload?.transactions) {
      
      // We initialize the Supabase client INSIDE the POST function.
      // This solves the React build error because Next.js evaluates file-level 
      // code during build time where secret ENVs like SERVICE_ROLE_KEY are often missing.
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Missing Supabase configuration.");
      }
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const userId = process.env.TELLER_DEFAULT_USER_ID; 

      if (!userId) {
        console.error("No TELLER_DEFAULT_USER_ID environment variable set.");
        return NextResponse.json(
          { error: "Configuration Error: User ID not mapped." },
          { status: 500 }
        );
      }

      const transactions = body.payload.transactions;
      
      // Loop over the array of transactions
      for (const tx of transactions) {
        const { error } = await supabase
          .from("transactions")
          .upsert(
            {
              teller_id: tx.id,             
              user_id: userId,
              amount: Math.abs(parseFloat(tx.amount)), 
              date: tx.date,
              merchant: tx.description, 
              category: null, 
              reimbursement_billed: false,
              reimbursement_paid: false,
              payment_method_id: null, 
            },
            { 
              onConflict: "teller_id" 
            }
          );

        if (error) {
          console.error(`Supabase insert error for tx ${tx.id}:`, error.message);
        } else {
          console.log(`Successfully synced teller transaction: ${tx.id}`);
        }
      }
    }

    // Always acknowledge the webhook
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
