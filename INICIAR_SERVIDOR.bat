@echo off
echo ============================================
echo   OEM RS - Iniciando servidor...
echo ============================================
cd /d "%~dp0"
start "" "%~dp0oem_rs.html"
python server.py
pause
