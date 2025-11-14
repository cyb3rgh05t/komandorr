"""Migration script to import services from JSON to SQLite database"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import db, ServiceDB, ResponseHistoryDB, TrafficHistoryDB
from app.utils.logger import logger


def migrate_from_json(json_file: str = "data/services.json"):
    """Migrate services from JSON file to SQLite database"""
    json_path = Path(json_file)

    if not json_path.exists():
        logger.warning(f"JSON file not found: {json_file}. Nothing to migrate.")
        print(f"⚠️  No existing services.json found at {json_file}")
        print("Starting with empty database.")
        return

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            services_data = json.load(f)

        if not services_data:
            logger.info("JSON file is empty. Nothing to migrate.")
            print("✓ JSON file is empty. Starting with clean database.")
            return

        print(f"📦 Found {len(services_data)} service(s) in {json_file}")
        print("🔄 Migrating to SQLite database...")

        session = db.get_session()
        migrated_count = 0

        try:
            for service_data in services_data:
                # Convert ISO strings back to datetime
                last_check = None
                if service_data.get("last_check"):
                    last_check = datetime.fromisoformat(service_data["last_check"])

                traffic_last_updated = None
                if service_data.get("traffic") and service_data["traffic"].get(
                    "last_updated"
                ):
                    traffic_last_updated = datetime.fromisoformat(
                        service_data["traffic"]["last_updated"]
                    )

                # Create service record
                traffic_data = service_data.get("traffic") or {}
                db_service = ServiceDB(
                    id=service_data["id"],
                    name=service_data["name"],
                    url=service_data["url"],
                    type=service_data["type"],
                    status=service_data.get("status", "offline"),
                    last_check=last_check,
                    response_time=service_data.get("response_time"),
                    description=service_data.get("description"),
                    icon=service_data.get("icon"),
                    group=service_data.get("group"),
                    enabled=service_data.get("enabled", True),
                    bandwidth_up=traffic_data.get("bandwidth_up", 0.0),
                    bandwidth_down=traffic_data.get("bandwidth_down", 0.0),
                    total_up=traffic_data.get("total_up", 0.0),
                    total_down=traffic_data.get("total_down", 0.0),
                    traffic_last_updated=traffic_last_updated,
                )
                session.add(db_service)

                # Migrate response history
                if service_data.get("response_history"):
                    for point in service_data["response_history"]:
                        timestamp = datetime.fromisoformat(point["timestamp"])
                        response_history = ResponseHistoryDB(
                            service_id=service_data["id"],
                            timestamp=timestamp,
                            response_time=point["response_time"],
                        )
                        session.add(response_history)

                # Migrate traffic history
                if service_data.get("traffic_history"):
                    for point in service_data["traffic_history"]:
                        timestamp = datetime.fromisoformat(point["timestamp"])
                        traffic_history = TrafficHistoryDB(
                            service_id=service_data["id"],
                            timestamp=timestamp,
                            bandwidth_up=point["bandwidth_up"],
                            bandwidth_down=point["bandwidth_down"],
                            total_up=point["total_up"],
                            total_down=point["total_down"],
                        )
                        session.add(traffic_history)

                migrated_count += 1
                print(f"  ✓ Migrated: {service_data['name']}")

            session.commit()
            logger.info(f"Successfully migrated {migrated_count} services to database")
            print(f"\n✅ Migration complete! {migrated_count} service(s) imported.")

            # Backup the original JSON file
            backup_path = json_path.with_suffix(".json.backup")
            json_path.rename(backup_path)
            print(f"📁 Original JSON backed up to: {backup_path}")

        except Exception as e:
            session.rollback()
            logger.error(f"Migration failed: {e}")
            print(f"\n❌ Migration failed: {e}")
            raise
        finally:
            session.close()

    except Exception as e:
        logger.error(f"Failed to read JSON file: {e}")
        print(f"❌ Error reading JSON file: {e}")
        raise


if __name__ == "__main__":
    print("=" * 60)
    print("  Komandorr: JSON to SQLite Migration")
    print("=" * 60)
    print()

    migrate_from_json()

    print()
    print("=" * 60)
    print("  Migration process completed")
    print("=" * 60)
