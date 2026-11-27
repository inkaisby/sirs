@echo off
title SIIRS - 1-Klik Langsung Masuk Cathlab
chcp 65001 >nul
cls

echo =====================================================================
echo   SIIRS — 1-Klik Langsung Masuk Layanan Tindakan Cathlab
echo   RSUD Dr. M. Soewandhie Surabaya
echo =====================================================================
echo.
echo   Membuka http://localhost:3300/?login=cathlab ...
start http://localhost:3300/?login=cathlab

python -m http.server 3300
if %errorlevel% neq 0 (
    npx serve . -l 3300
)

pause
