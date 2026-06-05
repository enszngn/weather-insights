DROP TABLE if EXISTS visits;

CREATE TABLE visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT,
    ip TEXT NOT NULL, /* client IP address (required field) */
    city TEXT,
    country TEXT,
    lat REAL,
    lon REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);