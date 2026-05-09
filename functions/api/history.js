// File: functions/api/history.js

export async function onRequest(context) {
    // Ambil data dari Environment Variables (Secret)
    // Pastikan Anda memasukkan variabel ini di dashboard Cloudflare
    const CLIENT_EMAIL = context.env.G_CLIENT_EMAIL;
    const PRIVATE_KEY = context.env.G_PRIVATE_KEY.replace(/\\n/g, '\n'); // Fix format newline
    const SHEET_ID = context.env.GOOGLE_SHEET_ID;
    const SHEET_NAME = 'HISTORY_JUARA';

    try {
        // 1. Dapatkan Access Token dari Google OAuth
        const accessToken = await getGoogleAccessToken(CLIENT_EMAIL, PRIVATE_KEY);

        // 2. Fetch data menggunakan Bearer Token
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

// Fungsi Helper untuk generate JWT Token tanpa library luar
async function getGoogleAccessToken(email, key) {
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const payload = btoa(JSON.stringify({
        iss: email,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: "https://oauth2.googleapis.com/token",
        exp: exp,
        iat: iat
    }));

    const unsignedJwt = `${header}.${payload}`;
    const binaryKey = str2ab(atob(key.split("-----BEGIN PRIVATE KEY-----")[1].split("-----END PRIVATE KEY-----")[0].replace(/\s/g, "")));
    
    const signatureKey = await crypto.subtle.importKey(
        "pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5", signatureKey, new TextEncoder().encode(unsignedJwt)
    );

    const signedJwt = `${unsignedJwt}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const tokenData = await res.json();
    return tokenData.access_token;
}

function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) bufView[i] = str.charCodeAt(i);
    return buf;
}