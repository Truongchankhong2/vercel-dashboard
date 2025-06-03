@echo off
REM =====================================================
REM update_and_convert.bat – Convert Excel → JSON, rồi add → commit → push
REM =====================================================

REM 1. Chuyển đến thư mục chứa file .bat (gốc project)
cd /d "%~dp0"

REM 2. Kiểm tra có folder .git hay không
if not exist ".git" (
  echo ERROR: Thư mục .git không tìm thấy.
  exit /b 1
)

REM 3. Chạy Node script để convert powerapp.xlsx → public/powerapp.json
REM    Giả sử file convert-to-json.cjs đặt cùng thư mục .bat
node convert-to-json.cjs

REM 4. Thêm toàn bộ thay đổi (bao gồm JSON mới)
git add --all

REM 5. Thực hiện commit với message mặc định (Auto update + timestamp)
REM    Nếu không có thay đổi, git commit lỗi thì bỏ qua
git commit -m "Auto update on %DATE% %TIME%" 2>nul

REM 6. Push lên remote origin, branch hiện tại (HEAD)
git push origin HEAD

REM 7. Kết thúc
exit /b 0
