import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import https from 'https';

// 1. Setup the mTLS Agent using your Vercel Environment Variables
const getTellerAgent = () => {
  const cert = process.env.TELLER_CERT_PEM;
  const key = process.env.TELLER_KEY_PEM;

  if (!cert || !key) {
    console.error("Missing TELLER_CERT_PEM or TELLER_KEY_PEM in environment variables.");
    return null;
  }

  return new https.Agent({ cert, key });
};

export async function GET() {
  try {
    const agent = getTellerAgent();
    if (!agent) return NextResponse.json({ error: "mTLS setup failed" }, { status: 500 });

    // 2. Initialize Supabase with Service Role (to bypass RLS for background sync)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Get all active bank connections
    const { data: connections, error: connError } = await supabase
      .from('bank_connections')
      .select('*');

    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return NextResponse.json({ message: "No bank connections found to sync." });
    }

    let totalSynced = 0;

    // 4. Loop through each bank and fetch transactions
    for (const conn of connections) {
      const authHeader = `Basic ${Buffer.from(conn.access_token + ':').toString('base64')}`;
      
      const response = await fetch('https://api.teller.io/transactions', {
        headers: {
          'Teller-Version': '2019-07-01',
          'Authorization': authHeader
        },
        // @ts-ignore - https agent for server-side fetch
        agent 
      });

      if (!response.ok) {
        console.error(`Failed to fetch for ${conn.institution_name}: ${response.statusText}`);
        continue;
      }

      const transactions = await response.json();

      // 5. Map Teller data to YOUR specific Supabase schema
      const formattedData = transactions.map((t: any) => ({
        user_id: conn.user_id,
        amount: t.amount,
        date: t.date,
        merchant: t.description, // Teller calls it description, you call it merchant
        teller_transaction_id: t.id,
        teller_account_id: t.account_id,
        status: t.status,
        iso_currency_code: t.details?.currency_code || 'USD',
        // We find the payment_method_id by looking for the one linked to this connection
        payment_method_id: null // You can query this separately if needed
      }));

      // 6. UPSERT: This is the magic. It adds new ones and ignores duplicates.
      const { error: upsertError } = await supabase
        .from('transactions')
        .upsert(formattedData, { onConflict: 'teller_transaction_id' });

      if (upsertError) console.error("Upsert Error:", upsertError);
      totalSynced += transactions.length;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync complete. Processed ${totalSynced} transactions.` 
    });

  } catch (error: any) {
    console.error("Sync Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
