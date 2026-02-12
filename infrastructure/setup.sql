-- ============================================================================
-- CLARITY - Snowpark Container Services Setup (Development Environment)
-- ============================================================================
-- This script creates the necessary Snowflake resources for deploying
-- the Data Intelligence Platform to Snowpark Container Services.
--
-- Prerequisites:
-- - ACCOUNTADMIN role or equivalent permissions
-- - RSA public key generated (run scripts/generate-keys.sh first)
-- - Existing CLARITY infrastructure (CLARITY_DB, POWERHOUSE, SNOW_SHERIFF, CLARITY_SERVICE_ACCOUNT)
--
-- Usage:
-- 1. Run scripts/generate-keys.sh to generate your RSA key pair (if needed)
-- 2. Copy the public key content from keys/public_key.pem
-- 3. Replace YOUR_PUBLIC_KEY_HERE below with the actual key (if creating new user)
-- 4. Run this script as ACCOUNTADMIN in Snowflake Worksheets
--
-- IMPORTANT: Run the ENTIRE script as ACCOUNTADMIN. Do not switch roles.
-- ============================================================================

-- ============================================================================
-- Run this script as the role that OWNS the RETAIL schema (likely SNOW_SHERIFF)
-- Then switch to ACCOUNTADMIN for account-level objects
-- ============================================================================

-- First, run as SNOW_SHERIFF to create schema-level objects
USE ROLE SNOW_SHERIFF;
USE WAREHOUSE POWERHOUSE;
USE DATABASE CLARITY_DB;
USE SCHEMA RETAIL;

-- ============================================================================
-- 1. Create Image Repository (as schema owner)
-- ============================================================================

CREATE IMAGE REPOSITORY IF NOT EXISTS CLARITY_REPOSITORY_DEV
  COMMENT = 'Image repository for CLARITY Data Intelligence Platform containers';

-- ============================================================================
-- 2. Create Network Rules (as schema owner)
-- ============================================================================

CREATE OR REPLACE NETWORK RULE CLARITY_SNOWFLAKE_EGRESS_DEV
  MODE = EGRESS
  TYPE = HOST_PORT
  VALUE_LIST = (
    '*.snowflakecomputing.com'
  );

CREATE OR REPLACE NETWORK RULE CLARITY_HTTPS_EGRESS_DEV
  TYPE = 'HOST_PORT'
  MODE = 'EGRESS'
  VALUE_LIST = ('0.0.0.0:443', '0.0.0.0:80');

-- ============================================================================
-- 3. Ensure CLEAN_INSIGHTS_STORE Table Exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS CLEAN_INSIGHTS_STORE (
  LOAD_ID VARCHAR(255),
  LOAD_DATETIME TIMESTAMP_NTZ,
  CLEAN_JSON VARIANT
);

-- ============================================================================
-- Now switch to ACCOUNTADMIN for account-level objects
-- ============================================================================

USE ROLE ACCOUNTADMIN;

-- ============================================================================
-- 4. Create Compute Pool (requires ACCOUNTADMIN)
-- ============================================================================

CREATE COMPUTE POOL IF NOT EXISTS CLARITY_POOL_DEV
  MIN_NODES = 1
  MAX_NODES = 3
  INSTANCE_FAMILY = CPU_X64_S
  AUTO_RESUME = TRUE
  AUTO_SUSPEND_SECS = 3600
  COMMENT = 'Compute pool for CLARITY Data Intelligence Platform Development';

-- Grant Compute Pool Permissions to SNOW_SHERIFF
GRANT USAGE ON COMPUTE POOL CLARITY_POOL_DEV TO ROLE SNOW_SHERIFF;
GRANT MONITOR ON COMPUTE POOL CLARITY_POOL_DEV TO ROLE SNOW_SHERIFF;

-- ============================================================================
-- 5. Create External Access Integration (requires ACCOUNTADMIN)
-- ============================================================================

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION CLARITY_EAI_DEV
  ALLOWED_NETWORK_RULES = (
    CLARITY_DB.RETAIL.CLARITY_HTTPS_EGRESS_DEV,
    CLARITY_DB.RETAIL.CLARITY_SNOWFLAKE_EGRESS_DEV
  )
  ENABLED = true;

GRANT USAGE ON INTEGRATION CLARITY_EAI_DEV TO ROLE SNOW_SHERIFF;

-- ============================================================================
-- 6. Grant Service Permissions (requires ACCOUNTADMIN)
-- ============================================================================

-- Grant permission to create services
GRANT CREATE SERVICE ON SCHEMA CLARITY_DB.RETAIL TO ROLE SNOW_SHERIFF;

-- CRITICAL: Grant permission to bind service endpoints
GRANT BIND SERVICE ENDPOINT ON ACCOUNT TO ROLE SNOW_SHERIFF;

-- ============================================================================
-- 7. Verification
-- ============================================================================
-- Run these commands to verify the setup:

-- SHOW COMPUTE POOLS LIKE 'CLARITY_POOL_DEV';
-- SHOW IMAGE REPOSITORIES LIKE 'CLARITY_REPOSITORY_DEV';
-- SHOW INTEGRATIONS LIKE 'CLARITY_EAI_DEV';
-- SHOW NETWORK RULES IN SCHEMA CLARITY_DB.RETAIL;

-- ============================================================================
-- Setup Complete!
-- ============================================================================
-- Next Steps:
-- 1. Note the repository URL from SHOW IMAGE REPOSITORIES
--    Run: SHOW IMAGE REPOSITORIES IN SCHEMA CLARITY_DB.RETAIL;
--    Format: <org>-<account>.registry.snowflakecomputing.com/CLARITY_DB/RETAIL/CLARITY_REPOSITORY_DEV
-- 2. Use this URL as the DOCKER_REPO_URL GitHub secret
-- 3. Configure remaining GitHub Actions secrets:
--    - SNOWFLAKE_HOST (wb19670-c2gpartners.snowflakecomputing.com)
--    - SNOWFLAKE_ACCOUNT (WB19670-C2GPARTNERS)
--    - SNOWFLAKE_USER (CLARITY_SERVICE_ACCOUNT)
--    - SNOWFLAKE_PRIVATE_KEY_RAW (content of private_key.pem)
--    - DOCKER_REPO_URL (from step 1)
-- 4. Push to main branch to trigger deployment!
-- ============================================================================
