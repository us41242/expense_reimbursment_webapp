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

async function main() {
  const res = await fetch(`${url}/rest/v1/transactions?select=id,amount,date,merchant,payment_methods(name)&limit=100`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  const transactions = await res.json();
  const chkTx = transactions.filter((t: any) => t.payment_methods?.name?.toLowerCase().includes('chk'));
  console.log("Checking transactions:");
  console.dir(chkTx.slice(0, 10), { depth: null });
}

main();
