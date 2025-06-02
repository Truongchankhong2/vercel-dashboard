@echo off
REM ----------------------------------------
REM Batch script để tự động convert Excel thành JSON
REM rồi commit & push lên GitHub
REM ----------------------------------------

REM Chuyển tới thư mục chứa script (đảm bảo .bat được đặt trong thư mục gốc của project)
cd /d "%~dp0"

REM Bước 1: Chạy script Node để convert Powerapp.xlsx thành powerapp.json
REM (File convert-to-json.js phải nằm ở thư mục gốc của project)
node convert-to-json.js

REM Kiểm tra xem convert-to-json.js có chạy thành công không
if errorlevel 1 (
  echo ❌ Convert thất bại. Kiểm tra lại convert-to-json.js!
  pause
  exit /b 1
)

REM Bước 2: Stage tất cả thay đổi
git add .

REM Bước 3: Commit với thông điệp có thời gian hiện tại
REM %date% và %time% sẽ hiển thị theo locale của Windows
set COMMIT_MSG=Auto-update JSON: %date% %time%
git commit -m "%COMMIT_MSG%"

REM Bước 4: Đẩy lên nhánh main (hoặc master tùy repo của bạn)
git push origin main

REM Nếu muốn dừng lại để xem kết quả, bỏ comment dòng bên dưới
pause
