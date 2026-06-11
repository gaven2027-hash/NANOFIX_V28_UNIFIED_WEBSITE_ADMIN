@echo off
REM NANOFIX Windows compatibility shim for npm scripts that call: bash tools/safe-next-build.sh
REM Windows PowerShell/CMD cannot run bash unless Git Bash/WSL is installed, so local validation falls back to native Next build.
if /I "%~1"=="tools/safe-next-build.sh" (
  echo NANOFIX Windows build shim: running npx.cmd next build
  npx.cmd next build
  exit /b %ERRORLEVEL%
)
echo NANOFIX Windows build shim only supports tools/safe-next-build.sh
exit /b 1
