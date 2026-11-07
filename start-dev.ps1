# ==============================================================================
# Script de inicio rápido de desarrollo (Backend + Frontend)
# Uso: .\start-dev.ps1
# ==============================================================================

Write-Host "Iniciando TikTok Library en modo desarrollo..." -ForegroundColor Cyan

# 1. Verificar entorno virtual de Python
$venvPython = ".\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "Creando entorno virtual en backend\.venv..." -ForegroundColor Yellow
    python -m venv .\backend\.venv
    & $venvPython -m pip install -r .\backend\requirements.txt
}

# 2. Iniciar Backend FastAPI en una ventana independiente
Write-Host "Arrancando Backend FastAPI en http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\.venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --reload --port 8000"

# 3. Iniciar Frontend Vite en la ventana actual o independiente
Write-Host "Arrancando Frontend Vite en http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nAmbos servicios iniciados:" -ForegroundColor Cyan
Write-Host "  -> Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  -> Backend API: http://127.0.0.1:8000/api/docs" -ForegroundColor White
