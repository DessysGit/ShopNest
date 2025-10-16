"""
Check migration status and database state
"""
import sys
from sqlalchemy import create_engine, text, inspect
from app.config import settings

def check_migration_status():
    """Check if the migration was applied successfully"""
    
    engine = create_engine(settings.DATABASE_URL)
    
    print("=" * 70)
    print("CHECKING MIGRATION STATUS")
    print("=" * 70)
    
    try:
        with engine.connect() as conn:
            # Check alembic version
            print("\n1. Checking Alembic migration history...")
            try:
                result = conn.execute(text("SELECT version_num FROM alembic_version"))
                version = result.scalar()
                print(f"   Current migration: {version}")
                
                if version == '20251015_fix_enum':
                    print("   ✅ Enum fix migration is applied")
                else:
                    print(f"   ⚠️  Expected: 20251015_fix_enum, Got: {version}")
                    print("   Run: alembic upgrade head")
            except Exception as e:
                print(f"   ❌ Could not read alembic_version: {e}")
            
            # Check if settingtype enum exists
            print("\n2. Checking settingtype enum...")
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'settingtype'
                )
            """))
            exists = result.scalar()
            
            if exists:
                print("   ✅ Enum 'settingtype' exists")
                
                # Get enum values
                result = conn.execute(text("""
                    SELECT enumlabel 
                    FROM pg_enum 
                    WHERE enumtypid = 'settingtype'::regtype 
                    ORDER BY enumsortorder
                """))
                values = [row[0] for row in result]
                print(f"   Values: {values}")
                
                has_uppercase = any(v.isupper() for v in values)
                has_lowercase = any(v.islower() for v in values)
                
                if has_uppercase and not has_lowercase:
                    print("   ✅ Enum has UPPERCASE values (correct)")
                elif has_lowercase and not has_uppercase:
                    print("   ❌ Enum has lowercase values (needs migration)")
                    print("   Run: alembic upgrade head")
                else:
                    print("   ⚠️  Enum has mixed case values (unusual)")
            else:
                print("   ❌ Enum 'settingtype' does not exist")
            
            # Check platform_settings table
            print("\n3. Checking platform_settings table...")
            inspector = inspect(engine)
            
            if 'platform_settings' in inspector.get_table_names():
                print("   ✅ Table 'platform_settings' exists")
                
                # Check column types
                columns = inspector.get_columns('platform_settings')
                for col in columns:
                    if col['name'] == 'setting_type':
                        print(f"   Column 'setting_type' type: {col['type']}")
                        break
                
                # Count records
                result = conn.execute(text("SELECT COUNT(*) FROM platform_settings"))
                count = result.scalar()
                print(f"   Records: {count}")
                
                if count > 0:
                    # Show sample data
                    result = conn.execute(text("""
                        SELECT setting_key, setting_type::text 
                        FROM platform_settings 
                        LIMIT 5
                    """))
                    print("\n   Sample data:")
                    for row in result:
                        print(f"     {row[0]}: {row[1]}")
            else:
                print("   ❌ Table 'platform_settings' does not exist")
                print("   Run: alembic upgrade head")
            
            # Try to query via ORM
            print("\n4. Testing ORM query...")
            try:
                from app.models.platform_setting import PlatformSetting
                from sqlalchemy.orm import Session
                
                with Session(engine) as session:
                    count = session.query(PlatformSetting).count()
                    print(f"   ✅ ORM query successful: {count} settings found")
                    
                    # Try to fetch one
                    setting = session.query(PlatformSetting).first()
                    if setting:
                        print(f"   Sample: {setting.setting_key} = {setting.setting_type}")
            except Exception as e:
                print(f"   ❌ ORM query failed: {e}")
                print("\n   This is the error causing the 500 response!")
                return False
            
            print("\n" + "=" * 70)
            print("✅ ALL CHECKS PASSED!")
            print("=" * 70)
            return True
            
    except Exception as e:
        print(f"\n❌ Database connection error: {e}")
        return False

if __name__ == "__main__":
    success = check_migration_status()
    if not success:
        print("\n📋 Next steps:")
        print("  1. Run: alembic upgrade head")
        print("  2. Restart your server")
        print("  3. Run this script again to verify")
        sys.exit(1)
