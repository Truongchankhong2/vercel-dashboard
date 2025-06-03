@echo off
REM =====================================================
REM update_git.bat – Tự động add → commit → push mà không cần nhập
REM =====================================================

REM 1. Chuyển đến thư mục chứa file .bat (giả sử đây là gốc project có .git)
cd /d "%~dp0"

REM 2. Kiểm tra có folder .git hay không
if not exist ".git" (
  echo ERROR: Thư mục .git không tìm thấy.
  exit /b 1
)

REM 3. Thêm toàn bộ thay đổi (new, modified, deleted)
git add --all

REM 4. Thực hiện commit với message mặc định (Auto update + timestamp)
REM    Nếu không có thay đổi, dòng commit sẽ báo lỗi, ta chuyển stderr về null để tránh hiển thị
git commit -m "Auto update on %DATE% %TIME%" 2>nul

REM 5. Push lên remote origin, branch hiện tại (HEAD)
REM    Nếu commit ở bước trước không tạo mới (vì không có thay đổi), git push vẫn được gọi
git push origin HEAD

REM 6. Kết thúc mà không “pause”
exit /b 0
