# Seka Kama System Architecture Diagrams

## 1. Data Flow Diagram (DFD) - Level 0 (Context Diagram)

```mermaid
graph TB
    subgraph "External Entities"
        USER[Conservation Analysts/Researchers]
        NASA[NASA POWER API]
        GBIF[GBIF Species API]
        LLM[NVIDIA NIM LLM Service]
    end

    subgraph "Seka Kama Ecological Digital Twin"
        SYSTEM[Seka Kama Platform]
    end

    subgraph "External Storage"
        SUPABASE[(Supabase PostGIS Database)]
    end

    USER -->|Scenario Requests/Queries| SYSTEM
    SYSTEM -->|Predictions/Visualizations| USER
    
    SYSTEM -->|Climate Data Requests| NASA
    NASA -->|Weather/Rainfall Data| SYSTEM
    
    SYSTEM -->|Species Occurrence Queries| GBIF
    GBIF -->|Prey Species Data| SYSTEM
    
    SYSTEM -->|Narrative Generation Requests| LLM
    LLM -->|Ecological Narratives| SYSTEM
    
    SYSTEM -->|Spatial/User Data| SUPABASE
    SUPABASE -->|Grid Cells/Conservation Data| SYSTEM
```

## 2. Data Flow Diagram (DFD) - Level 1 (System Overview)

```mermaid
graph TB
    subgraph "Input Processing Layer"
        AUTH[Authentication Service]
        INPUT[Request Processing]
        VALID[Input Validation]
    end

    subgraph "Core Business Logic"
        SPATIAL[Spatial Analysis Service]
        PREDICT[ML Prediction Engine]
        SCENARIO[Scenario Processor]
        NARRATIVE[LLM Narrative Service]
    end

    subgraph "Data Enrichment Layer"
        ECO[Ecological Data Service]
        LIVE[Live Data Fetcher]
    end

    subgraph "External APIs"
        NASA[NASA POWER]
        GBIF[GBIF API]
        NIM[NVIDIA NIM]
    end

    subgraph "Data Storage"
        MODELS[(XGBoost Models)]
        DATABASE[(PostGIS Database)]
        AUDIT[(Audit Logs)]
    end

    subgraph "Output Generation"
        RESPONSE[Response Builder]
        EXPORT[Export Service]
    end

    INPUT --> AUTH
    AUTH --> VALID
    VALID --> SPATIAL
    
    SPATIAL --> DATABASE
    DATABASE --> SPATIAL
    
    SPATIAL --> ECO
    ECO --> LIVE
    LIVE --> NASA
    LIVE --> GBIF
    
    ECO --> PREDICT
    MODELS --> PREDICT
    
    PREDICT --> SCENARIO
    SCENARIO --> NARRATIVE
    NARRATIVE --> NIM
    
    SCENARIO --> RESPONSE
    NARRATIVE --> RESPONSE
    
    RESPONSE --> EXPORT
    
    AUTH --> AUDIT
    SCENARIO --> DATABASE
    SCENARIO --> AUDIT
```

## 3. Data Flow Diagram (DFD) - Level 2 (Detailed Process Flow)

```mermaid
graph TB
    subgraph "User Request Processing"
        REQ[Receive Scenario Request]
        GEO[Parse Geometry Data]
        CELLS[Identify Affected Grid Cells]
    end

    subgraph "Live Data Enrichment"
        RAIN[Fetch NASA Rainfall Data]
        PREY[Get GBIF Prey Density]
        HWC[Calculate HWC Risk Score]
        ENRICH[Merge Live Data with Grid Cells]
    end

    subgraph "ML Prediction Pipeline"
        EXTRACT[Extract 43 Feature Vector]
        MODIFY[Apply User Modifications]
        SCALE[StandardScaler Transform]
        XGBOOST[XGBoost Model Inference]
        AGGREGATE[Aggregate by Management Unit]
    end

    subgraph "Narrative Generation"
        PROMPT[Build LLM Context Prompt]
        STREAM[Stream LLM Response]
        FALLBACK[Rule-based Fallback]
    end

    subgraph "Response Assembly"
        GEOJSON[Generate Scenario GeoJSON]
        PERSIST[Save to Scenario History]
        AUDIT_LOG[Log Audit Trail]
        BUILD[Build API Response]
    end

    REQ --> GEO
    GEO --> CELLS
    CELLS --> RAIN
    CELLS --> PREY
    RAIN --> ENRICH
    PREY --> HWC
    HWC --> ENRICH
    
    ENRICH --> EXTRACT
    EXTRACT --> MODIFY
    MODIFY --> SCALE
    SCALE --> XGBOOST
    XGBOOST --> AGGREGATE
    
    AGGREGATE --> PROMPT
    PROMPT --> STREAM
    STREAM --> GEOJSON
    STREAM --> FALLBACK
    
    GEOJSON --> PERSIST
    PERSIST --> AUDIT_LOG
    AUDIT_LOG --> BUILD
```

## 4. UML Component Diagram

```mermaid
graph TB
    subgraph "FastAPI Application Layer"
        subgraph "API Routers"
            AUTH_R[Auth Router]
            MAIN_R[Main API Router] 
            KEYS_R[API Keys Router]
        end
        
        subgraph "Middleware"
            CORS[CORS Middleware]
            PROXY[Proxy Headers]
            INIT[Initialization Middleware]
        end
    end

    subgraph "Core Services Layer"
        subgraph "Authentication"
            AUTH_S[Authentication Service]
            JWT[JWT Handler]
            API_KEY[API Key Manager]
        end
        
        subgraph "Business Logic"
            PRED_S[Prediction Service]
            SPATIAL_S[Spatial Service]
            ECO_S[Ecological Data Service]
            LLM_S[LLM Service]
            AUDIT_S[Audit Service]
        end
    end

    subgraph "Data Access Layer"
        DB_S[Database Service]
        SUPABASE_CLIENT[Supabase Client]
    end

    subgraph "External Integrations"
        NASA_I[NASA POWER Integration]
        GBIF_I[GBIF Integration]
        NVIDIA_I[NVIDIA NIM Integration]
    end

    subgraph "Model Layer"
        XGBOOST_M[XGBoost Model]
        SCALER_M[StandardScaler]
        FEATURES[Feature Names]
    end

    subgraph "Configuration"
        SETTINGS[Settings Manager]
        ENV[Environment Variables]
    end

    AUTH_R --> AUTH_S
    MAIN_R --> PRED_S
    MAIN_R --> SPATIAL_S
    KEYS_R --> API_KEY

    AUTH_S --> JWT
    AUTH_S --> API_KEY
    AUTH_S --> DB_S

    PRED_S --> XGBOOST_M
    PRED_S --> SCALER_M
    PRED_S --> FEATURES

    SPATIAL_S --> DB_S
    ECO_S --> NASA_I
    ECO_S --> GBIF_I
    LLM_S --> NVIDIA_I

    DB_S --> SUPABASE_CLIENT
    
    SETTINGS --> ENV
    
    INIT --> PRED_S
    INIT --> DB_S
```

## 5. UML Class Diagram (Core Services)

```mermaid
classDiagram
    class SupabaseService {
        -client: Client
        +get_grid_cells(management_unit, year, limit) List~Dict~
        +get_grid_cells_by_geometry(geojson, units) List~Dict~
        +save_scenario(user_id, description, modifications) Dict
        +verify_api_key(key_hash) Dict
        +update_user_last_login(user_id) void
    }

    class PredictionService {
        -model: XGBoostModel
        -scaler: StandardScaler
        -feature_names: List~str~
        -feature_indices: Dict~str, int~
        +predict_batch(features) ndarray
        +predict_grid_cells(grid_cells) ndarray
        +run_scenario(baseline_cells, modifications) Dict
        +get_feature_importance() List~Dict~
    }

    class SpatialService {
        +get_affected_cells(supabase, geometry, units) List~Dict~
        +get_baseline_grid(supabase, management_unit, bbox) List~Dict~
        +get_protected_areas(supabase, bbox) List~Dict~
        +geojson_to_wkt(geojson) str
    }

    class EcologicalDataService {
        +fetch_gbif_prey_density(lon, lat, radius) float
        +fetch_real_nasa_annual_rainfall(lon, lat, year) float
        +enrich_cells_with_live_data(cells) List~Dict~
        +get_live_ecosystem_indicators(management_unit) List~Dict~
    }

    class LLMService {
        -client: OpenAI
        +augment_modifications_from_text(query, mods) Dict~str, float~
        +generate_narrative(scenario_request, results) str
        +generate_explanation(features, prediction) str
        -_stream_completion(prompt, max_tokens) str
    }

    class AuthService {
        +verify_password(plain, hashed) bool
        +get_password_hash(password) str
        +create_access_token(data, expires_delta) str
        +get_current_user(credentials, api_key_data) TokenData
        +is_token_revoked(token) bool
    }

    class Settings {
        +DEBUG: bool
        +SUPABASE_URL: str
        +JWT_SECRET_KEY: str
        +MODEL_PATH: str
        +LLM_API_KEY: str
        +validate() void
        +get_cors_config() Dict
    }

    SupabaseService --> PredictionService : provides data
    SpatialService --> SupabaseService : queries spatial data
    EcologicalDataService --> SupabaseService : enriches data
    PredictionService --> LLMService : provides results for narrative
    AuthService --> SupabaseService : validates users
    Settings --> "*" : configures all services
```

## 6. State Diagram (User Session and Authentication)

```mermaid
stateDiagram-v2
    [*] --> Anonymous
    
    Anonymous --> Authenticating : login/register request
    Anonymous --> APIKeyAuth : X-API-Key header provided
    
    Authenticating --> Authenticated : valid credentials
    Authenticating --> Anonymous : invalid credentials
    
    APIKeyAuth --> APIAuthenticated : valid API key
    APIKeyAuth --> Anonymous : invalid API key
    
    Authenticated --> MakingRequest : scenario/data request
    APIAuthenticated --> MakingRequest : API request
    
    MakingRequest --> ProcessingRequest : request validation passed
    MakingRequest --> Error : validation failed
    
    ProcessingRequest --> FetchingSpatialData : geometry provided
    ProcessingRequest --> FetchingBaselineData : baseline request
    
    FetchingSpatialData --> EnrichingData : spatial cells identified
    FetchingBaselineData --> ProcessingComplete : baseline data retrieved
    
    EnrichingData --> FetchingNASAData : climate data needed
    EnrichingData --> FetchingGBIFData : prey data needed
    EnrichingData --> RunningPrediction : live data enriched
    
    FetchingNASAData --> RunningPrediction : NASA data fetched
    FetchingGBIFData --> RunningPrediction : GBIF data fetched
    
    RunningPrediction --> GeneratingNarrative : XGBoost prediction complete
    GeneratingNarrative --> ProcessingComplete : LLM narrative generated
    
    ProcessingComplete --> PersistingScenario : scenario result
    ProcessingComplete --> ReturningResponse : baseline/export result
    
    PersistingScenario --> LoggingAudit : scenario saved
    LoggingAudit --> ReturningResponse : audit logged
    
    ReturningResponse --> Authenticated : JWT user
    ReturningResponse --> APIAuthenticated : API key user
    
    Authenticated --> LoggingOut : logout request
    APIAuthenticated --> [*] : session end
    LoggingOut --> TokenRevoked : token added to revocation list
    TokenRevoked --> [*]
    
    Error --> Anonymous : authentication error
    Error --> Authenticated : processing error (authenticated)
    Error --> APIAuthenticated : processing error (API auth)
```

## 7. State Diagram (Scenario Processing Workflow)

```mermaid
stateDiagram-v2
    [*] --> ReceivingRequest
    
    ReceivingRequest --> ValidatingInput : scenario request received
    
    ValidatingInput --> InvalidInput : validation failed
    ValidatingInput --> ProcessingGeometry : geometry valid
    
    InvalidInput --> [*] : return 400 error
    
    ProcessingGeometry --> NoValidCells : no cells in geometry
    ProcessingGeometry --> CellsIdentified : spatial intersection found
    
    NoValidCells --> [*] : return 400 error
    
    CellsIdentified --> EnrichingWithLiveData : cells retrieved from database
    
    EnrichingWithLiveData --> LiveDataFailed : enrichment error (non-fatal)
    EnrichingWithLiveData --> LiveDataEnriched : NASA/GBIF data added
    LiveDataFailed --> RunningMLPrediction : continue with existing data
    LiveDataEnriched --> RunningMLPrediction
    
    RunningMLPrediction --> MLPredictionFailed : model error
    RunningMLPrediction --> PredictionComplete : scenario vs baseline calculated
    
    MLPredictionFailed --> [*] : return 500 error
    
    PredictionComplete --> GeneratingNarrative : send to LLM service
    
    GeneratingNarrative --> NarrativeFailed : LLM API error
    GeneratingNarrative --> NarrativeGenerated : ecological explanation created
    NarrativeFailed --> UsingFallbackNarrative : rule-based fallback
    
    UsingFallbackNarrative --> AssemblingResponse
    NarrativeGenerated --> AssemblingResponse
    
    AssemblingResponse --> CreatingGeoJSON : build scenario visualization
    CreatingGeoJSON --> SavingToHistory : persist scenario
    
    SavingToHistory --> SaveFailed : database error (non-fatal)
    SavingToHistory --> SaveSuccessful : scenario history updated
    SaveFailed --> LoggingAudit : continue despite save failure
    SaveSuccessful --> LoggingAudit
    
    LoggingAudit --> [*] : return complete response
```

## 8. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS {
        int id PK
        text email UK
        text password_hash
        text full_name
        text organization
        text role
        boolean is_active
        jsonb preferences
        timestamp last_login
        timestamp created_at
    }

    API_KEYS {
        int id PK
        int user_id FK
        text name
        text key_hash UK
        text prefix
        boolean is_active
        timestamp last_used
        timestamp created_at
    }

    GRID_CELLS {
        int cell_id PK
        geometry geom
        geometry centroid
        text management_unit
        float baseline_lion_density
        float all_mean_mean
        float longterm_slope_mean
        float dist_to_protected_km
        float cheetah_abundance
        float pop2018_mean
        float annual_rainfall_mm
        float prey_density
        float hwc_risk_score
        int year
        timestamp created_at
    }

    PROTECTED_AREAS {
        int id PK
        text site_name
        text designation
        text iucn_category
        float area_km2
        geometry geom
        timestamp created_at
    }

    SCENARIO_HISTORY {
        int id PK
        int user_id FK
        text user_description
        jsonb modified_features
        jsonb request_data
        float baseline_total_lions
        float predicted_total_lions
        float delta_lions
        float delta_percent
        text llm_narrative
        int affected_cells
        timestamp created_at
    }

    HISTORICAL_STATS {
        int id PK
        text management_unit
        int year
        float population_estimate
        timestamp created_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        text action
        text resource_type
        text resource_id
        jsonb details
        text ip_address
        text user_agent
        timestamp created_at
    }

    CONTACT_SUBMISSIONS {
        int id PK
        text name
        text email
        text organization
        text message
        text category
        boolean newsletter_signup
        timestamp created_at
    }

    USERS ||--o{ API_KEYS : "owns"
    USERS ||--o{ SCENARIO_HISTORY : "creates"
    USERS ||--o{ AUDIT_LOGS : "generates"
    
    GRID_CELLS }|--|| HISTORICAL_STATS : "management_unit + year"
    
    SCENARIO_HISTORY }o--|| GRID_CELLS : "affects multiple cells"
```

## 9. System Context Diagram (C4 Model - Level 1)

```mermaid
graph TB
    subgraph "Seka Kama Digital Twin Platform"
        PLATFORM[Seka Kama API<br/>FastAPI Application<br/>Ecological prediction engine with<br/>ML models and real-time data integration]
    end

    subgraph "Users"
        ANALYSTS[Conservation Analysts<br/>Create scenarios and analyze<br/>lion population predictions]
        RESEARCHERS[Researchers<br/>Access data via API keys for<br/>academic studies]
        MANAGERS[Conservation Managers<br/>Use insights for wildlife<br/>management decisions]
    end

    subgraph "External Data Sources"
        NASA[NASA POWER API<br/>Climate and weather data<br/>Real-time environmental conditions]
        GBIF[GBIF Species API<br/>Biodiversity occurrence data<br/>Prey species distributions]
        LLM[NVIDIA NIM LLM Service<br/>Natural language processing<br/>Ecological narrative generation]
    end

    subgraph "Data Storage"
        SUPABASE[Supabase PostgreSQL<br/>PostGIS spatial database<br/>User data, grid cells, scenarios]
        MODELS[ML Model Artifacts<br/>XGBoost model, scaler, features<br/>Stored with application]
    end

    subgraph "Deployment Infrastructure"
        VERCEL[Vercel Platform<br/>Serverless deployment<br/>Auto-scaling functions]
        DOCKER[Docker Containers<br/>Back4App, Railway<br/>Alternative deployment]
    end

    ANALYSTS -->|Web Interface Requests| PLATFORM
    RESEARCHERS -->|API Key Requests| PLATFORM
    MANAGERS -->|Dashboard Access| PLATFORM

    PLATFORM -->|Prediction Results| ANALYSTS
    PLATFORM -->|API Responses| RESEARCHERS
    PLATFORM -->|Management Insights| MANAGERS

    PLATFORM -->|Climate Data Queries| NASA
    NASA -->|Weather/Rainfall Data| PLATFORM

    PLATFORM -->|Species Occurrence Queries| GBIF  
    GBIF -->|Biodiversity Data| PLATFORM

    PLATFORM -->|Narrative Generation Requests| LLM
    LLM -->|Ecological Explanations| PLATFORM

    PLATFORM -->|Data Queries/Writes| SUPABASE
    SUPABASE -->|Spatial/User Data| PLATFORM

    PLATFORM -->|Model Loading| MODELS
    MODELS -->|ML Predictions| PLATFORM

    VERCEL -->|Hosts| PLATFORM
    DOCKER -->|Alternative Hosting| PLATFORM
```

## 10. System Architecture Overview

```mermaid
graph TB
    subgraph "Presentation Layer"
        WEB[Web Frontend]
        API[REST API Interface]
        DOCS[API Documentation]
    end

    subgraph "Application Layer"
        subgraph "Authentication & Authorization"
            JWT[JWT Service]
            APIKEY[API Key Service]
            RBAC[Role-Based Access Control]
        end

        subgraph "Core Business Services"
            PREDICTION[Prediction Engine]
            SPATIAL[Spatial Analytics]
            SCENARIO[Scenario Processing]
            NARRATIVE[AI Narrative Generation]
        end

        subgraph "Integration Services"
            NASA_SVC[NASA POWER Service]
            GBIF_SVC[GBIF Species Service]
            LLM_SVC[LLM Integration Service]
        end
    end

    subgraph "Data Layer"
        subgraph "Primary Storage"
            POSTGIS[(PostGIS Database)]
            SPATIAL_IDX[Spatial Indices]
        end

        subgraph "ML Assets"
            XGBOOST[XGBoost Model]
            SCALER[Feature Scaler]
            FEATURES[Feature Schema]
        end

        subgraph "Caching Layer"
            REDIS[(Redis Cache)]
            MEMORY[In-Memory Cache]
        end
    end

    subgraph "External Dependencies"
        NASA_API[NASA POWER API]
        GBIF_API[GBIF Occurrence API]
        NVIDIA_API[NVIDIA NIM API]
    end

    subgraph "Infrastructure Layer"
        MONITORING[Health Monitoring]
        LOGGING[Audit Logging]
        METRICS[Performance Metrics]
    end

    WEB --> API
    API --> JWT
    API --> APIKEY
    JWT --> RBAC
    APIKEY --> RBAC

    RBAC --> PREDICTION
    RBAC --> SPATIAL
    RBAC --> SCENARIO

    PREDICTION --> XGBOOST
    PREDICTION --> SCALER
    PREDICTION --> FEATURES

    SPATIAL --> POSTGIS
    SPATIAL --> SPATIAL_IDX

    SCENARIO --> NARRATIVE
    NARRATIVE --> LLM_SVC

    NASA_SVC --> NASA_API
    GBIF_SVC --> GBIF_API
    LLM_SVC --> NVIDIA_API

    PREDICTION --> REDIS
    SPATIAL --> MEMORY

    SCENARIO --> LOGGING
    RBAC --> MONITORING
    PREDICTION --> METRICS
```

These diagrams comprehensively illustrate the inner workings of the Seka Kama ecological digital twin system, showing data flows, component relationships, state transitions, database structure, and overall system architecture. The system demonstrates a sophisticated integration of machine learning, spatial analysis, real-time data enrichment, and AI-powered narrative generation for wildlife conservation decision support.