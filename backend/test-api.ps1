# Test API Endpoints

# Colors for output
$Green = [System.ConsoleColor]::Green
$Red = [System.ConsoleColor]::Red
$Yellow = [System.ConsoleColor]::Yellow

Write-Host "`n=== Testing User API Endpoints ===`n" -ForegroundColor $Yellow

# Test User Data
$testUser = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
    userType = "JOBSEEKER"
} | ConvertTo-Json

# 1. Test Signup
Write-Host "1. Testing Signup Endpoint..." -ForegroundColor $Yellow
try {
    $signupResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/users/signup" `
        -Method Post `
        -Body $testUser `
        -ContentType "application/json"

    Write-Host "Signup Successful!" -ForegroundColor $Green
    Write-Host "Response: $($signupResponse | ConvertTo-Json)`n"
} catch {
    Write-Host "Signup Failed!" -ForegroundColor $Red
    Write-Host "Error: $($_.Exception.Message)`n"
}

# 2. Test Login
Write-Host "2. Testing Login Endpoint..." -ForegroundColor $Yellow
$loginData = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/users/login" `
        -Method Post `
        -Body $loginData `
        -ContentType "application/json"

    Write-Host "Login Successful!" -ForegroundColor $Green
    Write-Host "Response: $($loginResponse | ConvertTo-Json)`n"
} catch {
    Write-Host "Login Failed!" -ForegroundColor $Red
    Write-Host "Error: $($_.Exception.Message)`n"
}

Write-Host "=== Test Complete ===`n" -ForegroundColor $Yellow 