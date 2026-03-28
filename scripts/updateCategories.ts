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

const ranges = [
  { start: '2026-01-23', end: '2026-01-30' },
  { start: '2026-02-12', end: '2026-02-20' },
  { start: '2026-02-25', end: '2026-02-27' },
  { start: '2026-02-28', end: '2026-03-16' }, 
  { start: '2026-03-19', end: '2026-03-26' },
];

async function main() {
  console.log(`Fetching all transactions to categorize...`);
  
  const res = await fetch(`${url}/rest/v1/transactions?user_id=eq.${USER_ID}&select=id,amount,date`, {
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
  console.log(`Found ${transactions.length} transactions. Applying categories...`);
  
  let updatedCount = 0;
  
  for (const t of transactions) {
    let category = 'personal'; 
    const amount = Number(t.amount);
    
    // Ignore credits, they stay personal
    if (amount >= 0) {
      const isReimbursable = ranges.some(r => t.date >= r.start && t.date <= r.end);
      if (isReimbursable) {
        category = 'reimbursable';
      }
    }

    const updateRes = await fetch(`${url}/rest/v1/transactions?id=eq.${t.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ category })
    });
    
    if (updateRes.ok) {
      updatedCount++;
    } else {
      console.error(`Failed to update ${t.id}`, await updateRes.text());
    }
  }

  console.log(`Successfully updated categories for ${updatedCount} transactions!`);
}

main();
