# Test CORS configuration
Write-Host "=== Testing Backend CORS ===" -ForegroundColor Cyan

# Test 1: Health endpoint
Write-Host "`nTest 1: Basic connectivity (health check)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/" -Method GET -ErrorAction Stop
    Write-Host "✓ Backend is responding" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend is not responding: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: CORS preflight
Write-Host "`nTest 2: CORS preflight (OPTIONS request)" -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = "http://localhost:3000"
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "content-type"
    }
    
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/token" `
        -Method OPTIONS `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    if ($corsHeader) {
        Write-Host "✓ CORS preflight successful" -ForegroundColor Green
        Write-Host "  Access-Control-Allow-Origin: $corsHeader" -ForegroundColor Cyan
    } else {
        Write-Host "✗ CORS header missing" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ CORS preflight failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Actual request
Write-Host "`nTest 3: POST request with CORS" -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = "http://localhost:3000"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        username = "test@example.com"
        password = "testpassword"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/token" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✓ POST request successful" -ForegroundColor Green
} catch {
    $corsHeader = $_.Exception.Response.Headers["Access-Control-Allow-Origin"]
    if ($corsHeader) {
        Write-Host "✓ CORS header present (request failed for other reason)" -ForegroundColor Yellow
        Write-Host "  Access-Control-Allow-Origin: $corsHeader" -ForegroundColor Cyan
    } else {
        Write-Host "✗ CORS header missing on actual request" -ForegroundColor Red
    }
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
