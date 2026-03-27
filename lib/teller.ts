import fs from 'fs';
import https from 'https';

export const getTellerAgent = () => {
    // Use raw PEM strings (Vercel) or fall back to file paths (Local Mac mini)
    const cert = process.env.TELLER_CERT_PEM ||
        (process.env.TELLER_CERT_PATH ? fs.readFileSync(process.env.TELLER_CERT_PATH) : null);
    const key = process.env.TELLER_KEY_PEM ||
        (process.env.TELLER_KEY_PATH ? fs.readFileSync(process.env.TELLER_KEY_PATH) : null);

    if (!cert || !key) throw new Error("Teller mTLS certificates are missing.");

    return new https.Agent({ cert, key });
};

export const tellerFetch = async (endpoint: string, token: string) => {
    const agent = getTellerAgent();
    const response = await fetch(`https://api.teller.io${endpoint}`, {
        headers: {
            'Teller-Version': '2019-07-01',
            'Authorization': `Basic ${Buffer.from(token + ':').toString('base64')}`
        },
        // @ts-ignore - node-fetch / undici agent support
        agent
    });
    return response.json();
};