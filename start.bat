@echo off
title PDF Extractor Frontend
cd /d "%~dp0"

if not exist "node_modules\" (
    echo Installation des dependances...
    npm install
)

echo Demarrage du frontend sur http://localhost:5173
npm run dev
