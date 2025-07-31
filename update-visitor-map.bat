@echo off
cd /d "C:\Users\dougl\GIT\sundial-generator"
echo Starting visitor map update...
npm run update-and-deploy
echo Update completed at %date% %time%
pause
