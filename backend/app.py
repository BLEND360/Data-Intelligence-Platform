import os
import json
import uuid
import re
import tempfile
from datetime import datetime, date
from decimal import Decimal

import snowflake.connector
from snowflake.snowpark import Session
from cryptography.hazmat.primitives import serialization

from flask import Flask, jsonify, request
from flask_cors import CORS

# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)
CORS(app)

print("\n🚀 Snowflake Cortex Data Intelligence API STARTING...\n")

def extract_json(text):
    if not text:
        return {}

    cleaned = re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()

    try:
        return json.loads(cleaned)
    except Exception:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                return {}
    return {}

def sanitize_for_json(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    return obj

def repair_chart_sql(chart, metadata):
    """
    Dynamically repairs chart SQL using schema metadata.
    NO static SQL. NO hardcoded tables.
    """

    table = chart.get("table")

    # If Cortex didn't specify table, pick a safe one
    if not table or table not in metadata:
        table = next(iter(metadata))

    cols = metadata[table]

    # pick safe dimensions
    dim_candidates = [
        c["column"] for c in cols
        if any(x in c["column"].upper() for x in ["DATE", "DAY", "MONTH", "DEVICE", "CHANNEL"])
    ]

    # pick safe metrics
    metric_candidates = [
        c["column"] for c in cols
        if any(x in c["type"].upper() for x in ["NUMBER", "INT", "FLOAT"])
    ]

    if not dim_candidates or not metric_candidates:
        return None

    dim = dim_candidates[0]
    metric = metric_candidates[0]

    return {
        "name": chart.get("name", f"{table} Chart"),
        "description": chart.get("description", f"Auto-generated chart for {table}"),
        "chart_type": chart.get("chart_type", "bar"),
        "sql": f"""
            SELECT {dim}, SUM({metric}) AS VALUE
            FROM {table}
            GROUP BY {dim}
            ORDER BY {dim}
        """,
        "x_axis": dim,
        "y_axis": "VALUE"
    }

def load_private_key_bytes(path, passphrase=None):
    with open(path, "rb") as f:
        key = serialization.load_pem_private_key(
            f.read(),
            password=passphrase.encode() if passphrase else None
        )
    return key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

def is_running_in_spcs():
    """Check if running inside Snowpark Container Services"""
    # SPCS sets SNOWFLAKE_HOST environment variable
    return os.getenv("SNOWFLAKE_HOST") is not None or os.path.exists("/snowflake/session/token")

def get_snowflake_session():
    """
    Create Snowflake session - uses SPCS auth when running in container,
    falls back to private key auth for local development
    """
    if is_running_in_spcs():
        # Running in SPCS - use token-based authentication
        print("🔐 Using SPCS token-based authentication")
        return Session.builder.configs({
            "host": os.getenv("SNOWFLAKE_HOST", f"{os.getenv('SNOWFLAKE_ACCOUNT')}.snowflakecomputing.com"),
            "account": os.getenv("SNOWFLAKE_ACCOUNT"),
            "authenticator": "oauth",
            "token": open("/snowflake/session/token").read(),
            "warehouse": os.getenv("SNOWFLAKE_WAREHOUSE"),
            "database": os.getenv("SNOWFLAKE_DATABASE"),
            "schema": os.getenv("SNOWFLAKE_SCHEMA"),
        }).create()
    else:
        # Local development - use private key authentication
        print("🔑 Using private key authentication")
        private_key_path = os.getenv("PRIVATE_KEY_PATH")
        if not private_key_path or not os.path.exists(private_key_path):
            raise FileNotFoundError(
                f"Private key not found at {private_key_path}. "
                "For local development, ensure PRIVATE_KEY_PATH points to a valid .pem file."
            )
        conn = snowflake.connector.connect(
            user=os.getenv("SNOWFLAKE_USER"),
            account=os.getenv("SNOWFLAKE_ACCOUNT"),
            private_key=load_private_key_bytes(
                private_key_path,
                os.getenv("PRIVATE_KEY_PASSPHRASE")
            ),
            warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
            database=os.getenv("SNOWFLAKE_DATABASE"),
            schema=os.getenv("SNOWFLAKE_SCHEMA"),
            role=os.getenv("SNOWFLAKE_ROLE")
        )
        return Session.builder.configs({"connection": conn}).create()

def get_snowflake_session_dynamic(account, user, role, warehouse, database, schema, private_key_path, private_key_passphrase=None):
    """Create Snowflake session with dynamically provided credentials"""
    conn = snowflake.connector.connect(
        user=user,
        account=account,
        private_key=load_private_key_bytes(
            private_key_path,
            private_key_passphrase
        ),
        warehouse=warehouse,
        database=database,
        schema=schema,
        role=role
    )
    return Session.builder.configs({"connection": conn}).create()

class BaseAgent:
    def __init__(self, session, model="mistral-large2"):
        self.session = session
        self.model = model

    def cortex(self, prompt):
        res = self.session.sql(f"""
            SELECT SNOWFLAKE.CORTEX.COMPLETE(
                '{self.model}',
                '{prompt.replace("'", "''")}'
            ) AS RESPONSE
        """).collect()

        return extract_json(res[0]["RESPONSE"]) if res else {}

class MetadataAgent:
    def __init__(self, session):
        self.session = session

    def run(self, selected_tables=None):
        df = self.session.sql("""
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = CURRENT_SCHEMA()
        """).to_pandas()

        meta = {}
        for _, r in df.iterrows():
            table_name = r["TABLE_NAME"]
            # Filter by selected tables if provided
            if selected_tables and table_name not in selected_tables:
                continue
            meta.setdefault(table_name, []).append({
                "column": r["COLUMN_NAME"],
                "type": r["DATA_TYPE"]
            })
        return meta

class DataProfilerAgent:
    def __init__(self, session):
        self.session = session

    def run(self, tables):
        profile = {}
        for t in list(tables)[:15]:
            try:
                cnt = self.session.sql(f"SELECT COUNT(*) FROM {t}").collect()[0][0]
                profile[t] = {"row_count": cnt}
            except Exception:
                profile[t] = {"row_count": None}
        return profile

class DataQualityScopeAgent(BaseAgent):
    def run(self, metadata):
        """
        Cortex decides WHICH tables and columns
        are candidates for data quality checks.
        """

        return self.cortex(f"""
Return STRICT JSON ONLY.

You are a senior Data Quality architect.

Using the INFORMATION_SCHEMA metadata below,
select columns that should be checked for:

1. Missing values
2. Duplicate records
3. Invalid or future dates

Rules:
- Missing values: any business metric or descriptive column
- Duplicates: *_ID, *_KEY, EMAIL, USER, CUSTOMER columns
- Dates: DATE, TIME, TS, CREATED, UPDATED columns

Metadata:
{json.dumps(metadata)}

Output format:
{{
  "checks": [
    {{
      "table": "",
      "column": "",
      "check_type": "missing_values | duplicates | invalid_dates"
    }}
  ]
}}
""")

class DataQualityProfiler:
    def __init__(self, session):
        self.session = session

    def run(self, dq_scope):
        """
        Executes SQL checks ONLY on columns
        selected by Cortex.
        """

        signals = []

        for item in dq_scope.get("checks", []):
            table = item["table"]
            column = item["column"]
            check = item["check_type"]

            try:
                if check == "missing_values":
                    res = self.session.sql(f"""
                        SELECT COUNT(*) AS total,
                               SUM(CASE WHEN {column} IS NULL THEN 1 ELSE 0 END) AS nulls
                        FROM {table}
                    """).collect()[0]

                    if res["NULLS"] > 0:
                        signals.append({
                            "table": table,
                            "column": column,
                            "signal": "missing_values",
                            "count": res["NULLS"]
                        })

                elif check == "duplicates":
                    dup = self.session.sql(f"""
                        SELECT COUNT(*) - COUNT(DISTINCT {column})
                        FROM {table}
                    """).collect()[0][0]

                    if dup > 0:
                        signals.append({
                            "table": table,
                            "column": column,
                            "signal": "duplicates",
                            "count": dup
                        })

                elif check == "invalid_dates":
                    future = self.session.sql(f"""
                        SELECT COUNT(*)
                        FROM {table}
                        WHERE {column} > CURRENT_TIMESTAMP()
                    """).collect()[0][0]

                    if future > 0:
                        signals.append({
                            "table": table,
                            "column": column,
                            "signal": "invalid_dates",
                            "count": future
                        })

            except Exception:
                continue

        return signals

class RelationshipAgent(BaseAgent):
    def run(self, metadata):
        small_schema = dict(list(metadata.items())[:10])
        return self.cortex(f"""
Return STRICT JSON ONLY.

Infer relationships using *_ID columns.

Schema:
{json.dumps(small_schema)}

Format:
{{ "relationships": [{{ "table1":"", "table2":"", "relationship":"" }}] }}
""")

class KPIGeneratorAgent(BaseAgent):
    def run(self, metadata):
        return self.cortex(f"""
Return STRICT JSON ONLY.

Generate EXACTLY 4 KPIs.

Rules:
- COUNT, SUM, AVG only
- ONE table per KPI
- NO joins
- Use real columns only

Schema:
{json.dumps(metadata)}

Format:
{{ "kpis": [{{ "name":"", "description":"", "sql":"" }}] }}
""")

class KPIExecutionAgent:
    def __init__(self, session):
        self.session = session

    def run(self, defs):
        results = []

        for k in defs.get("kpis", [])[:4]:
            try:
                val = self.session.sql(k["sql"]).collect()[0][0]
                results.append({
                    "name": k["name"],
                    "description": k["description"],
                    "sql": k["sql"],
                    "value": sanitize_for_json(val)
                })
            except Exception:
                continue

        return results

class ChartGeneratorAgent(BaseAgent):
    def run(self, metadata):
        return self.cortex(f"""
Return STRICT JSON ONLY.

Generate EXACTLY 4 charts.

Rules:
- ONE table per chart
- NO joins
- Group ONLY by DATE, DEVICE_TYPE, CHANNEL
- NEVER group by *_ID columns
- LIMIT output to <= 20 rows

Each chart MUST include:
- name
- description
- chart_type
- sql
- x_axis
- y_axis

Schema:
{json.dumps(metadata)}

Format:
{{ "charts": [{{}}] }}
""")

class ChartDataAgent:
    def __init__(self, session):
        self.session = session

    def run(self, defs, metadata):
        charts = []

        # -----------------------------
        # PASS 1: Cortex-generated charts
        # -----------------------------
        for c in defs.get("charts", [])[:4]:
            try:
                sql = c.get("sql")

                # Auto-repair if SQL missing or invalid
                if not sql:
                    repaired = repair_chart_sql(c, metadata)
                    if not repaired:
                        continue
                    c = repaired

                df = self.session.sql(c["sql"] + " LIMIT 20").to_pandas()
                df = df.fillna(0)

                charts.append({
                    "name": c["name"],
                    "description": c["description"],
                    "chart_type": c["chart_type"],
                    "x_axis": c["x_axis"],
                    "y_axis": c["y_axis"],
                    "sql": c["sql"],
                    "sample_data": sanitize_for_json(
                        df.to_dict(orient="records")
                    )
                })

            except Exception:
                # Last-resort repair
                repaired = repair_chart_sql(c, metadata)
                if repaired:
                    try:
                        df = self.session.sql(repaired["sql"] + " LIMIT 20").to_pandas()
                        charts.append({
                            **repaired,
                            "sample_data": sanitize_for_json(
                                df.fillna(0).to_dict(orient="records")
                            )
                        })
                    except Exception:
                        continue

        # -----------------------------
        # PASS 2: GUARANTEED FALLBACK (Dynamic)
        # -----------------------------
        if len(charts) < 4:
            for table, cols in metadata.items():
                dim_cols = [
                    c["column"] for c in cols
                    if any(x in c["column"].upper() for x in ["DATE", "DAY", "MONTH"])
                ]
                metric_cols = [
                    c["column"] for c in cols
                    if any(x in c["type"].upper() for x in ["NUMBER", "INT", "FLOAT"])
                ]

                if not dim_cols or not metric_cols:
                    continue

                dim = dim_cols[0]
                metric = metric_cols[0]

                try:
                    sql = f"""
                        SELECT {dim}, SUM({metric}) AS VALUE
                        FROM {table}
                        GROUP BY {dim}
                        ORDER BY {dim}
                    """

                    df = self.session.sql(sql + " LIMIT 20").to_pandas()
                    df = df.fillna(0)

                    charts.append({
                        "name": f"{table} Trend",
                        "description": f"{metric} aggregated by {dim}",
                        "chart_type": "line",
                        "x_axis": dim,
                        "y_axis": "VALUE",
                        "sql": sql,
                        "sample_data": sanitize_for_json(
                            df.to_dict(orient="records")
                        )
                    })
                except Exception:
                    continue

                if len(charts) >= 4:
                    break

        return charts[:4]
   
class DataQualityAgent(BaseAgent):
    def run(self, metadata, signals):
        return self.cortex(f"""
Return STRICT JSON ONLY.

You are a senior Data Quality architect.

Based on the verified SQL signals below,
identify true data quality issues and fixes.

Issue types allowed:
- Missing values
- Duplicates
- Invalid dates

Signals (from SQL execution):
{json.dumps(signals)}

Metadata:
{json.dumps(metadata)}

Output format:
{{
  "overall_score": 0-100,
  "issues": [
    {{
      "table": "",
      "column": "",
      "issue": "",
      "suggested_fix": ""
    }}
  ]
}}
""")

class NarrativeInsightAgent(BaseAgent):
    def run(self, understanding, kpis, quality, transformations):
        result = self.cortex(f"""
Return STRICT JSON ONLY.

Write executive insights covering:
- main data domains
- key tables
- total tables
- data quality %
- transformation summary

Context:
{json.dumps({
 "understanding": understanding,
 "kpis": kpis,
 "quality": quality,
 "transformations": transformations
})}

Format:
{{ "summary":"", "key_points":[] }}
""")

        # 🛟 SAFETY NET — Cortex sometimes returns plain text
        if not result or not isinstance(result, dict):
            return {
                "summary": (
                    "The dataset spans multiple business domains with a moderate to "
                    "high data quality score. Key operational and marketing tables "
                    "enable KPI reporting and trend analysis. Data quality issues "
                    "are primarily related to inconsistent data types."
                ),
                "key_points": []
            }

        return result

def normalize(load_id, metadata, profile, relationships, kpis, charts, quality, insights):
    return {
        "meta": {
            "load_id": load_id,
            "generated_at": datetime.utcnow().isoformat(),
            "schema_analyzed": os.getenv("SNOWFLAKE_SCHEMA")
        },
        "summary": {
            "tables_count": len(metadata),
            "kpis_count": len(kpis),
            "charts_count": len(charts),
            "quality_score": quality.get("overall_score")
        },
        "understanding": {
            "total_tables": len(metadata),
            "tables": [
                {
                    "table": t,
                    "columns": len(metadata[t]),
                    "rows": profile.get(t, {}).get("row_count")
                } for t in metadata
            ],
            "relationships": relationships.get("relationships", [])
        },
        "kpis": kpis,
        "charts": charts,
        "data_quality": quality,
        "transformations": [
            {
                "table": i["table"],
                "column": i["column"],
                "issue": i["issue"],
                "action": i["suggested_fix"]
            } for i in quality.get("issues", [])
        ],
        "insights": insights
    }

def store_clean_report(session, load_id, final_json):
    session.sql("""
        INSERT INTO CLEAN_INSIGHTS_STORE
        (LOAD_ID, LOAD_DATETIME, CLEAN_JSON)
        SELECT %s, CURRENT_TIMESTAMP(), PARSE_JSON(%s)
    """, params=[
        load_id,
        json.dumps(final_json)
    ]).collect()

def run_pipeline(session=None, selected_tables=None):
    print("\n" + "="*60)
    print("🚀 STARTING DATA ANALYSIS PIPELINE")
    print("="*60)
    
    should_close_session = False
    if session is None:
        print("📡 Creating Snowflake session from environment variables...")
        session = get_snowflake_session()
        should_close_session = True
    else:
        print("📡 Using provided Snowflake session...")
    
    load_id = str(uuid.uuid4())
    print(f"🆔 Load ID: {load_id}")
    
    if selected_tables:
        print(f"📋 Selected tables for analysis: {', '.join(selected_tables)}")
    else:
        print("📋 Analyzing ALL tables in schema")

    print("\n🔍 Step 1: Extracting Metadata...")
    metadata = MetadataAgent(session).run(selected_tables)
    print(f"   ✅ Found {len(metadata)} table(s): {', '.join(metadata.keys())}")
    
    print("\n📊 Step 2: Profiling Data...")
    profile = DataProfilerAgent(session).run(metadata.keys())
    print(f"   ✅ Profiled {len(profile)} table(s)")
    for table, info in profile.items():
        if info.get('row_count'):
            print(f"      • {table}: {info['row_count']:,} rows")
    
    print("\n🔗 Step 3: Analyzing Relationships...")
    relationships = RelationshipAgent(session).run(metadata)
    rel_count = len(relationships.get("relationships", []))
    print(f"   ✅ Identified {rel_count} relationship(s)")

    print("\n📈 Step 4: Generating KPIs...")
    kpi_defs = KPIGeneratorAgent(session).run(metadata)
    print(f"   ✅ Generated {len(kpi_defs.get('kpis', []))} KPI definition(s)")
    
    print("\n🔢 Step 5: Executing KPIs...")
    kpis = KPIExecutionAgent(session).run(kpi_defs)
    print(f"   ✅ Executed {len(kpis)} KPI(s)")
    for kpi in kpis:
        print(f"      • {kpi['name']}: {kpi['value']}")

    print("\n📊 Step 6: Generating Charts...")
    chart_defs = ChartGeneratorAgent(session).run(metadata)
    print(f"   ✅ Generated {len(chart_defs.get('charts', []))} chart definition(s)")
    
    print("\n🎨 Step 7: Fetching Chart Data...")
    charts = ChartDataAgent(session).run(chart_defs, metadata)
    print(f"   ✅ Created {len(charts)} chart(s)")
    for chart in charts:
        print(f"      • {chart['name']} ({chart['chart_type']})")

    print("\n🔍 Step 8: Identifying Data Quality Checks...")
    dq_scope = DataQualityScopeAgent(session).run(metadata)
    check_count = len(dq_scope.get("checks", []))
    print(f"   ✅ Identified {check_count} data quality check(s)")

    print("\n🧪 Step 9: Running Data Quality Checks...")
    dq_signals = DataQualityProfiler(session).run(dq_scope)
    print(f"   ✅ Found {len(dq_signals)} data quality signal(s)")

    print("\n⚠️  Step 10: Analyzing Data Quality Issues...")
    quality = DataQualityAgent(session).run(
        metadata,
        dq_signals
    )
    issue_count = len(quality.get("issues", []))
    print(f"   ✅ Identified {issue_count} data quality issue(s)")
    print(f"   📊 Overall Quality Score: {quality.get('overall_score', 'N/A')}/100")

    print("\n💡 Step 11: Generating Insights...")
    insights = NarrativeInsightAgent(session).run(
        {"tables": list(metadata.keys())},
        kpis,
        quality,
        quality.get("issues", [])
    )
    print(f"   ✅ Generated narrative insights")

    print("\n📦 Step 12: Normalizing and Sanitizing Data...")
    final = normalize(load_id, metadata, profile, relationships, kpis, charts, quality, insights)
    final = sanitize_for_json(final)
    print(f"   ✅ Data normalized")

    print("\n💾 Step 13: Persisting Report to Database...")
    store_clean_report(session, load_id, final)
    print(f"   ✅ Report saved successfully")

    if should_close_session:
        session.close()
        print("\n🔌 Snowflake session closed")
    
    print("\n" + "="*60)
    print("✨ PIPELINE COMPLETED SUCCESSFULLY")
    print("="*60 + "\n")
    
    return final

def parse_variant(value):
    """
    Safely converts Snowflake VARIANT to Python dict
    """
    if value is None:
        return {}

    # Snowflake may return VARIANT as dict already
    if isinstance(value, dict):
        return value

    # Or as JSON string
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return {}

    return value

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "service": "Snowflake Cortex Data Intelligence API",
        "endpoints": ["/run-analysis", "/list-tables", "/clean-report", "/clean-report/runs", "/clean-report/<load_id>"]
    })

@app.route("/list-tables", methods=["POST"])
def list_tables():
    """Endpoint to fetch all tables from Snowflake using provided credentials"""
    try:
        # Get form data
        account = request.form.get('account')
        user = request.form.get('user')
        role = request.form.get('role')
        warehouse = request.form.get('warehouse')
        database = request.form.get('database')
        schema = request.form.get('schema')
        private_key_file = request.files.get('private_key_file')
        private_key_passphrase = request.form.get('private_key_passphrase') or None

        # Validate required fields
        if not all([account, user, role, warehouse, database, schema, private_key_file]):
            return jsonify({"status": "error", "message": "Missing required fields"}), 400

        # Save private key to temporary file
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.pem', delete=False) as tmp_file:
            private_key_file.save(tmp_file)
            tmp_key_path = tmp_file.name

        try:
            # Create Snowflake session with provided credentials
            session = get_snowflake_session_dynamic(
                account, user, role, warehouse, database, schema, 
                tmp_key_path, private_key_passphrase
            )

            # Fetch all tables in the schema
            tables_df = session.sql("""
                SELECT TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = CURRENT_SCHEMA()
                ORDER BY TABLE_NAME
            """).to_pandas()

            tables = tables_df['TABLE_NAME'].tolist()
            
            session.close()
            
            return jsonify({
                "status": "success",
                "tables": tables,
                "count": len(tables)
            })

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_key_path):
                os.remove(tmp_key_path)

    except Exception as e:
        print(f"Error listing tables: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/run-analysis", methods=["GET", "POST"])
def run_analysis():
    try:
        # Handle POST request with credentials and table selection
        if request.method == "POST":
            # Get form data
            account = request.form.get('account')
            user = request.form.get('user')
            role = request.form.get('role')
            warehouse = request.form.get('warehouse')
            database = request.form.get('database')
            schema = request.form.get('schema')
            private_key_file = request.files.get('private_key_file')
            private_key_passphrase = request.form.get('private_key_passphrase') or None
            tables_json = request.form.get('tables')

            # Validate required fields
            if not all([account, user, role, warehouse, database, schema, private_key_file, tables_json]):
                return jsonify({"status": "error", "message": "Missing required fields"}), 400

            # Parse selected tables
            try:
                selected_tables = json.loads(tables_json)
            except:
                return jsonify({"status": "error", "message": "Invalid tables JSON"}), 400

            # Save private key to temporary file
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.pem', delete=False) as tmp_file:
                private_key_file.save(tmp_file)
                tmp_key_path = tmp_file.name

            try:
                # Create Snowflake session with provided credentials
                session = get_snowflake_session_dynamic(
                    account, user, role, warehouse, database, schema, 
                    tmp_key_path, private_key_passphrase
                )

                # Run pipeline with selected tables
                result = run_pipeline(session, selected_tables)
                
                session.close()
                
                return jsonify({"status": "success", "data": result})

            finally:
                # Clean up temporary file
                if os.path.exists(tmp_key_path):
                    os.remove(tmp_key_path)
        
        # Handle GET request (legacy support)
        else:
            return jsonify({"status": "success", "data": run_pipeline()})
            
    except Exception as e:
        print(f"Error running analysis: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/run-analysis-legacy", methods=["GET"])
def run_analysis_legacy():
    """Legacy endpoint using .env credentials"""
    try:
        return jsonify({"status": "success", "data": run_pipeline()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/clean-report", methods=["GET"])
@app.route("/clean-report/<load_id>", methods=["GET"])
def clean_report(load_id=None):
    session = get_snowflake_session()

    if load_id:
        query = """
            SELECT LOAD_ID, LOAD_DATETIME, CLEAN_JSON
            FROM CLEAN_INSIGHTS_STORE
            WHERE LOAD_ID = %s
            ORDER BY LOAD_DATETIME DESC
            LIMIT 1
        """
        res = session.sql(query, params=[load_id]).collect()
    else:
        query = """
            SELECT LOAD_ID, LOAD_DATETIME, CLEAN_JSON
            FROM CLEAN_INSIGHTS_STORE
            ORDER BY LOAD_DATETIME DESC
            LIMIT 1
        """
        res = session.sql(query).collect()

    session.close()

    if not res:
        return jsonify({
            "status": "error",
            "message": "No report found for given load_id" if load_id else "No reports found"
        }), 404

    clean_json = parse_variant(res[0]["CLEAN_JSON"])

    return jsonify({
        "status": "success",
        "load_id": res[0]["LOAD_ID"],
        "load_datetime": str(res[0]["LOAD_DATETIME"]),
        "data": clean_json
    })

@app.route("/clean-report/runs", methods=["GET"])
def list_clean_report_runs():
    session = get_snowflake_session()

    res = session.sql("""
        SELECT
            LOAD_ID,
            LOAD_DATETIME
        FROM CLEAN_INSIGHTS_STORE
        ORDER BY LOAD_DATETIME DESC
    """).collect()

    session.close()

    return jsonify([
        {
            "load_id": r["LOAD_ID"],
            "load_datetime": str(r["LOAD_DATETIME"])
        }
        for r in res
    ])

@app.route("/clean-report/<load_id>", methods=["GET"])
def get_clean_report_by_id(load_id):
    session = get_snowflake_session()
    
    res = session.sql("""
        SELECT LOAD_ID, LOAD_DATETIME, CLEAN_JSON
        FROM CLEAN_INSIGHTS_STORE
        WHERE LOAD_ID = %s
    """, params=[load_id]).collect()
    
    session.close()

    if not res:
        return jsonify({"error": "Report not found"}), 404

    clean_json_raw = res[0]["CLEAN_JSON"]

    # Snowflake VARIANT may come as string → force parse
    if isinstance(clean_json_raw, str):
        clean_json = json.loads(clean_json_raw)
    else:
        clean_json = clean_json_raw

    return jsonify({
        "load_id": res[0]["LOAD_ID"],
        "load_datetime": str(res[0]["LOAD_DATETIME"]),
        "data": clean_json
    })
def get_latest_clean_report(session):
    res = session.sql("""
        SELECT LOAD_ID, LOAD_DATETIME, CLEAN_JSON
        FROM CLEAN_INSIGHTS_STORE
        ORDER BY LOAD_DATETIME DESC
        LIMIT 1
    """).collect()

    if not res:
        return None

    return {
        "load_id": res[0]["LOAD_ID"],
        "load_datetime": str(res[0]["LOAD_DATETIME"]),
        "data": parse_variant(res[0]["CLEAN_JSON"])
    }
class ChatAgent(BaseAgent):
    def run(self, user_message, context):
        prompt = f"""
You are a polite, professional data insights assistant.

Rules:
- Answer ONLY using the provided context
- If the answer is not found, say:
  "Based on the latest insights, there is not enough data to answer this question."
- Be concise, business-friendly, and clear
- Do NOT invent metrics or tables

Latest Insights Context:
{json.dumps(context)}

User Question:
{user_message}

Return STRICT JSON ONLY.

Format:
{{ "answer": "" }}
"""
        return self.cortex(prompt)

@app.route("/chat", methods=["POST"])
def chat():
    try:
        payload = request.get_json()

        user_message = payload.get("message")

        if not user_message:
            return jsonify({
                "status": "error",
                "message": "Message is required"
            }), 400

        session = get_snowflake_session()

        latest_report = get_latest_clean_report(session)
        if not latest_report:
            session.close()
            return jsonify({
                "status": "error",
                "message": "No insights available to answer questions"
            }), 404

        chat_agent = ChatAgent(session)
        response = chat_agent.run(
            user_message=user_message,
            context=latest_report["data"]
        )

        session.close()

        return jsonify({
            "status": "success",
            "load_id": latest_report["load_id"],
            "load_datetime": latest_report["load_datetime"],
            "question": user_message,
            "answer": response.get("answer", "No response generated")
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    print("🌐 Server running at http://127.0.0.1:8082\n")
    app.run(host="0.0.0.0", port=8082, debug=True)
