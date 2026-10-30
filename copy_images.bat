@echo off
echo Cleaning up corrupted images...
if exist "images" (
    del /Q "images\*.*"
) else (
    mkdir "images"
)

echo Copying original images safely...
copy /Y /B "C:\Users\dabhi\.gemini\antigravity\brain\e1d74f77-95b3-4265-82b6-36c6d1e6c89d\*.png" "images\"

echo.
echo All images copied successfully! You can now delete this bat file.
pause
