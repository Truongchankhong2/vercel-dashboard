@echo off
setlocal

:: ⚙️ Di chuyển vào thư mục gốc của dự án Vercel
cd /d "C:\Users\truong.nx1\Ortholite Vietnam\OVN Production - Documents\PRODUCTION\TRUONG OFFICE\WEEKLY REPORT\WE ARE BETTER\vercel-dashboard"

:: 📁 Copy file Powerapp.xlsx mới vào thư mục /data của project
copy /Y "C:\Users\truong.nx1\Ortholite Vietnam\OVN Production - Documents\PRODUCTION\Hiền\Production Schedule Control\Powerapp.xlsx" ".\data\Powerapp.xlsx"

:: 🔄 Thực hiện commit và push lên GitHub để Vercel tự động redeploy
git add data\Powerapp.xlsx
git commit -m "♻️ Auto update Powerapp.xlsx at %date% %time%"
git push origin main

endlocal
