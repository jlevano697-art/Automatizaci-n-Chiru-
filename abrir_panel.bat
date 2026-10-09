@echo off
cd /d "%~dp0"
echo Abriendo el panel de contenido de Chiru...
echo (Cierra esta ventana para apagar el panel)
node scripts\panel_server.mjs
pause
