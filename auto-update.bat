@echo off
REM -----------------------------
REM update_git.bat
REM Tự động git add, commit và push
REM -----------------------------

REM 1. Di chuyển đến thư mục chứa script (giả sử file được đặt trong thư mục project):
REM    Nếu bạn double-click trực tiếp hoặc chạy từ cùng thư mục, dòng này không cần thiết.
REM    Nếu muốn chạy từ nơi khác, hãy sửa đường dẫn bên dưới cho phù hợp.
cd /d "%~dp0"

REM 2. Kiểm tra xem thư mục .git có tồn tại không
if not exist ".git" (
    echo Thư mục .git không tồn tại. Hãy chạy update_git.bat trong thư mục project chứa .git.
    pause
    exit /b 1
)

REM 3. Đọc nội dung commit message từ người dùng
set /p COMMIT_MSG=Nhập commit message (nhấn Enter để dùng mặc định): 

REM 4. Nếu người dùng không nhập gì, ta gán một message mặc định
if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Auto update at %DATE% %TIME%
)

echo.
echo ==============================================
echo Đang thực hiện:
echo   git add --all
echo   git commit -m "%COMMIT_MSG%"
echo   git push
echo ==============================================
echo.

REM 5. Thêm tất cả thay đổi
git add --all
if errorlevel 1 (
    echo Lỗi khi git add. Kiểm tra xem Git đã được cài đặt chưa, hoặc kiểm tra xem có thay đổi nào không.
    pause
    exit /b 1
)

REM 6. Commit với message vừa nhập
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo Không có thay đổi để commit, hoặc xảy ra lỗi trong quá trình commit.
    echo (Thông báo lỗi từ Git ở trên)
    pause
    REM Vẫn thử push (nếu có remote mới được commit trước đó), hoặc thoát
    echo Thử git push nếu có commit cũ...
    git push
    pause
    exit /b 0
)

REM 7. Push lên remote (mặc định là origin + branch hiện tại)
git push
if errorlevel 1 (
    echo Lỗi khi git push. Có thể bạn cần kiểm tra quyền, remote hoặc branch.
    pause
    exit /b 1
)

echo.
echo Đã push lên remote thành công!
pause
