import sqlite3

c = sqlite3.connect("backend/data/komandorr.db")
c.row_factory = sqlite3.Row

print("--- ALL SERVICES ---")
for r in c.execute("SELECT id, name, url, status FROM services ORDER BY name"):
    print(dict(r))

print("\n--- MATCH orphan id ---")
r = c.execute(
    "SELECT * FROM services WHERE id=?",
    ("e7ce2029-0250-4bb4-93fc-fd6368558911",),
).fetchone()
print(dict(r) if r else "NOT FOUND in services table")

print("\n--- traffic_history for orphan id ---")
try:
    rows = c.execute(
        "SELECT COUNT(*) AS n, MIN(timestamp) AS first, MAX(timestamp) AS last "
        "FROM traffic_history WHERE service_id=?",
        ("e7ce2029-0250-4bb4-93fc-fd6368558911",),
    ).fetchone()
    print(dict(rows))
except Exception as e:
    print(f"traffic_history query failed: {e}")
