@echo off
echo ============================================
echo   OEM RS - Iniciando servidor...
echo ============================================
cd /d "%~dp0"

echo Verificando dependencias...
python -c "import flask" 2>nul || pip install flask --quiet
python -c "import pypdf" 2>nul || pip install pypdf --quiet
python -c "import qrcode" 2>nul || pip install "qrcode[pil]" --quiet
python -c "import reportlab" 2>nul || pip install reportlab --quiet

echo Iniciando servidor Flask...
echo.
echo Acesse: http://localhost:5050
echo.

REM Aguarda 2 segundos e abre o navegador via HTTP (nao via file://)
start /min cmd /c "timeout /t 2 >nul && start http://localhost:5050"

python server.py
pause
