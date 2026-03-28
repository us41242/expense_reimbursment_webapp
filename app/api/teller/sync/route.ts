import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { tellerFetch } from '@/lib/teller';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get all active bank connections
    const { data: connections, error: connError } = await supabase
      .from('bank_connections')
      .select('*');

    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return NextResponse.json({ message: "No bank connections found to sync." });
    }

    let totalSynced = 0;

    console.log(`[Sync] Found ${connections.length} bank connection(s):`, connections.map(c => c.institution_name));

    for (const conn of connections) {
      // 2. Fetch all accounts under this enrollment (checking, savings, credit, etc.)
      let accounts: any[];
      try {
        accounts = await tellerFetch('/accounts', conn.access_token);
        console.log(`[Teller] ${conn.institution_name}: found ${accounts.length} account(s):`, accounts.map((a: any) => `${a.name} (${a.subtype})`));
      } catch (err: any) {
        console.error(`[Teller] Failed to fetch accounts for ${conn.institution_name}:`, err.message);
        continue;
      }

      // 3. For each account, ensure a payment method exists, then sync transactions
      for (const account of accounts) {
        // Build a human-readable name like "Chase Checking" or "Chase Credit Card"
        const accountLabel = account.name || account.subtype || account.type || account.id;
        const pmName = `${conn.institution_name} ${accountLabel}`;

        // Find or create a payment method for this specific account
        let paymentMethodId: string | null = null;
        const { data: existingPm } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('user_id', conn.user_id)
          .eq('name', pmName)
          .maybeSingle();

        if (existingPm) {
          paymentMethodId = existingPm.id;
        } else {
          const { data: newPm, error: pmError } = await supabase
            .from('payment_methods')
            .insert({ user_id: conn.user_id, name: pmName, bank_connection_id: conn.id })
            .select('id')
            .single();

          if (pmError) {
            console.error(`[Supabase] Failed to create payment method for ${pmName}:`, pmError);
          } else {
            paymentMethodId = newPm.id;
          }
        }

        // Fetch transactions for this account
        let transactions: any[];
        try {
          transactions = await tellerFetch(`/accounts/${account.id}/transactions`, conn.access_token);
        } catch (err: any) {
          console.error(`[Teller] Failed to fetch transactions for account ${account.id} (${accountLabel}):`, err.message);
          continue;
        }

        console.log(`[Teller] ${conn.institution_name} / ${accountLabel}: ${transactions.length} transaction(s)`);
        if (!transactions.length) continue;

        const formattedData = transactions.map((t: any) => ({
          user_id: conn.user_id,
          amount: parseFloat(t.amount),
          date: t.date,
          merchant: t.description,
          teller_transaction_id: t.id,
          teller_account_id: t.account_id,
          status: t.status,
          iso_currency_code: 'USD',
          payment_method_id: paymentMethodId,
        }));

        // UPSERT — inserts new rows, skips duplicates by teller_transaction_id
        const { error: upsertError } = await supabase
          .from('transactions')
          .upsert(formattedData, { onConflict: 'teller_transaction_id' });

        if (upsertError) {
          console.error(`[Supabase] Upsert error for account ${account.id}:`, upsertError);
        } else {
          totalSynced += transactions.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete. Processed ${totalSynced} transactions.`,
    });

  } catch (error: any) {
    console.error('[Sync] Route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
