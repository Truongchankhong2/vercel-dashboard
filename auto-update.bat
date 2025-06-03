@echo off
REM =====================================================
REM update_and_convert.bat – Chuyển powerapp.xlsx → JSON, rồi add → commit → push tất cả
REM =====================================================

REM 1. Chuyển đến thư mục chứa file .bat (giả sử đây là gốc project có .git)
cd /d "%~dp0"

REM 2. Kiểm tra có folder .git hay không
if not exist ".git" (
  echo ERROR: Thư mục .git không tìm thấy.
  exit /b 1
)

REM 3. Chạy Node script để convert powerapp.xlsx → public/powerapp.json
REM    (Giả sử file convert-to-json.cjs nằm cùng thư mục với .bat)
node convert-to-json.cjs

REM 4. Thêm toàn bộ thay đổi (bao gồm JSON mới)
git add --all

REM 5. Thực hiện commit với message mặc định (Auto update + timestamp)
REM    Nếu không có thay đổi, git commit sẽ báo lỗi, ta chuyển stderr về null để né cảnh báo
git commit -m "Auto update on %DATE% %TIME%" 2>nul

REM 6. Push lên remote origin, branch hiện tại (HEAD)
git push origin HEAD

REM 7. Kết thúc
exit /b 0
