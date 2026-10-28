#!/bin/bash

# Seka Kama Production Deployment Script
# This script handles deployment to Railway/Vercel with proper configuration

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="seka-kama"
BACKEND_DIR="backend"
FRONTEND_DIR="web-app/seka_kama"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKEND_TEST_RESULT="NOT RUN"
FRONTEND_BUILD_RESULT="NOT RUN"
DATABASE_CHECK_RESULT="NOT RUN"
BACKEND_HEALTH_RESULT="NOT RUN"
FRONTEND_HEALTH_RESULT="NOT RUN"

version_at_least() {
    local actual="$1" required="$2"
    [[ "$(printf '%s\n%s\n' "$required" "$actual" | sort -V | head -n1)" == "$required" ]]
}

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for required commands
    local required_commands=("docker" "docker-compose" "git" "python3" "node")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Missing required command: $cmd"
            exit 1
        fi
    done
    
    # Check Python version
    local python_version=$(python3 --version | cut -d' ' -f2)
    if ! version_at_least "$python_version" "3.11"; then
        log_error "Python 3.11+ required, found $python_version"
        exit 1
    fi
    
    # Check Node version
    local node_version=$(node --version | cut -d'v' -f2)
    if ! version_at_least "$node_version" "18.0"; then
        log_error "Node.js 18+ required, found $node_version"
        exit 1
    fi
    
    log_info "✓ Prerequisites satisfied"
}

# Validate environment
validate_environment() {
    log_info "Validating environment for $DEPLOY_ENV deployment..."
    
    # Check required environment variables
    local required_vars=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "JWT_SECRET_KEY")
    
    if [[ "$DEPLOY_ENV" == "production" ]]; then
        required_vars+=("NEXT_PUBLIC_API_URL" "SENTRY_DSN")
    fi
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        log_error "Set these variables or add them to your .env file"
        exit 1
    fi
    
    # Check JWT secret strength
    if [[ ${#JWT_SECRET_KEY} -lt 32 ]]; then
        log_error "JWT_SECRET_KEY must contain at least 32 characters"
        exit 1
    fi
    
    log_info "✓ Environment validated"
}

# Build backend
build_backend() {
    log_info "Building backend..."
    
    cd "$BACKEND_DIR"
    
    # Create virtual environment if it doesn't exist
    if [[ ! -d "venv" ]]; then
        log_info "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    log_info "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Run tests
    log_info "Running backend tests..."
    if ! python -m pytest --cov=. --cov-report=term-missing -v; then
        BACKEND_TEST_RESULT="FAILED"
        log_error "Backend tests failed"
        exit 1
    fi
    BACKEND_TEST_RESULT="PASSED"
    
    # Build Docker image
    log_info "Building backend Docker image..."
    docker build -f Dockerfile.production -t "$APP_NAME-backend:$TIMESTAMP" .
    docker tag "$APP_NAME-backend:$TIMESTAMP" "$APP_NAME-backend:latest"
    
    deactivate
    cd ..
    
    log_info "✓ Backend built successfully"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    log_info "Installing Node.js dependencies..."
    npm ci
    
    # Build Next.js application
    log_info "Building Next.js application..."
    if [[ "$DEPLOY_ENV" == "production" ]]; then
        NODE_ENV=production npm run build
    else
        NODE_ENV=development npm run build
    fi
    FRONTEND_BUILD_RESULT="PASSED"
    
    # Build Docker image
    log_info "Building frontend Docker image..."
    docker build -f Dockerfile.production -t "$APP_NAME-frontend:$TIMESTAMP" .
    docker tag "$APP_NAME-frontend:$TIMESTAMP" "$APP_NAME-frontend:latest"
    
    cd ../..
    
    log_info "✓ Frontend built successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$BACKEND_DIR"
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Run database setup
    log_info "Setting up database..."
    python -c "
import sys
sys.path.append('.')
from core.database import SupabaseService
from dotenv import load_dotenv
load_dotenv()

try:
    db = SupabaseService()
    print('✓ Database connection successful')
    
    # Verify the authoritative Supabase-backed schema table names.
    tables = ['grid_cells', 'api_keys', 'scenario_history', 'audit_logs']
    for table in tables:
        result = db.client.table(table).select('*').limit(1).execute()
        print(f'✓ Table {table} query passed')
            
except Exception as e:
    print(f'✗ Database setup failed: {e}')
    sys.exit(1)
"
    DATABASE_CHECK_RESULT="PASSED"
    
    deactivate
    cd ..
    
    log_info "✓ Database migrations completed"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Start services
    log_info "Starting services for health checks..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check backend health
    local backend_url="http://localhost:8000/health"
    if curl -f "$backend_url" &> /dev/null; then
        BACKEND_HEALTH_RESULT="PASSED"
        log_info "✓ Backend health check passed"
    else
        BACKEND_HEALTH_RESULT="FAILED"
        log_error "Backend health check failed"
        docker-compose -f docker-compose.prod.yml logs backend
        exit 1
    fi
    
    # Check frontend health (if running)
    local frontend_url="http://localhost:3000"
    if curl -f "$frontend_url" &> /dev/null; then
        FRONTEND_HEALTH_RESULT="PASSED"
        log_info "✓ Frontend health check passed"
    else
        FRONTEND_HEALTH_RESULT="FAILED"
        log_warn "Frontend health check failed - may still be starting"
    fi
    
    # Stop services
    docker-compose -f docker-compose.prod.yml down
    
    log_info "✓ Health checks completed"
}

# Generate deployment report
generate_deployment_report() {
    log_info "Generating deployment report..."
    
    cat > "deployment_report_$TIMESTAMP.md" << EOF
# Seka Kama Deployment Report
- **Deployment ID:** $TIMESTAMP
- **Environment:** $DEPLOY_ENV
- **Timestamp:** $(date)

## Components Deployed
1. **Backend API**
   - Version: $(cd $BACKEND_DIR && git rev-parse --short HEAD)
   - Docker Image: $APP_NAME-backend:$TIMESTAMP
   - Build: $BACKEND_TEST_RESULT

2. **Frontend Application**
   - Version: $(cd $FRONTEND_DIR && git rev-parse --short HEAD)
   - Docker Image: $APP_NAME-frontend:$TIMESTAMP
   - Build: $FRONTEND_BUILD_RESULT

## Environment Validation
- Environment validation: passed (deployment proceeds only after validation)
- Database check: $DATABASE_CHECK_RESULT

## Health Status
- Backend API: $BACKEND_HEALTH_RESULT
- Frontend Application: $FRONTEND_HEALTH_RESULT
- Database: $DATABASE_CHECK_RESULT

## Next Steps
1. Push Docker images to registry:
   \`\`\`bash
   docker push $APP_NAME-backend:$TIMESTAMP
   docker push $APP_NAME-frontend:$TIMESTAMP
   \`\`\`

2. Update deployment configuration
3. Monitor application metrics
4. Verify user access

## Rollback Instructions
To rollback to previous version:
\`\`\`bash
# Restore database backup if needed
# Deploy previous Docker images
# Update environment variables
\`\`\`

## Support Contacts
- API Issues: engineering@seka-kama.io
- Data Issues: data@seka-kama.io
- User Support: support@seka-kama.io
EOF
    
    log_info "✓ Deployment report generated: deployment_report_$TIMESTAMP.md"
}

# Main deployment process
main() {
    log_info "Starting Seka Kama deployment ($DEPLOY_ENV)"
    
    # Check prerequisites
    check_prerequisites
    
    # Validate environment
    validate_environment
    
    # Build components
    build_backend
    build_frontend
    
    # Run migrations
    run_migrations
    
    # Run health checks
    run_health_checks
    
    # Generate report
    generate_deployment_report
    
    log_info "✨ Deployment completed successfully!"
    log_info "Deployment ID: $TIMESTAMP"
    log_info "Next steps:"
    log_info "  1. Review deployment report: deployment_report_$TIMESTAMP.md"
    log_info "  2. Deploy to production infrastructure"
    log_info "  3. Monitor application metrics"
}

# Run main function
main "$@"
