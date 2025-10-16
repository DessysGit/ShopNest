"""
Check for NULL values in platform_settings
"""
from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT 
            setting_key,
            requires_confirmation,
            is_sensitive,
            is_editable
        FROM platform_settings
        ORDER BY setting_key
    """))
    
    print("Checking for NULL boolean values:\n")
    has_nulls = False
    
    for row in result:
        key, req_conf, sensitive, editable = row
        
        nulls = []
        if req_conf is None:
            nulls.append("requires_confirmation")
        if sensitive is None:
            nulls.append("is_sensitive")
        if editable is None:
            nulls.append("is_editable")
        
        if nulls:
            has_nulls = True
            print(f"❌ {key}: NULL in {', '.join(nulls)}")
        else:
            print(f"✅ {key}: All boolean fields set")
    
    if has_nulls:
        print("\n⚠️  Found NULL values! Need to fix these.")
    else:
        print("\n✅ All boolean fields are set correctly!")
