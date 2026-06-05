# Seka Kama Production Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying Seka Kama to production environments. The platform consists of:
- **Frontend**: Next.js application with interactive maps and dashboards
- **Backend**: FastAPI REST API with ML models and database
- **Infrastructure**: Docker containers, monitoring, and security configurations

## Prerequisites

### System Requirements
- **CPU**: 4+ cores (recommended)
- **Memory**: 8GB RAM minimum, 16GB recommended
- **Storage**: 50GB+ for models and data
- **OS**: Linux (Ubuntu 22.04+ recommended), macOS, or Windows with WSL2

### Required Software
- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **Python**: 3.11+
- **Node.js**: 18+
- **Git**: Latest version
- **PostgreSQL**: 16+ (optional - Supabase is default)

### Required Accounts
1. **Supabase Account**: For database and authentication
2. **Vercel Account**: For frontend deployment
3. **Railway/Render Account**: For backend deployment (or self-host)
4. **Sentry Account**: For error monitoring (optional but recommended)
5. **NVIDIA Account**: For LLM API access (optional)

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/rawscript/Seka_Kama.git
cd Seka_Kama
```

### 2. Set Up Environment
```bash
# Copy example environment files
cp .env.example .env
cp backend/.env.production.example backend/.env

# Edit environment variables
nano .env
nano backend/.env
```

### 3. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up --build -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Detailed Deployment

### Environment Configuration

#### 1. Backend Environment Variables
Create `backend/.env` with:

```env
# === REQUIRED ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
JWT_SECRET_KEY=$(openssl rand -hex 32)

# === LLM Configuration ===
LLM_API_URL=https://integrate.api.nvidia.com/v1
LLM_API_KEY=your-nvidia-api-key
LLM_MODEL=stepfun-ai/step-3.5-flash

# === Monitoring ===
SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io/...
LOGGING_LEVEL=INFO

# === CORS ===
ALLOWED_ORIGINS=https://your-domain.com,https://seka-kama.vercel.app
ALLOW_ALL_ORIGINS=False

# === Feature Flags ===
FEATURE_LIVE_MODE_ENABLED=True
FEATURE_SCENARIO_SIMULATION_ENABLED=True
FEATURE_AI_NARRATIVES_ENABLED=True

# === Database (if not using Supabase) ===
# DATABASE_URL=postgresql://user:password@host:5432/database
# REDIS_URL=redis://:password@host:6379/0
```

#### 2. Frontend Environment Variables
Create `web-app/seka_kama/.env.production` with:

```env
# === API Configuration ===
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
NEXT_PUBLIC_LANDX_TILE_URL=

# === Analytics ===
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=${SENTRY_DSN}

# === Feature Flags ===
NEXT_PUBLIC_ENABLE_ONBOARDING=True
NEXT_PUBLIC_ENABLE_SCENARIOS=True
NEXT_PUBLIC_ENABLE_AI_INSIGHTS=True
```

### Database Setup

#### Option A: Using Supabase (Recommended)
1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and service role key
3. Run the initialization scripts:
```sql
-- Execute in Supabase SQL Editor
\i sql/init_database.sql
\i sql/create_users_table.sql
\i sql/bootstrap.sql
```

#### Option B: Using Self-Hosted PostgreSQL
1. Install PostgreSQL 16+
2. Create database and user:
```bash
sudo -u postgres psql
CREATE DATABASE sekakama;
CREATE USER sekakama WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE sekakama TO sekakama;
```

3. Run initialization scripts:
```bash
psql -h localhost -U sekakama -d sekakama -f backend/sql/init_database.sql
psql -h localhost -U sekakama -d sekakama -f backend/sql/create_users_table.sql
psql -h localhost -U sekakama -d sekakama -f backend/sql/bootstrap.sql
```

### Model Setup

1. **Download pre-trained models** or train your own
2. Place model files in `backend/models/`:
   - `sekanet_xgboost_shp.pkl`
   - `sekanet_scaler_shp.pkl`
   - `feature_names.pkl`

3. Verify models are accessible:
```bash
python backend/check_db.py
```

### Security Configuration

#### 1. SSL/TLS Certificates
```bash
# Using Let's Encrypt with Certbot
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Or using Docker
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  certbot/certbot certonly --nginx
```

#### 2. Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 8000/tcp   # API (if exposed)
sudo ufw enable
```

#### 3. Security Headers
Ensure Nginx configuration includes:
```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';" always;
```

### Monitoring Setup

#### 1. Prometheus & Grafana
```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Prometheus: http://your-domain.com:9090
# Grafana: http://your-domain.com:3001
```

#### 2. Configure Grafana
1. Login to Grafana (admin/grafanaadmin)
2. Add Prometheus as data source
3. Import dashboard from `backend/monitoring/grafana/dashboards/`

#### 3. Alert Configuration
Configure alert channels in Prometheus:
```yaml
# backend/monitoring/alertmanager.yml
route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'cluster', 'service']
  
receivers:
- name: 'slack-notifications'
  slack_configs:
  - channel: '#alerts'
    api_url: 'https://hooks.slack.com/services/...'
```

## Deployment Options

### Option 1: Docker Compose (Self-Hosted)

#### Full Production Stack
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Scale services if needed
docker-compose -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2
```

#### Service-Specific Deployments
```bash
# Backend only
docker-compose -f docker-compose.prod.yml up -d backend postgres redis

# Frontend only
docker-compose -f docker-compose.prod.yml up -d frontend nginx

# Monitoring only
docker-compose -f docker-compose.monitoring.yml up -d
```

### Option 2: Railway Deployment

#### Backend Deployment
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Deploy backend
cd backend
railway up

# Set environment variables
railway variables set SUPABASE_URL=https://...
railway variables set JWT_SECRET_KEY=$(openssl rand -hex 32)
```

#### Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd web-app/seka_kama
vercel --prod

# Set environment variables in Vercel dashboard
```

### Option 3: Kubernetes Deployment

#### Kubernetes Manifests
```yaml
# kubernetes/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sekakama-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sekakama-backend
  template:
    metadata:
      labels:
        app: sekakama-backend
    spec:
      containers:
      - name: backend
        image: sekakama-backend:latest
        ports:
        - containerPort: 8000
        envFrom:
        - secretRef:
            name: sekakama-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Performance Optimization

### 1. Database Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_grid_cells_management_unit ON grid_cells(management_unit);
CREATE INDEX idx_grid_cells_year ON grid_cells(year);
CREATE INDEX idx_grid_cells_location ON grid_cells USING GIST(
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- Partition tables by year
CREATE TABLE grid_cells_2024 PARTITION OF grid_cells
FOR VALUES FROM (2024) TO (2025);
```

### 2. Caching Strategy
```python
# Use Redis for caching
import redis
from functools import lru_cache

# Configure Redis
redis_client = redis.Redis.from_url(
    os.getenv("REDIS_URL"),
    decode_responses=True
)

# Cache expensive operations
@lru_cache(maxsize=100)
def get_baseline_data(management_unit: str, year: int):
    cache_key = f"baseline:{management_unit}:{year}"
    cached = redis_client.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Calculate and cache
    data = calculate_baseline(management_unit, year)
    redis_client.setex(cache_key, 300, json.dumps(data))
    return data
```

### 3. API Performance
- Enable Gzip compression
- Implement response caching headers
- Use connection pooling for database
- Optimize GeoJSON serialization
- Implement pagination for large datasets

## Monitoring & Maintenance

### Health Checks
```bash
# API health check
curl -f https://api.your-domain.com/health

# Database health check
docker exec postgres pg_isready -U sekakama

# Redis health check
docker exec redis redis-cli ping

# Frontend health check
curl -f https://your-domain.com
```

### Log Management
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Log rotation configuration
# /etc/logrotate.d/seka-kama
/var/log/seka-kama/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
```

### Backup Strategy

#### Database Backups
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/seka-kama"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
pg_dump -h localhost -U sekakama sekakama > \
  "$BACKUP_DIR/database_$DATE.sql"

# Backup Redis
docker exec redis redis-cli --rdb /data/dump.rdb
docker cp redis:/data/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Backup models
tar -czf "$BACKUP_DIR/models_$DATE.tar.gz" backend/models/

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/database_$DATE.sql" s3://seka-kama-backups/
```

#### Automated Backups with Cron
```bash
# /etc/cron.d/seka-kama-backup
0 2 * * * root /opt/seka-kama/scripts/backup.sh
0 3 * * 0 root /opt/seka-kama/scripts/full-backup.sh
```

## Disaster Recovery

### Recovery Procedures

#### 1. Database Recovery
```bash
# Restore from backup
psql -h localhost -U sekakama -d sekakama < /backups/database_20240605_020000.sql

# Or using pg_restore for binary backups
pg_restore -h localhost -U sekakama -d sekakama /backups/database_20240605.dump
```

#### 2. Application Recovery
```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore data volumes
tar -xzf /backups/volumes_20240605.tar.gz -C /

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Rollback Deployment
```bash
# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
git checkout v1.5.0
docker-compose -f docker-compose.prod.yml up -d --build
```

### High Availability Setup

#### Load Balancer Configuration
```nginx
# nginx/load-balancer.conf
upstream backend_servers {
    least_conn;
    server backend1.your-domain.com:8000;
    server backend2.your-domain.com:8000;
    server backend3.your-domain.com:8000;
    
    keepalive 32;
}

server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Database Replication
```sql
-- Primary database
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 10;
ALTER SYSTEM SET max_replication_slots = 10;

-- Replica configuration
CREATE SUBSCRIPTION sekakama_replica 
CONNECTION 'host=primary-db port=5432 user=replication password=secret dbname=sekakama'
PUBLICATION sekakama_publication;
```

## Security Hardening

### 1. Container Security
```bash
# Scan for vulnerabilities
docker scan sekakama-backend:latest

# Run as non-root user
FROM python:3.12-slim
RUN useradd -m -u 1000 appuser
USER appuser

# Use security profiles
docker run --security-opt=no-new-privileges --cap-drop=ALL ...
```

### 2. Network Security
```bash
# Create internal network
docker network create --internal sekakama-internal

# Restrict external access
docker run --network sekakama-internal ...
```

### 3. Secret Management
```bash
# Use Docker secrets
echo "my-secret-password" | docker secret create db_password -

# Use in Docker Compose
services:
  backend:
    secrets:
      - db_password

secrets:
  db_password:
    external: true
```

## Scaling

### Horizontal Scaling
```bash
# Scale backend instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=5

# Scale frontend instances
docker-compose -f docker-compose.prod.yml up -d --scale frontend=3
```

### Vertical Scaling
```yaml
# Docker Compose resource limits
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Auto-scaling Configuration
```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sekakama-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sekakama-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database connectivity
docker exec postgres psql -U sekakama -d sekakama -c "SELECT 1;"

# Check network connectivity
docker network inspect sekakama-network

# Check firewall rules
sudo iptables -L -n | grep 5432
```

#### 2. Memory Issues
```bash
# Check container memory usage
docker stats

# Increase memory limits
docker-compose -f docker-compose.prod.yml up -d --scale backend=2

# Configure swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 3. Performance Issues
```bash
# Monitor API response times
curl -w "\nTime: %{time_total}s\n" https://api.your-domain.com/health

# Check database performance
docker exec postgres psql -U sekakama -d sekakama -c "EXPLAIN ANALYZE SELECT * FROM grid_cells LIMIT 100;"

# Monitor slow queries
docker exec postgres psql -U sekakama -d sekakama -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Debug Procedures

#### 1. API Debugging
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test endpoints locally
curl -X POST http://localhost:8000/api/scenarios \
  -H "Content-Type: application/json" \
  -d '{"geometry": {...}}'
```

#### 2. Database Debugging
```sql
-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema') 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

## Support & Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Check health status
- [ ] Review error logs
- [ ] Monitor resource usage
- [ ] Verify backups

#### Weekly
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Clean up old logs
- [ ] Test backup restoration

#### Monthly
- [ ] Security audit
- [ ] Performance review
- [ ] Update SSL certificates
- [ ] Review access logs

### Support Contacts
- **Technical Support**: support@seka-kama.io
- **Security Issues**: security@seka-kama.io
- **Data Inquiries**: data@seka-kama.io
- **Emergency**: ops@seka-kama.io

### Emergency Procedures

#### Service Outage
1. **Assess impact**: Check which services are affected
2. **Check logs**: Review application and infrastructure logs
3. **Failover**: Switch to backup systems if available
4. **Communicate**: Notify users of the issue and expected resolution time
5. **Resolution**: Apply fixes and monitor recovery
6. **Post-mortem**: Document root cause and preventive measures

#### Data Loss
1. **Stop writes**: Prevent further data loss
2. **Assess damage**: Determine what data is lost
3. **Restore backups**: Use latest valid backup
4. **Recover data**: Apply transaction logs if available
5. **Validate**: Verify data integrity
6. **Resume service**: Carefully restart operations

---

## Appendix

### A. Environment Variable Reference
See [.env.production.example](backend/.env.production.example) for complete list.

### B. API Documentation
Available at `https://api.your-domain.com/docs` after deployment.

### C. Monitoring Dashboard URLs
- **Grafana**: `https://your-domain.com:3001`
- **Prometheus**: `https://your-domain.com:9090`
- **AlertManager**: `https://your-domain.com:9093`

### D. Useful Commands
```bash
# Quick deployment check
./deploy.sh --check

# Update all services
./deploy.sh --update

# Rollback to previous version
./deploy.sh --rollback

# Generate deployment report
./deploy.sh --report
```

### E. Performance Benchmarks
| Operation | Expected Performance | Notes |
|-----------|---------------------|-------|
| Baseline data retrieval | < 2s | For 50,000 grid cells |
| Scenario simulation | < 10s | For 1,000 cells, 10-year simulation |
| Map rendering | < 1s | With all layers enabled |
| API health check | < 100ms | Under normal load |
| Database query | < 500ms | Typical spatial queries |

---

*Last Updated: June 2026*  
*Deployment Version: 2.0.0*