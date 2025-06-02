import sqlite3
conn = sqlite3.connect("cache.db")
c = conn.cursor()

for row in c.execute("SELECT * FROM sensors"):
    print(row)