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

    if (body.type === "transactions.processed" && body.payload?.transactions) {
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
      
      for (const tx of transactions) {
        const txAmount = Math.abs(parseFloat(tx.amount));
        const txDate = tx.date;

        // 1. Check if a transaction with this exact teller_id is already in the DB
        const { data: existingById } = await supabase
          .from("transactions")
          .select("id")
          .eq("teller_id", tx.id)
          .maybeSingle();

        if (existingById) {
          // Already synced this exact Teller transaction, we can skip it to avoid overwriting user edits.
          console.log(`Transaction ${tx.id} already exists (synced previously). Skipping.`);
          continue;
        }

        // 2. Check if there is an OLD historical transaction (e.g. from a CSV upload) 
        // that lacks a teller_id, but matches the EXACT Date and Amount.
        const { data: possibleMatches, error: matchError } = await supabase
          .from("transactions")
          .select("id")
          .is("teller_id", null) 
          .eq("date", txDate)
          .eq("amount", txAmount);

        if (possibleMatches && possibleMatches.length > 0) {
          // We found a historical transaction that matches!
          // Link it by updating the old row with the new teller_id so it never duplicates again.
          const matchToLink = possibleMatches[0];

          const { error: updateError } = await supabase
            .from("transactions")
            .update({ teller_id: tx.id })
            .eq("id", matchToLink.id);

          if (updateError) {
            console.error(`Failed to link historical tx ${matchToLink.id} to Teller:`, updateError.message);
          } else {
            console.log(`Linked historical transaction ${matchToLink.id} to Teller ${tx.id}`);
          }
          continue; 
        }

        // 3. If it has no teller_id match and no historical match, it's completely NEW!
        const { error: insertError } = await supabase
          .from("transactions")
          .insert({
            teller_id: tx.id,             
            user_id: userId,
            amount: txAmount, 
            date: txDate,
            merchant: tx.description, 
            category: null, 
            reimbursement_billed: false,
            reimbursement_paid: false,
            payment_method_id: null, 
          });

        if (insertError) {
          console.error(`Supabase insert error for tx ${tx.id}:`, insertError.message);
        } else {
          console.log(`Successfully inserted brand new teller transaction: ${tx.id}`);
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
