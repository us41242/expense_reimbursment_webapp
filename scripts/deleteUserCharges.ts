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

const REDUNDANT_ACCOUNT_ID = 'acc_pq9oji0e1d8pirp3gq000';

async function main() {
  console.log(`Deleting all redundant transactions for teller_account_id: ${REDUNDANT_ACCOUNT_ID}`);
  
  const res = await fetch(`${url}/rest/v1/transactions?teller_account_id=eq.${REDUNDANT_ACCOUNT_ID}`, {
    method: 'DELETE',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  if (!res.ok) {
    console.error("Error deleting redundant transactions:", await res.text());
  } else {
    console.log("Successfully deleted redundant employee card transactions!");
  }
}

main();
