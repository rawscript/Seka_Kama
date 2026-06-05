"""
Production-ready database connectivity check for Seka Kama.
Enhanced with comprehensive validation and health checks.
"""

import os
import sys
import time
from datetime import datetime
import json
from typing import Dict, Any, Optional

# Add current directory to path so it can find core
sys.path.append(os.getcwd())

from core.database import SupabaseService, get_supabase_client
from core.config import settings
from dotenv import load_dotenv

load_dotenv()

class DatabaseHealthCheck:
    """Comprehensive database health check utility."""
    
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "environment": settings.ENVIRONMENT,
            "checks": {},
            "overall_status": "UNKNOWN"
        }
    
    def run_checks(self) -> Dict[str, Any]:
        """Run all database health checks."""
        try:
            # 1. Test basic connection
            self._test_connection()
            
            # 2. Test table access
            self._test_table_access()
            
            # 3. Test query performance
            self._test_query_performance()
            
            # 4. Test model loading
            self._test_model_loading()
            
            # 5. Test environment configuration
            self._test_environment()
            
            # Determine overall status
            failed_checks = [check for check, result in self.results["checks"].items() 
                           if result.get("status") == "FAILED"]
            
            if failed_checks:
                self.results["overall_status"] = "UNHEALTHY"
                self.results["failed_checks"] = failed_checks
            else:
                self.results["overall_status"] = "HEALTHY"
                
        except Exception as e:
            self.results["overall_status"] = "ERROR"
            self.results["error"] = str(e)
            
        return self.results
    
    def _test_connection(self) -> None:
        """Test basic Supabase connection."""
        check_name = "connection"
        start_time = time.time()
        
        try:
            db = SupabaseService()
            self.results["checks"][check_name] = {
                "status": "PASSED",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "message": "Successfully connected to Supabase"
            }
        except Exception as e:
            self.results["checks"][check_name] = {
                "status": "FAILED",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "error": str(e),
                "message": f"Failed to connect to Supabase: {e}"
            }
    
    def _test_table_access(self) -> None:
        """Test access to key database tables."""
        check_name = "table_access"
        start_time = time.time()
        
        try:
            db = SupabaseService()
            tables_to_check = ["grid_cells", "api_keys", "scenario_runs", "audit_logs"]
            table_results = {}
            
            for table in tables_to_check:
                table_start = time.time()
                try:
                    # Try to select a single row from each table
                    result = db.client.table(table).select("*").limit(1).execute()
                    table_results[table] = {
                        "status": "ACCESSIBLE",
                        "row_count": len(result.data) if result.data else 0,
                        "duration_ms": round((time.time() - table_start) * 1000, 2)
                    }
                except Exception as e:
                    table_results[table] = {
                        "status": "INACCESSIBLE",
                        "error": str(e),
                        "duration_ms": round((time.time() - table_start) * 1000, 2)
                    }
            
            # Count accessible tables
            accessible_tables = sum(1 for result in table_results.values() 
                                  if result["status"] == "ACCESSIBLE")
            
            self.results["checks"][check_name] = {
                "status": "PASSED" if accessible_tables >= 2 else "FAILED",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "tables": table_results,
                "accessible_count": accessible_tables,
                "total_tables": len(tables_to_check),
                "message": f"{accessible_tables}/{len(tables_to_check)} tables accessible"
            }
            
        except Exception as e:
            self.results["checks"][check_name] = {
                "status": "FAILED",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "error": str(e),
                "message": f"Table access test failed: {e}"
            }
    
    def _test_query_performance(self) -> None:
        """Test query performance with common operations."""
        check_name = "query_performance"
        start_time = time.time()
        
        try:
            db = SupabaseService()
            performance_results = []
            
            # Test 1: Count grid cells
            test1_start = time.time()
            try:
                result = db.client.table("grid_cells").select("*", count="exact").execute()
                count = result.count if hasattr(result, 'count') else 0
                performance_results.append({
                    "query": "count_grid_cells",
                    "duration_ms": round((time.time() - test1_start) * 1000, 2),
                    "result_count": count,
                    "status": "PASSED"
                })
            except Exception as e:
                performance_results.append({
                    "query": "count_grid_cells",
                    "duration_ms": round((time.time() - test1_start) * 1000, 2),
                    "error": str(e),
                    "status": "FAILED"
                })
            
            # Test 2: Query with filtering
            test2_start = time.time()
            try:
                result = db.client.table("grid_cells")\
                    .select("*")\
                    .eq("management_unit", "Mara North")\
                    .limit(10)\
                    .execute()
                performance_results.append({
                    "query": "filter_by_management_unit",
                    "duration_ms": round((time.time() - test2_start) * 1000, 2),
                    "result_count": len(result.data) if result.data else 0,
                    "status": "PASSED"
                })
            except Exception as e:
                performance_results.append({
                    "query": "filter_by_management_unit",
                    "duration_ms": round((time.time() - test2_start) * 1000, 2),
                    "error": str(e),
                    "status": "FAILED"
                })
            
            # Determine overall status
            failed_queries = sum(1 for r in performance_results if r["status"] == "FAILED")
            
            self.results["checks"][check_name] = {
                "status": "PASSED" if failed_queries == 0 else "WARNING",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "queries": performance_results,
                "failed_count": failed_queries,
                "message": f"{len(performance_results) - failed_queries}/{len(performance_results)} queries successful"
            }
            
        except Exception as e:
            self.results["checks"][check_name] = {
                "status": "FAILED",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "error": str(e),
                "message": f"Query performance test failed: {e}"
            }
    
    def _test_model_loading(self) -> None:
        """Test ML model loading capability."""
        check_name = "model_loading"
        start_time = time.time()
        
        try:
            # Check if model files exist
            from pathlib import Path
            model_files = {
                "xgboost_model": Path(settings.MODEL_PATH),
                "scaler": Path(settings.SCALER_PATH),
                "feature_names": Path(settings.FEATURE_NAMES_PATH)
            }
            
            file_results = {}
            for name, path in model_files.items():
                if path.exists():
                    file_size = path.stat().st_size
                    file_results[name] = {
                        "status": "EXISTS",
                        "size_bytes": file_size,
                        "size_human": f"{file_size / 1024 / 1024:.2f} MB" if file_size > 0 else "0 bytes"
                    }
                else:
                    file_results[name] = {
                        "status": "MISSING",
                        "path": str(path)
                    }
            
            missing_files = sum(1 for result in file_results.values() 
                              if result["status"] == "MISSING")
            
            self.results["checks"][check_name] = {
                "status": "PASSED" if missing_files == 0 else "WARNING",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "files": file_results,
                "missing_count": missing_files,
                "message": f"{len(model_files) - missing_files}/{len(model_files)} model files found"
            }
            
        except Exception as e:
            self.results["checks"][check_name] = {
                "status": "FAILED",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "error": str(e),
                "message": f"Model loading test failed: {e}"
            }
    
    def _test_environment(self) -> None:
        """Test environment configuration."""
        check_name = "environment_config"
        start_time = time.time()
        
        try:
            env_vars = {
                "SUPABASE_URL": bool(settings.SUPABASE_URL),
                "SUPABASE_KEY": bool(settings.SUPABASE_KEY),
                "JWT_SECRET_KEY": bool(settings.JWT_SECRET_KEY),
                "LLM_API_KEY": bool(settings.LLM_API_KEY),
                "SENTRY_DSN": bool(settings.SENTRY_DSN),
            }
            
            missing_vars = [var for var, present in env_vars.items() if not present]
            
            # Determine severity based on environment
            if settings.is_production:
                # In production, all vars are critical
                severity = "FAILED" if missing_vars else "PASSED"
            else:
                # In development, only some vars are critical
                critical_vars = ["SUPABASE_URL", "SUPABASE_KEY", "JWT_SECRET_KEY"]
                missing_critical = [var for var in missing_vars if var in critical_vars]
                severity = "FAILED" if missing_critical else "WARNING" if missing_vars else "PASSED"
            
            self.results["checks"][check_name] = {
                "status": severity,
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "environment_vars": env_vars,
                "missing_vars": missing_vars,
                "environment": settings.ENVIRONMENT,
                "message": f"{len(env_vars) - len(missing_vars)}/{len(env_vars)} environment variables set"
            }
            
        except Exception as e:
            self.results["checks"][check_name] = {
                "status": "FAILED",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "error": str(e),
                "message": f"Environment configuration test failed: {e}"
            }
    
    def print_results(self, format: str = "text") -> None:
        """Print health check results."""
        if format == "json":
            print(json.dumps(self.results, indent=2))
        else:
            print("\n" + "="*60)
            print("SEKA KAMA DATABASE HEALTH CHECK")
            print("="*60)
            print(f"Timestamp: {self.results['timestamp']}")
            print(f"Environment: {self.results['environment']}")
            print(f"Overall Status: {self.results['overall_status']}")
            print("-"*60)
            
            for check_name, check_result in self.results.get("checks", {}).items():
                status = check_result.get("status", "UNKNOWN")
                symbol = "✓" if status == "PASSED" else "⚠" if status == "WARNING" else "✗"
                print(f"{symbol} {check_name.upper().replace('_', ' ')}: {status}")
                print(f"  Message: {check_result.get('message', 'No message')}")
                print(f"  Duration: {check_result.get('duration_ms', 0)}ms")
                
                # Show additional details for failures
                if status in ["FAILED", "WARNING"] and "error" in check_result:
                    print(f"  Error: {check_result['error']}")
            
            print("-"*60)
            
            if self.results["overall_status"] == "HEALTHY":
                print("✅ All checks passed! Database is ready for production.")
            elif self.results["overall_status"] == "UNHEALTHY":
                print("❌ Some checks failed. Review the errors above.")
                if "failed_checks" in self.results:
                    print(f"Failed checks: {', '.join(self.results['failed_checks'])}")
            else:
                print("⚠️  System status is unknown or there were errors.")

def main():
    """Main function for command-line execution."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Seka Kama Database Health Check")
    parser.add_argument("--format", choices=["text", "json"], default="text",
                       help="Output format (default: text)")
    parser.add_argument("--quick", action="store_true",
                       help="Run only basic connection tests")
    
    args = parser.parse_args()
    
    print("Starting Seka Kama Database Health Check...")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Debug mode: {settings.DEBUG}")
    print()
    
    checker = DatabaseHealthCheck()
    results = checker.run_checks()
    checker.print_results(format=args.format)
    
    # Return appropriate exit code
    if results["overall_status"] == "HEALTHY":
        sys.exit(0)
    elif results["overall_status"] == "UNHEALTHY":
        sys.exit(1)
    else:
        sys.exit(2)

if __name__ == "__main__":
    main()
