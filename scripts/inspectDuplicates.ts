import * as fs from 'fs';
import * as path from 'path';

// Parse .env manually
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

if (!url || !key) {
  console.error("Missing SUPABASE URL or KEY");
  process.exit(1);
}

const USER_ID = '2d71f2fb-d40b-4b29-89f3-f7e61ae8ce52';

async function main() {
  const res = await fetch(`${url}/rest/v1/transactions?user_id=eq.${USER_ID}&select=amount,date,merchant,teller_transaction_id,teller_account_id,payment_methods(name)&limit=500`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  if (!res.ok) {
    console.error("Error fetching transactions:", await res.text());
    return;
  }
  
  const transactions = await res.json();
  console.log(`Fetched ${transactions.length} transactions total.`);
  
  // Find duplicates by date and amount
  const map = new Map<string, any[]>();
  for (const t of transactions) {
    const key = `${t.date}|${t.amount}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }

  const duplicates = Array.from(map.values()).filter(group => group.length > 1);
  console.log(`Found ${duplicates.length} duplicate groups.`);
  
  if (duplicates.length > 0) {
    console.log("Sample duplicates:");
    console.dir(duplicates.slice(0, 3), { depth: null });
  }
}

main();
