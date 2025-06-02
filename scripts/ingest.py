import csv
import sqlite3

def ingest_sensor_data():
    conn = sqlite3.connect("cache.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS sensors (
            sensor_type TEXT,
            application TEXT,
            manufacturer TEXT,
            accuracy TEXT,
            data_format TEXT,
            power_usage TEXT
        )
    """)
    c.execute("DELETE FROM sensors")
    
    with open("data/sensors.csv", newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            c.execute("""
                INSERT INTO sensors (sensor_type, application, manufacturer, accuracy, data_format, power_usage)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                row["sensor_type"], row["application"], row["manufacturer"],
                row["accuracy"], row["data_format"], row["power_usage"]
            ))
    
    conn.commit()
    conn.close()
    print("Sensor data ingested.")

if __name__ == "__main__":
    ingest_sensor_data()