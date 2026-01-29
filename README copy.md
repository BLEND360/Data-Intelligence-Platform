# Blend360 Enterprise Data Intelligence Platform

A full-stack intelligent data analytics platform that combines **Snowflake Cortex AI** with a modern React dashboard to provide automated data warehouse analysis, visualization, and conversational insights with **dynamic credential management** and **selective table analysis**.

## 🚀 Overview8

**Blend360 Enterprise Data Intelligence Platform** is an enterprise-grade solution that leverages AI agents to automatically analyze your Snowflake data warehouse, generating:

- 🔐 **Dynamic Credential Management** - Configure Snowflake connections via UI with secure .pem file upload
- 📋 **Selective Table Analysis** - Choose specific tables to analyze with "Select All" option
- 📊 **Automated KPIs** - AI-generated business metrics
- 📈 **Dynamic Charts** - Intelligent visualizations with fallback mechanisms
- 🔍 **Data Quality Assessment** - AI SQL-based validation, fixes and scoring
- 🔗 **Relationship Mapping** - Automatic table relationship inference
- 💬 **Conversational AI** - Natural language querying of insights
- 📝 **Executive Summaries** - Narrative insights for stakeholders

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  • TypeScript + Vite + shadcn/ui                           │
│  • Dashboard, Charts, Chat Interface                        │
│  • Real-time data visualization                             │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST API
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Flask Backend                             │
│  • Multi-Agent AI System                                    │
│  • Snowflake Cortex Integration                             │
│  • Dynamic SQL Generation & Repair                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ Snowpark + JDBC
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Snowflake Data Cloud                           │
│  • Cortex AI (Mistral-Large2)                              │
│  • Data Warehouse Tables                                    │
│  • INFORMATION_SCHEMA                                       │
│  • CLEAN_INSIGHTS_STORE                                     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Backend
- **Language**: Python 3.8+
- **Framework**: Flask 2.x with Flask-CORS
- **Database**: Snowflake Connector Python + Snowpark
- **AI**: Snowflake Cortex (`mistral-large2`)
- **Auth**: Private Key (RSA PKCS#8)
- **Utilities**: Cryptography, JSON parsing, Regex

#### Frontend
- **Language**: TypeScript 5.8
- **Framework**: React 18.3
- **Build Tool**: Vite 5.4
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4
- **Charts**: Recharts 2.15
- **State**: React Context + TanStack Query
- **Routing**: React Router DOM 6.30

## 📂 Project Structure

```
data-insights-hub-main/
├── backend/
│   ├── app.py                    # Main Flask application
│   ├── .env                      # Environment configuration
│   ├── CLARITY_SERVICE_ACCOUNT.pem  # Private key for auth
│   └── README.md                 # Backend documentation
├── frontend/
│   ├── src/
│   │   ├── components/           # UI components
│   │   │   ├── ui/              # shadcn/ui components (40+)
│   │   │   ├── ChatbotSlider.tsx
│   │   │   ├── DomainInsights.tsx
│   │   │   └── ...
│   │   ├── contexts/            # React contexts
│   │   ├── pages/               # Route components
│   │   ├── types/               # TypeScript definitions
│   │   └── App.tsx              # Root component
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── README.md                # Frontend documentation
└── README.md                    # This file
```

## 🎯 Key Features

### 1. Dynamic Connection Configuration

**NEW**: Configure Snowflake connections directly from the UI without editing .env files:
- **Credential Input Form**: Enter account, user, role, warehouse, database, schema
- **Secure File Upload**: Upload private key (.pem) files with validation
- **Table Selection**: Browse and select specific tables for analysis
- **Select All Option**: Quickly analyze all available tables

**Workflow:**
1. Click "Load Analysis" button
2. Enter Snowflake credentials in slider form
3. Upload .pem private key file
4. Click "Connect & Fetch Tables"
5. Select desired tables with checkboxes
6. Click "Run Analysis" to start pipeline

### 2. AI-Powered Multi-Agent System

The backend implements specialized agents for different analysis tasks:

- **MetadataAgent**: Extracts schema information (tables, columns, types) with table filtering
- **DataProfilerAgent**: Profiles data (row counts, distributions)
- **RelationshipAgent**: Infers FK relationships using AI
- **KPIGeneratorAgent**: Creates business metrics using Cortex AI
- **KPIExecutionAgent**: Executes and validates KPI SQL
- **ChartGeneratorAgent**: Designs visualizations with AI
- **ChartDataAgent**: Renders charts with dynamic repair
- **DataQualityScopeAgent**: AI determines quality check targets
- **DataQualityProfiler**: Executes SQL validation checks
- **DataQualityAgent**: Analyzes quality signals with AI
- **NarrativeInsightAgent**: Generates executive summaries
- **ChatAgent**: Conversational interface for querying insights

### 3. Dynamic SQL Repair

Intelligent fallback mechanism when AI-generated SQL fails:
```python
def repair_chart_sql(chart, metadata):
    # Selects safe dimension columns (DATE, DEVICE_TYPE, etc.)
    # Picks numeric columns for aggregation
    # Constructs valid GROUP BY with LIMIT
    return repaired_sql
```

### 4. Comprehensive Data Quality & Transformation

**NEW**: Combined data quality and transformation view:
- Three-tier quality assessment with scores
- SQL validation for nulls, duplicates, invalid dates
- AI-generated fix suggestions with actionable steps
- Merged display showing "Issue:" and "Action:" for each problem
- Single unified section to avoid duplication

### 5. Interactive Dashboard

Modern React UI featuring:
- Real-time data visualization with Recharts
- Dark/light theme toggle
- Responsive grid layouts
- Loading states and error handling
- AI chat sidebar with context-aware responses
- Connection configuration slider with step-by-step workflow

### 6. Conversational AI

Natural language interface:
- Context-aware responses based on latest analysis
- Message history
- Fallback responses when data not available

## 🚦 Getting Started

### Prerequisites

**Backend:**
- Python 3.8+
- Snowflake account with Cortex enabled
- Private key for authentication (.pem format) - **Can now be provided via UI**

**Frontend:**
- Node.js 18+ or Bun runtime
- npm/yarn/bun package manager

### Quick Start

#### Option 1: UI-Based Configuration (Recommended)

1. **Start Backend** (minimal .env setup for legacy endpoints only)
```bash
cd backend
pip install flask flask-cors snowflake-connector-python snowflake-snowpark-python cryptography

# Minimal .env for /clean-report endpoint (optional)
cat > .env << EOF
SNOWFLAKE_USER=service_account
SNOWFLAKE_ACCOUNT=account.region
SNOWFLAKE_WAREHOUSE=warehouse
SNOWFLAKE_DATABASE=database
SNOWFLAKE_SCHEMA=schema
SNOWFLAKE_ROLE=role
PRIVATE_KEY_PATH=./key.pem
PRIVATE_KEY_PASSPHRASE=
EOF

python app.py
```

2. **Start Frontend**
```bash
cd frontend
npm install  # or: bun install
npm run dev  # or: bun dev
```

3. **Configure via UI**
   - Navigate to `http://localhost:8080`
   - Click "Load Analysis" button
   - Enter Snowflake credentials
   - Upload your .pem private key file
   - Select tables to analyze
   - Run analysis

#### Option 2: Traditional .env Configuration

```bash
cd backend

# Install dependencies
pip install flask flask-cors snowflake-connector-python snowflake-snowpark-python cryptography

# Configure environment
cat > .env << EOF
SNOWFLAKE_USER=your_username
SNOWFLAKE_ACCOUNT=your_account.region
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema
SNOWFLAKE_ROLE=your_role
PRIVATE_KEY_PATH=./CLARITY_SERVICE_ACCOUNT.pem
PRIVATE_KEY_PASSPHRASE=your_passphrase
EOF

# Create required Snowflake table
# Run in Snowflake:
# CREATE TABLE CLEAN_INSIGHTS_STORE (
#   LOAD_ID VARCHAR(255),
#   LOAD_DATETIME TIMESTAMP_NTZ,
#   CLEAN_JSON VARIANT
# );

# Start server
python app.py
```

Backend runs on `http://127.0.0.1:8082`
cd frontend

# Install dependencies
npm install
# or: bun install

# Start development server
npm run dev
# or: bun run dev
```

Frontend runs on `http://localhost:8080`

#### 3. Access the Application

1. Open browser to `http://localhost:8080`
2. Login with any credentials (demo mode)
3. Dashboard automatically fetches latest analysis
4. Click "Run New Analysis" to trigger backend pipeline

## 🔄 Data Flow

### Complete Analysis Pipeline

```
User Request → Frontend Dashboard
     ↓
GET /run-analysis → Backend Flask
     ↓
1. MetadataAgent → Extract schema
2. DataProfilerAgent → Count rows
3. RelationshipAgent → Infer FK relationships (Cortex AI)
4. KPIGeneratorAgent → Design KPIs (Cortex AI)
5. KPIExecutionAgent → Execute KPI SQL
6. ChartGeneratorAgent → Design charts (Cortex AI)
7. ChartDataAgent → Execute chart SQL (with repair)
8. DataQualityScopeAgent → Determine check scope (Cortex AI)
9. DataQualityProfiler → Run SQL validations
10. DataQualityAgent → Analyze quality (Cortex AI)
11. NarrativeInsightAgent → Generate summary (Cortex AI)
12. Store in CLEAN_INSIGHTS_STORE
     ↓
JSON Response → Frontend
     ↓
DomainInsights Component → Render UI
```

### Chat Flow

```
User Message → ChatbotSlider
     ↓
POST /chat → Backend ChatAgent
     ↓
1. Fetch latest report from CLEAN_INSIGHTS_STORE
2. Send message + context to Cortex AI
3. Generate contextual answer
     ↓
JSON Response → Frontend
     ↓
Display message + Text-to-Speech option
```

## 📊 API Reference

### Backend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/run-analysis` | Trigger full analysis pipeline |
| GET | `/clean-report` | Get latest report |
| GET | `/clean-report/<load_id>` | Get specific report |
| GET | `/clean-report/runs` | List all report runs |
| POST | `/chat` | Conversational AI query |

### Response Schema

```json
{
  "status": "success",
  "data": {
    "meta": {
      "load_id": "uuid",
      "generated_at": "2024-01-01T00:00:00",
      "schema_analyzed": "PROD_SCHEMA"
    },
    "summary": {
      "tables_count": 25,
      "kpis_count": 4,
      "charts_count": 4,
      "quality_score": 85
    },
    "understanding": {
      "total_tables": 25,
      "tables": [{ "table": "USERS", "columns": 12, "rows": 50000 }],
      "relationships": [{ "table1": "ORDERS", "table2": "USERS", "relationship": "USER_ID" }]
    },
    "kpis": [
      { "name": "Total Revenue", "value": 1500000, "sql": "SELECT SUM(amount)..." }
    ],
    "charts": [
      {
        "name": "Daily Sales",
        "chart_type": "line",
        "x_axis": "DATE",
        "y_axis": "VALUE",
        "sample_data": [{ "DATE": "2024-01-01", "VALUE": 1000 }]
      }
    ],
    "data_quality": {
      "overall_score": 85,
      "issues": [{ "table": "ORDERS", "column": "EMAIL", "issue": "Missing values", "suggested_fix": "..." }]
    },
    "transformations": [],
    "insights": {
      "summary": "Your data warehouse contains 25 tables...",
      "key_points": ["Main domains: Sales, Marketing", "Total tables: 25"]
    }
  }
}
```

## 🔧 Configuration

### Backend Environment Variables

```bash
# Snowflake Connection
SNOWFLAKE_USER=your_username
SNOWFLAKE_ACCOUNT=abc12345.us-west-2
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=PROD_DB
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ANALYST

# Authentication
PRIVATE_KEY_PATH=./service_account.pem
PRIVATE_KEY_PASSPHRASE=your_passphrase
```

### Frontend Configuration

Update backend URL in fetch calls (for production):
```typescript
// In Dashboard.tsx, ChatbotSlider.tsx
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8080';
const response = await fetch(`${BACKEND_URL}/clean-report`);
```

## 🧪 Testing

### Backend Testing
```bash
# Test health endpoint
curl http://localhost:8080/

# Test analysis
curl http://localhost:8080/run-analysis

# Test latest report
curl http://localhost:8080/clean-report

# Test chat
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the data quality score?"}'
```

### Frontend Testing
```bash
# Build and check for errors
npm run build

# Run linter
npm run lint
```

## 📈 Performance

### Backend
- **Analysis pipeline**: 30-60 seconds (depends on schema size)
- **Cortex AI calls**: ~2-5 seconds each
- **Table profiling**: Limited to 15 tables
- **Chart data**: Limited to 20 rows per chart

### Frontend
- **Initial load**: < 2 seconds
- **Chart rendering**: < 500ms
- **Theme switching**: Instant
- **Build size**: ~500KB (gzipped)

## 🛡️ Security

### Backend
- Private key authentication (RSA 2048-bit)
- No password storage
- CORS enabled for localhost (configure for production)
- Environment-based secrets

### Frontend
- Mock authentication (replace in production)
- localStorage for demo purposes
- No sensitive data in client
- HTTPS required for production

## 🐛 Troubleshooting

### Common Issues

**Backend not connecting to Snowflake:**
- Verify private key format (PKCS#8 DER)
- Check public key is added to Snowflake user
- Confirm account identifier format

**Frontend can't reach backend:**
- Ensure backend is running on port 8080
- Check CORS configuration
- Verify fetch URLs

**Charts not rendering:**
- Check sample_data format
- Ensure x_axis/y_axis keys exist
- Look for null values

**Cortex AI not responding:**
- Verify Cortex is enabled in your region
- Check role privileges
- Confirm model name is correct

## 📝 Development

### Adding New Agents

```python
class NewAgent(BaseAgent):
    def run(self, context):
        return self.cortex(f"""
        Your prompt here...
        Context: {json.dumps(context)}
        Format: {{ "result": "" }}
        """)
```

### Adding New Frontend Components

```tsx
// src/components/NewComponent.tsx
export function NewComponent() {
  return <div>Your component</div>;
}

// Add to Dashboard.tsx or other pages
import { NewComponent } from '@/components/NewComponent';
```

### Adding shadcn/ui Components

```bash
npx shadcn-ui@latest add [component-name]
```

## 🚀 Deployment

### Backend (Production)

1. Use production-grade WSGI server:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8080 app:app
```

2. Configure CORS for your domain:
```python
CORS(app, origins=['https://yourdomain.com'])
```

3. Use environment variables for secrets

### Frontend (Production)

1. Build for production:
```bash
npm run build
```

2. Deploy `dist/` folder to:
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - Azure Static Web Apps

3. Update backend URLs in code

## 📚 Documentation

- [Backend README](backend/README.md) - Detailed backend documentation
- [Frontend README](frontend/README.md) - Detailed frontend documentation

## 🤝 Contributing

1. Follow existing code structure
2. Use TypeScript for frontend
3. Add docstrings for Python functions
4. Test all changes locally
5. Update READMEs for new features

## 📄 License

Proprietary - Data Insights Hub

## 👥 Team

Data Insights Hub Development Team

## 🆘 Support

For issues, questions, or feature requests, contact the development team.

---

**Built with ❄️ Snowflake Cortex AI | ⚛️ React | 🐍 Python**
