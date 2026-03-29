import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env.local');
let envFile = '';
try {
  envFile = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  envFile = fs.readFileSync(path.resolve('.env'), 'utf8');
}

const envVars: Record<string, string> = {};
envFile.split('\n').forEach((line: string) => {
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
    const res = await fetch(`${url}/rest/v1/${tableName}?select=id,merchant,amount,category&limit=1000&offset=${offset}`, {
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
  const transactions = await fetchAll('transactions');
  const credits = transactions.filter((t: any) => t.category === 'reimbursable' && (t.amount <= 0 || t.merchant.toLowerCase().includes('payment')));
  console.log(`Found ${credits.length} credits flagged as reimbursable:`);
  console.dir(credits, { depth: null });
}
run();
