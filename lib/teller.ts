import fs from 'fs';
import https from 'https';

const getTellerCerts = () => {
    // Use raw PEM strings (Vercel env vars) or fall back to file paths (local dev)
    const cert = process.env.TELLER_CERT_PEM ||
        (process.env.TELLER_CERT_PATH ? fs.readFileSync(process.env.TELLER_CERT_PATH, 'utf8') : null);
    const key = process.env.TELLER_KEY_PEM ||
        (process.env.TELLER_KEY_PATH ? fs.readFileSync(process.env.TELLER_KEY_PATH, 'utf8') : null);

    if (!cert || !key) throw new Error("Teller mTLS certificates are missing. Set TELLER_CERT_PEM and TELLER_KEY_PEM (or the _PATH variants) in your .env.local.");

    return { cert: cert.toString(), key: key.toString() };
};

// Uses node:https directly so mTLS works reliably — native fetch ignores the agent option.
export const tellerFetch = (endpoint: string, token: string): Promise<any> => {
    const { cert, key } = getTellerCerts();
    const authHeader = `Basic ${Buffer.from(token + ':').toString('base64')}`;

    return new Promise((resolve, reject) => {
        const options: https.RequestOptions = {
            hostname: 'api.teller.io',
            path: endpoint,
            method: 'GET',
            headers: {
                'Teller-Version': '2020-10-12',
                'Authorization': authHeader,
            },
            cert,
            key,
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch {
                        reject(new Error(`Teller returned non-JSON: ${body}`));
                    }
                } else {
                    reject(new Error(`Teller API ${res.statusCode} on ${endpoint}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
};