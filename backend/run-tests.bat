@echo off
echo Running API Tests...
powershell -ExecutionPolicy Bypass -File "%~dp0test-api.ps1"
pause 