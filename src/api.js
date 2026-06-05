export async function onRequestPost(context) {
    // 'context' parameter contains Cloudflare environment, request metadata, and bindings.
    const { request, env } = context;

    try {
        // 1. Retrieve the client IP address.
        const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";

        // 2. Extract geo metadata from request.cf (fallback to defaults for local development).
        const cf = request.cf || {};
        const city = cf.city || "Istanbul";
        const country = cf.country || "Turkey";
        const lat = cf.latitude ? parseFloat(cf.latitude) : 41.0082;
        const lon = cf.longitude ? parseFloat(cf.longitude) : 28.9784;
        const cityName = city;

        // 3. Retrieve the D1 database binding from wrangler.jsonc or fall back to default "DB".
        const db = env.weatherApp_db || env.DB;

        // 4. Ensure D1 database instance is connected.
        if (!db) {
            return new Response(
                JSON.stringify({ error: "Database connection not found (weatherApp_db or DB)." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // 5. Create a prepared statement to prevent SQL injection.
        const stmt = db.prepare(
            `INSERT INTO visits (city_name, ip, city, country, lat, lon) 
             VALUES (?, ?, ?, ?, ?, ?)`
        );

        // 6. Bind parameters and run the insert statement.
        const result = await stmt.bind(
            cityName,
            ip,
            city,
            country,
            lat,
            lon
        ).run();

        // 7. Return success status and D1 database response as JSON.
        return new Response(
            JSON.stringify({
                success: true,
                message: "Visit logged successfully.",
                result: result
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (error) {
        // 8. Catch and log any API execution error.
        console.error("API Error (details):", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
}

export async function onRequestGet(context) {
    const { request, env } = context;

    try {
        // 1. Authentication Check (requires Authorization: Bearer <password> header).
        const authHeader = request.headers.get("Authorization");
        const password = authHeader ? authHeader.replace("Bearer ", "") : "";
        const expectedPassword = env.STATS_PASSWORD || "admin123";

        if (password !== expectedPassword) {
            return new Response(
                JSON.stringify({ success: false, error: "Unauthorized access (invalid password)" }),
                { 
                    status: 401, 
                    headers: { "Content-Type": "application/json" } 
                }
            );
        }

        // 2. Ensure D1 database instance is connected.
        const db = env.weatherApp_db || env.DB;
        if (!db) {
            return new Response(
                JSON.stringify({ error: "Database connection not found (weatherApp_db or DB)." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // 3. Line Chart Data: Daily visitor count for the last 7 days.
        const chartDataQuery = await db.prepare(
            `SELECT date(created_at) as date, COUNT(*) as count 
             FROM visits 
             WHERE created_at >= datetime('now', '-7 days')
             GROUP BY date(created_at)
             ORDER BY date(created_at) ASC`
        ).all();

        // 4. Map Pin Data: Distinct visit coordinates and total visits per location.
        const pinsQuery = await db.prepare(
            `SELECT city, country, lat, lon, COUNT(*) as visits 
             FROM visits 
             WHERE lat IS NOT NULL AND lon IS NOT NULL
             GROUP BY city, country, lat, lon
             ORDER BY visits DESC`
        ).all();

        // 5. Table Data: Details of the last 100 visits.
        const tableQuery = await db.prepare(
            `SELECT id, city_name, ip, city, country, lat, lon, created_at 
             FROM visits 
             ORDER BY created_at DESC 
             LIMIT 100`
        ).all();

        // 6. Merge results and return as JSON.
        return new Response(
            JSON.stringify({
                success: true,
                chartData: chartDataQuery.results || [],
                pins: pinsQuery.results || [],
                visits: tableQuery.results || []
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (error) {
        console.error("GET API Error (details):", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
}
