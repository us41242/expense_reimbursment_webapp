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

        // Skip the individual employee card to prevent duplicate syncing
        if (pmName.toLowerCase().includes('altinay')) {
          console.log(`[Teller] Skipping redundant employee card: ${pmName}`);
          continue;
        }

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

        const tellerIds = transactions.map((t: any) => t.id);
        const { data: existingTxs } = await supabase
          .from('transactions')
          .select('teller_transaction_id, category, notes, receiptImageUrl')
          .in('teller_transaction_id', tellerIds);
        
        const existingMap = new Map(existingTxs?.map(t => [t.teller_transaction_id, t]) || []);

        const formattedData = transactions.map((t: any) => {
          const amount = parseFloat(t.amount);
          const existing = existingMap.get(t.id);
          const pmName = (account.name || '').toLowerCase();
          
          let category: string | null = existing?.category || 'personal'; // Preserve existing or default
          
          // Only auto-categorize if the transaction lacks a pre-existing category in our DB
          if (!existing?.category) {
            const isDepository = pmName.includes('chk') || pmName.includes('debit') || pmName.includes('sav');
            const isCredit = isDepository ? amount > 0 : amount < 0;

            const desc = t.description.toLowerCase();
            const isTransfer = 
              desc.includes('transfer') || 
              desc.includes('payment to') || 
              desc.includes('payment from') || 
              desc.includes('payment thank you') ||
              desc.includes('zelle') ||
              desc.includes('credit card') ||
              desc.startsWith('payout from');

            // If it is an expense AND NOT a bank transfer, check if it falls in the reimbursable dates
            if (!isCredit && !isTransfer) {
              const ranges = [
                { start: '2026-01-23', end: '2026-01-30' },
                { start: '2026-02-12', end: '2026-02-20' },
                { start: '2026-02-25', end: '2026-02-27' },
                { start: '2026-02-28', end: '2026-03-16' },
                { start: '2026-03-19', end: '2026-03-26' },
              ];
              
              const isReimbursable = ranges.some(r => t.date >= r.start && t.date <= r.end);
              if (isReimbursable) {
                category = 'reimbursable';
              }
            }
          }

          return {
            user_id: conn.user_id,
            amount,
            date: t.date,
            merchant: t.description,
            teller_transaction_id: t.id,
            teller_account_id: t.account_id,
            status: t.status,
            category,
            iso_currency_code: 'USD',
            payment_method_id: paymentMethodId,
            notes: existing?.notes ?? null,
            receiptImageUrl: existing?.receiptImageUrl ?? null,
          };
        });

        // UPSERT — inserts new rows, overwrites with same values to preserve existing metadata
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
