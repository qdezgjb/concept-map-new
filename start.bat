@echo off
chcp 65001 >nul
echo ========================================
echo Concept Map Auto-Generation System
echo ========================================
echo.

REM Check Python installation
echo [1/5] Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found, please install Python 3.7+
    echo.
    echo Solution:
    echo 1. Visit https://www.python.org/downloads/ to download Python
    echo 2. Check "Add Python to PATH" during installation
    echo 3. Restart command prompt and try again
    echo.
    pause
    exit /b 1
) else (
    echo SUCCESS: Python environment check passed
    python --version
)

REM Check pip availability
echo.
echo [2/5] Checking pip package manager...
pip --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: pip not available, please check Python installation
    pause
    exit /b 1
) else (
    echo SUCCESS: pip check passed
)

REM Check dependencies
echo.
echo [3/5] Checking Python dependencies...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo WARNING: Dependencies not installed, installing now...
    echo Installing dependency packages, please wait...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Dependency installation failed
        echo.
        echo Possible causes:
        echo 1. Network connection issue
        echo 2. Python version incompatibility
        echo 3. Insufficient permissions
        echo.
        echo Solutions:
        echo 1. Check network connection
        echo 2. Run as administrator
        echo 3. Manual installation: pip install -r requirements.txt
        echo.
        pause
        exit /b 1
    ) else (
        echo SUCCESS: Dependencies installed successfully
    )
) else (
    echo SUCCESS: Dependencies check passed
)

REM Check project files
echo.
echo [4/5] Checking project files...
if not exist "llm\app.py" (
    echo ERROR: llm\app.py file not found
    echo Please ensure you are running this script in the correct project directory
    pause
    exit /b 1
)

if not exist "web\index.html" (
    echo ERROR: web\index.html file not found
    echo Please ensure you are running this script in the correct project directory
    pause
    exit /b 1
)

echo SUCCESS: Project files check passed

REM Smart port detection with timeout
echo.
echo [5/5] Finding available port...
set PORT=5000
set MAX_ATTEMPTS=20
set ATTEMPT=0

:port_loop
set /a ATTEMPT+=1
if %ATTEMPT% gtr %MAX_ATTEMPTS% (
    echo ERROR: Cannot find available port after %MAX_ATTEMPTS% attempts
    echo Please close some programs or restart your computer
    pause
    exit /b 1
)

echo Checking port %PORT% (attempt %ATTEMPT%/%MAX_ATTEMPTS%)...

REM Use a more reliable port check method
netstat -an | find ":%PORT%" >nul 2>&1
if errorlevel 1 (
    echo SUCCESS: Port %PORT% is available
    goto port_found
) else (
    echo Port %PORT% is occupied, trying next port...
    set /a PORT+=1
    if %PORT% gtr 5010 (
        echo Resetting to port 5000 and continuing search...
        set PORT=5000
    )
    goto port_loop
)

:port_found
echo.
echo ========================================
echo Environment check completed!
echo ========================================
echo Port: %PORT%
echo Service URL: http://localhost:%PORT%
echo API Endpoint: http://localhost:%PORT%/api/chat
echo ========================================
echo.

REM Switch to llm directory
cd llm
if errorlevel 1 (
    echo ERROR: Cannot switch to llm directory
    pause
    exit /b 1
)

REM Set environment variables
set FLASK_PORT=%PORT%
set FLASK_ENV=development

echo Starting Flask service...
echo Browser will open automatically after service starts
echo.
echo Tips: 
echo - Closing this window will stop Flask service
echo - If browser doesn't open, manually visit: http://localhost:%PORT%
echo - Press Ctrl+C to stop service
echo.

REM Start Flask service
echo Start command: python app.py
echo Port: %PORT%
echo.
python app.py

REM If Flask service exits abnormally, show error info
if errorlevel 1 (
    echo.
    echo ERROR: Flask service exited abnormally (Error code: %errorlevel%)
    echo.
    echo Possible causes:
    echo 1. Python script syntax error
    echo 2. Dependency package version incompatibility
    echo 3. Port occupied by other programs
    echo 4. Insufficient permissions
    echo.
    echo Please check the above issues and try again
    echo.
)

echo.
echo Flask service stopped
echo Press any key to close window...
pause >nul
