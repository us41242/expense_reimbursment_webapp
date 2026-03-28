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
  const res = await fetch(`${url}/rest/v1/transactions?merchant=ilike.*UBER*&select=id,amount,date,merchant,payment_methods(name)&limit=10`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  const transactions = await res.json();
  console.log("Uber transactions:");
  console.dir(transactions, { depth: null });
  
  const res2 = await fetch(`${url}/rest/v1/transactions?merchant=ilike.*STARBUCKS*&select=id,amount,date,merchant,payment_methods(name)&limit=10`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  const transactions2 = await res2.json();
  console.log("Starbucks transactions:");
  console.dir(transactions2, { depth: null });
}

main();
