@echo off
cd /d "C:\Users\truong.nx1\Ortholite Vietnam\OVN Production - Documents\PRODUCTION\TRUONG OFFICE\WEEKLY REPORT\WE ARE BETTER\vercel-dashboard"

echo ✅ Đang sao chép Powerapp.xlsx vào thư mục /data...
copy /Y "C:\Users\truong.nx1\Ortholite Vietnam\OVN Production - Documents\PRODUCTION\Hiền\Production Schedule Control\Powerapp.xlsx" ".\data\Powerapp.xlsx"

echo 🔄 Đang chuyển đổi Powerapp.xlsx sang powerapp.json...
call node convert-to-json.js

echo 🌀 Đang cập nhật Git...
git add .
git commit -m "♻️ Auto update at %date% %time%"
git push origin main

echo ✅ Hoàn tất cập nhật!
pause
