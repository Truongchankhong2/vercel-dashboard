# 1. Kiểm tra trạng thái
git status

# ⇒ Git in ra:
# On branch main
# Your branch is up to date with 'origin/main'.
#
# Changes not staged for commit:
#   (use "git add <file>..." to update what will be committed)
#   (use "git restore <file>..." to discard changes in working directory)
#       modified:   public/powerapp.json
#       modified:   public/script.js
#
# Untracked files:
#   (use "git add <file>..." to include in what will be committed)
#       data/new-data.xlsx

# 2. Thêm toàn bộ thay đổi (bao gồm cả file bị xoá, file mới)
git add --all

# 3. Commit với message
git commit -m "Cập nhật powerapp.json và sửa script.js theo yêu cầu"

# Nếu không có gì mới (ví dụ bạn đã commit trước đó rồi), Git sẽ báo "nothing to commit"

# 4. (Tuỳ chọn) Xem lại commit cuối
git log -1

# 5. Push lên remote origin (branch main)
git push origin main

# Nếu remote khác (vd: tên branch là master), sửa thành
# git push origin master
