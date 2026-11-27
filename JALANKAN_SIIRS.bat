@echo off
title SIIRS RSUD Dr. M. Soewandhie - Server Lokalhost
chcp 65001 >nul
cls

echo =====================================================================
echo   SIIRS — Sistem Informasi Integrasi Rumah Sakit
echo   RSUD Dr. M. Soewandhie Surabaya
echo =====================================================================
echo.
echo   [1/2] Membuka SIIRS di browser (http://localhost:3300)...
start http://localhost:3300

echo   [2/2] Menjalankan web server lokal di port 3300...
echo.
echo   -------------------------------------------------------------------
echo   * URL Lokalhost: http://localhost:3300
echo   * Login 1-Klik Cathlab: http://localhost:3300/?login=cathlab
echo   * Database: Terhubung ke Supabase Cloud (Shared IDIK-App)
echo   * Tekan Ctrl + C untuk menghentikan server lokal.
echo   -------------------------------------------------------------------
echo.

python -m http.server 3300
if %errorlevel% neq 0 (
    echo Python tidak ditemukan, beralih ke npx serve...
    npx serve . -l 3300
)

pause
