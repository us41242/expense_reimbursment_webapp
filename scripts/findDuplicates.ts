import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: allTxs } = await supabase.from('transactions').select('*');
  let duplicateGroups = [];
  
  // Group by date + amount + merchant
  const map = new Map();
  for (const t of allTxs) {
    const key = `${t.date}_${t.amount}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  
  for (const [key, txs] of map.entries()) {
    if (txs.length > 1) {
      if (txs.some(t => t.teller_transaction_id) && txs.some(t => !t.teller_transaction_id)) {
        duplicateGroups.push(txs);
      }
    }
  }

  console.log(`Found ${duplicateGroups.length} duplicate groups (same date and amount, mix of TELLER and CSV).`);
  for (let i = 0; i < Math.min(duplicateGroups.length, 10); i++) {
    console.log(`\nGroup ${i+1}:`);
    duplicateGroups[i].forEach((t: any) => {
      console.log(`  - [${t.id}] (${t.teller_transaction_id ? 'TELLER' : 'CSV'}) ${t.date} | ${t.amount} | ${t.merchant} | Cat: ${t.category}`);
    });
  }
}
run();
