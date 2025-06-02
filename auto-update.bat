@echo off
cd /d "%~dp0"

echo --------------------------
echo ✅ BẮT ĐẦU CẬP NHẬT DỮ LIỆU
echo --------------------------

:: Chạy convert Powerapp.xlsx -> powerapp.json
echo 🔄 Đang chuyển đổi Powerapp.xlsx sang powerapp.json...
node convert-to-json.js
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Lỗi khi convert dữ liệu. Dừng lại.
    pause
    exit /b
)

:: Thêm file JSON vào git
echo 📝 Đang thêm file mới vào git...
git add public/powerapp.json

:: Commit với thời gian hiện tại
set now=%date% %time%
git commit -m "Auto update at %now%"

:: Push lên GitHub
echo ⬆️  Đang đẩy dữ liệu lên GitHub...
git push

echo --------------------------
echo ✅ HOÀN TẤT CẬP NHẬT
echo --------------------------
pause
