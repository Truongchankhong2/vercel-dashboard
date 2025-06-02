@echo off
setlocal

:: 💼 Truy cập thư mục dự án
cd /d "C:\Users\truong.nx1\Ortholite Vietnam\OVN Production - Documents\PRODUCTION\TRUONG OFFICE\WEEKLY REPORT\WE ARE BETTER\vercel-dashboard"

:: 🔍 Thêm file Excel nếu có thay đổi
git add api\Powerapp.xlsx

git diff --cached --quiet
if errorlevel 1 (
    git commit -m "♻️ Auto update Powerapp.xlsx at %date% %time%"
    git push origin main
) else (
    echo ✅ No changes detected. Nothing to push.
)

endlocal
pause
