import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};

envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^"/, '').replace(/"$/, '');
    }
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'] || '';
const key = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

async function fetchAll(tableName: string) {
  let all: any[] = [];
  let offset = 0;
  while(true) {
    const res = await fetch(`${url}/rest/v1/${tableName}?select=*&limit=1000&offset=${offset}`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data = await res.json();
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += data.length;
  }
  return all;
}

async function run() {
  const allTxs = await fetchAll('transactions');
  let duplicateGroups: any[][] = [];
  
  // Group by date + amount
  const map = new Map();
  for (const t of allTxs) {
    // Only group roughly matching amounts
    const key = `${t.date}_${Math.abs(t.amount).toFixed(2)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  
  for (const [key, txs] of map.entries()) {
    if (txs.length > 1) {
      if (txs.some((t: any) => t.teller_transaction_id) && txs.some((t: any) => !t.teller_transaction_id)) {
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
