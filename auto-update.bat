@echo off
REM =====================================================
REM update_and_convert_debug.bat
REM   - Chuyển powerapp.xlsx → public/powerapp.json
REM   - Git add → commit → push
REM   - In log, dừng (pause) để bạn kiểm tra lỗi
REM =====================================================

REM 1) Chuyển vào thư mục chứa file .bat (gốc project)
cd /d "%~dp0"

echo =============================
echo [1] Kiểm tra node.js…
where node >nul 2>&1
if errorlevel 1 (
  echo !!! Lỗi: Không tìm thấy "node" trong PATH. Hãy cài đặt Node hoặc thêm vào PATH.
  pause
  exit /b 1
) else (
  node --version
)

echo.
echo [2] Kiểm tra convert-to-json.cjs và Excel đầu vào…
if not exist "convert-to-json.cjs" (
  echo !!! Lỗi: Không tìm thấy file convert-to-json.cjs trong %cd%.
  pause
  exit /b 1
)
REM Giả sử Excel nằm ở thư mục data/powerapp.xlsx
if not exist "data\powerapp.xlsx" (
  echo !!! Lỗi: Không tìm thấy data\powerapp.xlsx. Hãy kiểm tra lại đường dẫn.
  pause
  exit /b 1
)

echo "convert-to-json.cjs" và "data\powerapp.xlsx" OK.

echo.
echo [3] Chạy convert-to-json.cjs để tạo public\powerapp.json…
node convert-to-json.cjs
if errorlevel 1 (
  echo !!! Lỗi khi chạy convert-to-json.cjs. Kiểm tra script hoặc đường dẫn.
  pause
  exit /b 1
) else (
  echo Convert thành công → public\powerapp.json đã được cập nhật.
)

echo.
echo [4] Đảm bảo có public\powerapp.json mới…
if not exist "public\powerapp.json" (
  echo !!! Lỗi: Không thấy public\powerapp.json sau khi convert.
  pause
  exit /b 1
) else (
  dir public\powerapp.json
)

echo.
echo [5] Kiểm tra có folder .git hay không…
if not exist ".git" (
  echo !!! Lỗi: Thư mục .git không tồn tại ở %cd%.
  pause
  exit /b 1
) else (
  echo .git OK.
)

echo.
echo [6] Thực hiện git add --all…
git add --all
if errorlevel 1 (
  echo !!! Lỗi khi git add. Kiểm tra Git đã được cài đặt chưa hoặc repo có vấn đề.
  pause
  exit /b 1
) else (
  echo git add thành công.
)

echo.
echo [7] Thực hiện git commit…
git commit -m "Auto update on %DATE% %TIME%" 2>nul
if errorlevel 1 (
  echo (Không có thay đổi để commit hoặc commit bị lỗi; console trên sẽ cho biết chi tiết.)
) else (
  echo git commit thành công.
)

echo.
echo [8] Thực hiện git push…
git push origin HEAD
if errorlevel 1 (
  echo !!! Lỗi khi git push. Kiểm tra remote, quyền, hoặc mạng.
  pause
  exit /b 1
) else (
  echo git push thành công.
)

echo.
echo ===== Hoàn tất update + convert =====
pause
exit /b 0
