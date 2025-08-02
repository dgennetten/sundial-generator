@echo off
REM Nightly visitor data update script for Windows Task Scheduler
REM Run this via Task Scheduler to automatically update visitor data

REM Set the working directory to the project root
cd /d "%~dp0.."

REM Update visitor data for the last 7 days (GDPR compliant)
echo %date% %time%: Starting nightly visitor data update...
node scripts/updateVisitorData.js 7

REM Check if the update was successful
if %errorlevel% equ 0 (
    echo %date% %time%: Visitor data updated successfully
) else (
    echo %date% %time%: Error updating visitor data
    exit /b 1
) 