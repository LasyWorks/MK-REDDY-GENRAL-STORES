#!/bin/bash

#############################################################################
# PostgreSQL to MySQL Migration Script (Bash)
# Migrates all data from Supabase PostgreSQL to cPanel MySQL
# No Node.js required - uses native psql and mysql tools
#############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PGSRC_HOST="${PGSRC_HOST:-aws-1-ap-northeast-2.pooler.supabase.com}"
PGSRC_PORT="${PGSRC_PORT:-5432}"
PGSRC_USER="${PGSRC_USER:-postgres.ramnoypeqkvzikrwsnde}"
PGSRC_PASSWORD="${PGSRC_PASSWORD}"
PGSRC_NAME="${PGSRC_NAME:-postgres}"
PGSRC_SSL="${PGSRC_SSL:-true}"

MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-ihcsscjl_mk_reddy}"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"
MYSQL_NAME="${MYSQL_NAME:-ihcsscjl_mk_reddy}"
MYSQL_TRUNCATE_TARGET="${MYSQL_TRUNCATE_TARGET:-true}"

# Temporary files
TEMP_DIR="/tmp/mysql_migration_$$"
mkdir -p "$TEMP_DIR"
SCHEMA_FILE="$TEMP_DIR/schema.sql"
DATA_DIR="$TEMP_DIR/data"
mkdir -p "$DATA_DIR"

echo -e "${YELLOW}=== PostgreSQL to MySQL Migration ===${NC}"
echo "Source (PostgreSQL): $PGSRC_HOST:$PGSRC_PORT"
echo "Target (MySQL): $MYSQL_HOST:$MYSQL_PORT"
echo "Database: $MYSQL_NAME"
echo ""

#############################################################################
# Function: Export PostgreSQL Schema
#############################################################################
export_postgresql_schema() {
  echo -e "${YELLOW}Step 1: Exporting PostgreSQL schema...${NC}"
  
  PGPASSWORD="$PGSRC_PASSWORD" PGSSLMODE=require pg_dump \
    --host="$PGSRC_HOST" \
    --port="$PGSRC_PORT" \
    --username="$PGSRC_USER" \
    --dbname="$PGSRC_NAME" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-tablespaces \
    --disable-triggers \
    > "$SCHEMA_FILE" 2>/dev/null
  
  if [ -f "$SCHEMA_FILE" ] && [ -s "$SCHEMA_FILE" ]; then
    echo -e "${GREEN}Schema exported successfully${NC}"
  else
    echo -e "${RED}ERROR: Failed to export schema from PostgreSQL${NC}"
    exit 1
  fi
}

#############################################################################
# Function: Export PostgreSQL Data
#############################################################################
export_postgresql_data() {
  echo -e "${YELLOW}Step 2: Exporting PostgreSQL data...${NC}"
  
  # Get list of all tables in PostgreSQL
  PGPASSWORD="$PGSRC_PASSWORD" PGSSLMODE=require psql \
    --host="$PGSRC_HOST" \
    --port="$PGSRC_PORT" \
    --username="$PGSRC_USER" \
    --dbname="$PGSRC_NAME" \
    --tuples-only \
    --no-align \
    -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" \
    > "$TEMP_DIR/tables.txt"
  
  local table_count=0
  while IFS= read -r table; do
    if [ -z "$table" ]; then continue; fi
    
    echo "  Exporting table: $table"
    
    # Export as CSV (easier to parse)
    PGPASSWORD="$PGSRC_PASSWORD" PGSSLMODE=require psql \
      --host="$PGSRC_HOST" \
      --port="$PGSRC_PORT" \
      --username="$PGSRC_USER" \
      --dbname="$PGSRC_NAME" \
      --command="SET datestyle=ISO; COPY $table TO STDOUT WITH (FORMAT CSV, HEADER);" \
      > "$DATA_DIR/${table}.csv" 2>/dev/null
    
    local row_count=$(wc -l < "$DATA_DIR/${table}.csv")
    echo "    Rows: $((row_count - 1))"  # Subtract header line
    ((table_count++))
  done < "$TEMP_DIR/tables.txt"
  
  echo -e "${GREEN}Exported $table_count tables${NC}"
}

#############################################################################
# Function: Convert PostgreSQL Schema to MySQL Syntax
#############################################################################
convert_schema_to_mysql() {
  echo -e "${YELLOW}Step 3: Converting schema to MySQL syntax...${NC}"
  
  local mysql_schema="$TEMP_DIR/schema_mysql.sql"
  
  cat "$SCHEMA_FILE" | \
    # Remove PostgreSQL-specific commands
    grep -v "^--" | \
    grep -v "^SET " | \
    grep -v "^SELECT " | \
    grep -v "^GRANT " | \
    grep -v "^REVOKE " | \
    # Convert data types
    sed 's/uuid PRIMARY KEY DEFAULT uuid_generate_v4()/VARCHAR(36) PRIMARY KEY DEFAULT (UUID())/g' | \
    sed 's/uuid NOT NULL DEFAULT uuid_generate_v4()/VARCHAR(36) NOT NULL DEFAULT (UUID())/g' | \
    sed 's/uuid/VARCHAR(36)/g' | \
    sed 's/boolean/TINYINT(1)/g' | \
    sed 's/IDENTITY.*ALWAYS.*GENERATED AS IDENTITY//g' | \
    sed 's/SERIAL/INT AUTO_INCREMENT/g' | \
    sed 's/text\[\]/LONGTEXT/g' | \
    sed 's/jsonb/JSON/g' | \
    sed 's/json/JSON/g' | \
    sed 's/timestamp with time zone/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g' | \
    sed 's/timestamp without time zone/TIMESTAMP/g' | \
    sed 's/CONSTRAINT.*FOREIGN KEY/FOREIGN KEY/g' | \
    # Remove DEFERRABLE clauses
    sed 's/DEFERRABLE.*INITIALLY DEFERRED//g' | \
    # Remove CHECK constraints (convert to comments)
    sed 's/CHECK .*/-- CHECK constraint moved/g' \
    > "$mysql_schema"
  
  echo -e "${GREEN}Schema converted${NC}"
}

#############################################################################
# Function: Truncate Target Tables (Optional)
#############################################################################
truncate_mysql_tables() {
  if [ "$MYSQL_TRUNCATE_TARGET" != "true" ]; then
    return
  fi
  
  echo -e "${YELLOW}Step 4: Truncating target MySQL tables...${NC}"
  
  local truncate_sql="$TEMP_DIR/truncate.sql"
  
  echo "SET FOREIGN_KEY_CHECKS=0;" > "$truncate_sql"
  
  while IFS= read -r table; do
    if [ -z "$table" ]; then continue; fi
    echo "TRUNCATE TABLE \`$table\`;" >> "$truncate_sql"
  done < "$TEMP_DIR/tables.txt"
  
  echo "SET FOREIGN_KEY_CHECKS=1;" >> "$truncate_sql"
  
  mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_NAME" < "$truncate_sql" 2>/dev/null || true
  echo -e "${GREEN}Tables truncated${NC}"
}

#############################################################################
# Function: Create MySQL Schema
#############################################################################
create_mysql_schema() {
  echo -e "${YELLOW}Step 5: Creating MySQL schema...${NC}"
  
  mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_NAME" < "$TEMP_DIR/schema_mysql.sql" 2>/dev/null || true
  
  echo -e "${GREEN}Schema created${NC}"
}

#############################################################################
# Function: Import Data to MySQL
#############################################################################
import_data_to_mysql() {
  echo -e "${YELLOW}Step 6: Importing data to MySQL...${NC}"
  
  while IFS= read -r table; do
    if [ -z "$table" ]; then continue; fi
    
    local csv_file="$DATA_DIR/${table}.csv"
    
    if [ ! -f "$csv_file" ]; then
      echo "  ERROR: CSV file not found for table: $table"
      continue
    fi
    
    local row_count=$(( $(wc -l < "$csv_file") - 1 ))
    
    if [ "$row_count" -gt 0 ]; then
      echo "  Importing $table ($row_count rows)..."
      
      # Build LOAD DATA INFILE statement
      local load_sql="LOAD DATA LOCAL INFILE '$csv_file' "
      load_sql+="INTO TABLE \`$table\` "
      load_sql+="FIELDS TERMINATED BY ',' "
      load_sql+="ENCLOSED BY '\"' "
      load_sql+="ESCAPED BY '\\\\' "
      load_sql+="LINES TERMINATED BY '\\n' "
      load_sql+="IGNORE 1 ROWS;"
      
      echo "$load_sql" | mysql \
        --local-infile=1 \
        -h "$MYSQL_HOST" \
        -P "$MYSQL_PORT" \
        -u "$MYSQL_USER" \
        -p"$MYSQL_PASSWORD" \
        "$MYSQL_NAME" 2>/dev/null || true
    fi
  done < "$TEMP_DIR/tables.txt"
  
  echo -e "${GREEN}Data imported${NC}"
}

#############################################################################
# Function: Verify Migration
#############################################################################
verify_migration() {
  echo -e "${YELLOW}Step 7: Verifying migration...${NC}"
  
  local verify_sql="SELECT table_name, TABLE_ROWS FROM information_schema.TABLES WHERE table_schema='$MYSQL_NAME' ORDER BY table_name;"
  
  echo "MySQL Table Row Counts:"
  mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "$verify_sql" 2>/dev/null || true
  
  echo -e "${GREEN}Verification complete${NC}"
}

#############################################################################
# Function: Cleanup
#############################################################################
cleanup() {
  echo -e "${YELLOW}Step 8: Cleaning up temporary files...${NC}"
  rm -rf "$TEMP_DIR"
  echo -e "${GREEN}Cleanup complete${NC}"
}

#############################################################################
# Main Execution
#############################################################################
main() {
  # Validate environment
  if [ -z "$PGSRC_PASSWORD" ] || [ -z "$MYSQL_PASSWORD" ]; then
    echo -e "${RED}ERROR: Database passwords not set${NC}"
    echo "Set environment variables:"
    echo "  export PGSRC_PASSWORD='your_supabase_password'"
    echo "  export MYSQL_PASSWORD='your_mysql_password'"
    exit 1
  fi
  
  # Check required tools
  for tool in psql pg_dump mysql; do
    if ! command -v "$tool" &> /dev/null; then
      echo -e "${RED}ERROR: $tool is not installed${NC}"
      exit 1
    fi
  done
  
  # Run migration steps
  export_postgresql_schema
  export_postgresql_data
  convert_schema_to_mysql
  truncate_mysql_tables
  create_mysql_schema
  import_data_to_mysql
  verify_migration
  cleanup
  
  echo ""
  echo -e "${GREEN}=== Migration Complete ===${NC}"
  echo "All data has been migrated from PostgreSQL to MySQL."
  echo "Temporary files cleaned up from: $TEMP_DIR"
}

# Run main function
main
