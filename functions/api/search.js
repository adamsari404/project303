// File: functions/api/search.js

export async function onRequest(context) {
    // 1. Ambil kredensial rahasia dari Environment Variables
    const API_KEY = context.env.GOOGLE_API_KEY;
    const SHEET_ID = context.env.GOOGLE_SHEET_ID;

    // 2. Tangkap parameter 'sheet' dari URL yang dikirim oleh Frontend
    const { searchParams } = new URL(context.request.url);
    const sheetName = searchParams.get('sheet');

    // 3. Validasi: Jika nama sheet tidak dikirim, kembalikan Error 400
    if (!sheetName) {
        return new Response(JSON.stringify({ error: "Parameter nama sheet tidak ditemukan." }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 4. Bangun URL Asli ke Google Sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`;

    try {
        // 5. Minta data ke Google secara tertutup di server Cloudflare
        const response = await fetch(url);
        const data = await response.json();

        // 6. Kembalikan data tersebut ke Browser (Client)
        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                // Opsional: Hindari cache karena ini fitur pencarian real-time
                'Cache-Control': 'no-cache' 
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}