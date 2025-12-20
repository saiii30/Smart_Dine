"""
Migration script to update the database schema for Trip module changes.
This script adds the new trip_code column and updates trip_schedules table.
"""
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'tms.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if trip_code column exists
        cursor.execute("PRAGMA table_info(trips)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'trip_code' not in columns:
            print("Adding trip_code column to trips table...")
            cursor.execute("ALTER TABLE trips ADD COLUMN trip_code TEXT")
            # Create index for trip_code
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_trips_trip_code ON trips(trip_code)")
            print("[OK] Added trip_code column")
        else:
            print("[OK] trip_code column already exists")
        
        # Check if description column exists (we'll rename it to address)
        if 'description' in columns and 'address' not in columns:
            print("Renaming description to address in trips table...")
            # SQLite doesn't support RENAME COLUMN directly, so we need to recreate the table
            cursor.execute("""
                CREATE TABLE trips_new (
                    id INTEGER NOT NULL PRIMARY KEY,
                    owner_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL,
                    trip_code TEXT,
                    name VARCHAR NOT NULL,
                    address TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(owner_id) REFERENCES users (id),
                    FOREIGN KEY(company_id) REFERENCES companies (id)
                )
            """)
            
            # Copy data
            cursor.execute("""
                INSERT INTO trips_new (id, owner_id, company_id, trip_code, name, address, is_active, created_at, updated_at)
                SELECT id, owner_id, company_id, 
                       CASE WHEN trip_code IS NULL THEN '' ELSE trip_code END,
                       name, description, is_active, created_at, updated_at
                FROM trips
            """)
            
            # Drop old table and rename new one
            cursor.execute("DROP TABLE trips")
            cursor.execute("ALTER TABLE trips_new RENAME TO trips")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_trips_owner_id ON trips(owner_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_trips_company_id ON trips(company_id)")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_trips_trip_code ON trips(trip_code)")
            print("[OK] Renamed description to address")
        elif 'address' in columns:
            print("[OK] address column already exists")
        
        # Check if trips_per_day column exists (we'll remove it)
        if 'trips_per_day' in columns:
            print("Removing trips_per_day column from trips table...")
            # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
            cursor.execute("PRAGMA table_info(trips)")
            all_columns = cursor.fetchall()
            
            cursor.execute("""
                CREATE TABLE trips_new (
                    id INTEGER NOT NULL PRIMARY KEY,
                    owner_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL,
                    trip_code TEXT,
                    name VARCHAR NOT NULL,
                    address TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(owner_id) REFERENCES users (id),
                    FOREIGN KEY(company_id) REFERENCES companies (id)
                )
            """)
            
            # Copy data (excluding trips_per_day)
            cursor.execute("""
                INSERT INTO trips_new (id, owner_id, company_id, trip_code, name, address, is_active, created_at, updated_at)
                SELECT id, owner_id, company_id, 
                       CASE WHEN trip_code IS NULL OR trip_code = '' THEN NULL ELSE trip_code END,
                       name, address, is_active, created_at, updated_at
                FROM trips
            """)
            
            # Drop old table and rename new one
            cursor.execute("DROP TABLE trips")
            cursor.execute("ALTER TABLE trips_new RENAME TO trips")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_trips_owner_id ON trips(owner_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_trips_company_id ON trips(company_id)")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_trips_trip_code ON trips(trip_code)")
            print("[OK] Removed trips_per_day column")
        else:
            print("[OK] trips_per_day column already removed")
        
        # Check trip_schedules table
        cursor.execute("PRAGMA table_info(trip_schedules)")
        schedule_columns = [row[1] for row in cursor.fetchall()]
        
        # Check if we need to update trip_schedules
        needs_update = False
        changes = []
        
        if 'day_of_week' in schedule_columns:
            needs_update = True
            changes.append("Remove day_of_week and trip_number, add vehicle_id, driver_id, passenger_count")
        
        if 'departure_time' in schedule_columns and 'departure_datetime' not in schedule_columns:
            needs_update = True
            changes.append("Rename departure_time to departure_datetime")
        
        if 'vehicle_id' not in schedule_columns:
            needs_update = True
            changes.append("Add vehicle_id, driver_id, passenger_count")
        
        if needs_update:
            print("Updating trip_schedules table structure...")
            print(f"Changes: {', '.join(changes)}")
            
            # Create new table structure
            cursor.execute("""
                CREATE TABLE trip_schedules_new (
                    id INTEGER NOT NULL PRIMARY KEY,
                    trip_id INTEGER NOT NULL,
                    destination VARCHAR NOT NULL,
                    departure_datetime DATETIME NOT NULL,
                    vehicle_id INTEGER,
                    driver_id INTEGER,
                    passenger_count INTEGER DEFAULT 0,
                    notes TEXT,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(trip_id) REFERENCES trips (id),
                    FOREIGN KEY(vehicle_id) REFERENCES vehicles (id),
                    FOREIGN KEY(driver_id) REFERENCES drivers (id)
                )
            """)
            
            # Copy existing data if any
            cursor.execute("SELECT COUNT(*) FROM trip_schedules")
            count = cursor.fetchone()[0]
            
            if count > 0:
                # Try to migrate existing data
                cursor.execute("""
                    INSERT INTO trip_schedules_new (id, trip_id, destination, departure_datetime, vehicle_id, driver_id, passenger_count, notes, created_at, updated_at)
                    SELECT id, trip_id, 
                           COALESCE(destination, ''),
                           CASE 
                               WHEN departure_datetime IS NOT NULL THEN departure_datetime
                               WHEN departure_time IS NOT NULL THEN datetime('now', departure_time)
                               ELSE datetime('now')
                           END,
                           NULL, NULL, 0, notes, created_at, updated_at
                    FROM trip_schedules
                """)
            
            # Drop old table and rename new one
            cursor.execute("DROP TABLE trip_schedules")
            cursor.execute("ALTER TABLE trip_schedules_new RENAME TO trip_schedules")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_trip_schedules_trip_id ON trip_schedules(trip_id)")
            print("[OK] Updated trip_schedules table")
        else:
            print("[OK] trip_schedules table is up to date")
        
        # Drop trip_assignments table if it exists (we moved assignments to schedules)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='trip_assignments'")
        if cursor.fetchone():
            print("Dropping trip_assignments table (assignments moved to schedules)...")
            cursor.execute("DROP TABLE trip_assignments")
            print("[OK] Dropped trip_assignments table")
        else:
            print("[OK] trip_assignments table already removed")
        
        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting database migration...")
    print(f"Database: {DB_PATH}\n")
    migrate()

