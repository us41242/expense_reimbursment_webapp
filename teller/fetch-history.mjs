import fs from "fs";
import https from "https";
import os from "os";
import { createClient } from "@supabase/supabase-js";

// Ensure Supabase variables are loaded
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_USER_ID = process.env.TELLER_DEFAULT_USER_ID;

if (!SUPABASE_URL || !SUPABASE_KEY || !DEFAULT_USER_ID) {
  console.error("❌ The script is missing one or more required environment variables in your .env.local file!");
  if (!SUPABASE_URL) console.error("   - Missing: NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_KEY) console.error("   - Missing: SUPABASE_SERVICE_ROLE_KEY (Get this from Supabase Dashboard -> Project Settings -> API)");
  if (!DEFAULT_USER_ID) console.error("   - Missing: TELLER_DEFAULT_USER_ID (Your user UID from Supabase -> Authentication -> Users)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 🚨 REQUIRED SETUP: PASTE YOUR TOKEN HERE
// ==========================================
const ACCESS_TOKEN = "token_hwqan2mversqomwmqtm242p4xa";

async function fetchTeller(path) {
  return new Promise((resolve, reject) => {
    // Teller requires mTLS to fetch transactions securely via their REST API
    const options = {
      hostname: "api.teller.io",
      port: 443,
      path,
      method: "GET",
      auth: `${ACCESS_TOKEN}:`, // Access tokens are passed as the HTTP Basic Auth username
      cert: fs.readFileSync(`${os.homedir()}/.teller_keys/certificate.pem`),
      key: fs.readFileSync(`${os.homedir()}/.teller_keys/private_key.pem`),
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) { reject(e); }
      });
    });

    req.on("error", (e) => reject(e));
    req.end();
  });
}

async function main() {
  if (ACCESS_TOKEN === "YOUR_TELLER_ACCESS_TOKEN_HERE") {
    console.error("❌ You must replace ACCESS_TOKEN inside fetch-history.mjs with your real Teller Connect token!");
    process.exit(1);
  }

  if (!fs.existsSync(`${os.homedir()}/.teller_keys/certificate.pem`)) {
    console.error(`❌ Missing mTLS certificate.pem! Checked at: ${os.homedir()}/.teller_keys/certificate.pem`);
    process.exit(1);
  }

  console.log("Fetching accounts from Teller...");
  const accounts = await fetchTeller("/accounts");

  if (accounts.error) {
    console.error("❌ Teller Auth Error:", accounts.error);
    process.exit(1);
  }

  console.log(`Found ${accounts.length} linked accounts. Pulling fresh data starting Jan 1, 2026...\n`);

  for (const account of accounts) {
    console.log(`Syncing Account: ${account.name} (*${account.last4})`);

    let hasMore = true;
    let fromId = null;
    let fetchedCount = 0;

    // Teller uses cursor pagination. We loop over pages of 250 until we hit Jan 1, 2026.
    while (hasMore) {
      const url = fromId
        ? `/accounts/${account.id}/transactions?count=250&from_id=${fromId}`
        : `/accounts/${account.id}/transactions?count=250`;

      const txs = await fetchTeller(url);

      if (!txs || txs.length === 0 || txs.error) {
        hasMore = false;
        break;
      }

      for (const tx of txs) {
        // Stop aggressively pushing transactions if we hit dates earlier than 01-01-2026
        if (new Date(tx.date) < new Date("2026-01-01")) {
          console.log(`  -> Reached Jan 1, 2026 cutoff. Stopping pagination for this account.`);
          hasMore = false;
          break;
        }

        fetchedCount++;
        const txAmount = Math.abs(parseFloat(tx.amount));

        await supabase
          .from("transactions")
          .upsert({
            teller_id: tx.id,
            user_id: DEFAULT_USER_ID,
            amount: txAmount,
            date: tx.date,
            merchant: tx.description,
            category: null,
            reimbursement_billed: false,
            reimbursement_paid: false,
            payment_method_id: null,
          }, { onConflict: "teller_id" });
      }

      // If we got exactly 250, grab the ID of the last one to use as the baseline cursor for the next fetch page
      if (hasMore && txs.length === 250) {
        fromId = txs[txs.length - 1].id;
      } else {
        hasMore = false; // We reached the end of their complete historical ledge
      }
    }
    console.log(`✅ Successfully synced ${fetchedCount} transactions since Jan 1, 2026 for ${account.name}.\n`);
  }
}

main().catch(console.error);
