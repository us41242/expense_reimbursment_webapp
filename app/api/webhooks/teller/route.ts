import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// 1. Initialize Supabase Admin Client
// We use the Service Role Key here to bypass Row Level Security 
// since this is a server-to-server request from Teller (no user is "logged in").
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify Teller webhook signature
 * Teller passes a `Teller-Signature` header which is the HMAC-SHA256 
 * of the raw body payload using your Teller endpoint secret.
 */
function verifyTellerSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.TELLER_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn("TELLER_WEBHOOK_SECRET is not set. Skipping signature verification in development.");
    return true; // You should strictly return false in production if no secret is set!
  }

  if (!signature) return false;

  // The secret from Teller is usually a base-64 encoded string, but sometimes raw text.
  // Standard HMAC SHA256 validation:
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest("hex");

  // In real life, use crypto.timingSafeEqual for security against timing attacks
  return expectedSignature === signature;
}

export async function POST(request: Request) {
  try {
    // Read the raw body text for signature validation
    const rawBody = await request.text();
    const signature = request.headers.get("Teller-Signature");

    // 2. Verify the request is actually from Teller
    if (!verifyTellerSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signatures" }, { status: 401 });
    }

    // Parse the JSON payload
    const payload = JSON.parse(rawBody);

    // 3. Handle specific Teller Webhook Events
    // Teller fires `transaction.created` and `transaction.updated` events.
    if (payload.type === "transaction.created" || payload.type === "transaction.updated") {
      const tx = payload.transaction;

      // Ensure we have a user_id to attach this to. 
      // For personal apps, you can hardcode this in an env var: TELLER_DEFAULT_USER_ID
      // Alternatively, look up the `user_id` from a custom table like `payment_methods` using `tx.account_id`
      const userId = process.env.TELLER_DEFAULT_USER_ID; 

      if (!userId) {
        console.error("No TELLER_DEFAULT_USER_ID environment variable set.");
        return NextResponse.json(
          { error: "Configuration Error: User ID not mapped." },
          { status: 500 }
        );
      }

      // 4. Upsert (Insert or Update) into our Supabase `transactions` table.
      // We are going to use the `id` from Teller as a unique identifier.
      // NOTE: Make sure you add a `teller_id` column to your database with a UNIQUE constraint to avoid duplicates!
      const { error } = await supabase
        .from("transactions")
        .upsert(
          {
            // You must add `teller_id` as a column in your DB!
            teller_id: tx.id,             
            user_id: userId,
            // Teller amount format: could be string or float. Convert to number.
            // Teller's amount is negative for expenses, positive for income? Wait, Teller amount is usually a string representing the exact format.
            // Adjust based on your preferred logic. We are taking absolute value if it's an expense app.
            amount: Math.abs(parseFloat(tx.amount)), 
            date: tx.date, // Returns YYYY-MM-DD
            merchant: tx.description, 
            category: null, // Leaves it uncategorized
            reimbursement_billed: false,
            reimbursement_paid: false,
            // Set any default payment method ID if you wish, or leave null to process manually
            payment_method_id: null, 
          },
          { 
            onConflict: "teller_id" // prevents duplicate insertions
          }
        );

      if (error) {
        console.error("Supabase insert error:", error);
        return NextResponse.json(
          { error: "Database error inserting transaction." },
          { status: 500 }
        );
      }

      console.log(`Successfully synced teller transaction: ${tx.id}`);
    }

    // Acknowledge the webhook
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
