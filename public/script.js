const container = document.getElementById('table-container');
const detailsContainer = document.getElementById('details-container');
const lastUpdatedEl = document.getElementById('last-updated');
const btnRaw = document.getElementById('btn-raw');
const btnSummary = document.getElementById('btn-summary');

function updateTimestamp() {
  lastUpdatedEl.textContent = new Date().toLocaleTimeString();
}
function setBtnLoading(btn, isLoading) {
  btn.disabled = isLoading;
  btn.textContent = isLoading
    ? 'Loading…'
    : (btn.id === 'btn-raw' ? 'Raw View' : 'Summary View');
}
function formatNumber(num) {
  return Number(num).toLocaleString('en-US');
}
function hideDetails() {
  detailsContainer.innerHTML = '';
  detailsContainer.classList.add('hidden');
}
function showDetails() {
  detailsContainer.classList.remove('hidden');
}

// Summary View (gọi serverless function)
async function loadSummary() {
  setBtnLoading(btnSummary, true);
  hideDetails();
  try {
    const res = await fetch('/api/summary');
    const data = await res.json();
    // ... render giống như trước ...
    updateTimestamp();
  } catch (e) {
    console.error('[ERROR] loadSummary failed:', e);
    container.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tải dữ liệu summary</div>';
  } finally {
    setBtnLoading(btnSummary, false);
  }
}

// Raw View (gọi serverless function)
async function loadRaw() {
  setBtnLoading(btnRaw, true);
  hideDetails();
  try {
    const res = await fetch('/api/data');
    const rows = await res.json();
    // ... render bảng raw như trước ...
    updateTimestamp();
  } catch (e) {
    console.error('[ERROR] loadRaw failed:', e);
    container.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tải dữ liệu raw</div>';
  } finally {
    setBtnLoading(btnRaw, false);
  }
}

btnRaw.addEventListener('click', loadRaw);
btnSummary.addEventListener('click', loadSummary);

// Hàm load chi tiết khi click vào một máy
async function loadDetails(machine) {
  setBtnLoading(btnSummary, true);
  try {
    const res = await fetch(`/api/details?machine=${encodeURIComponent(machine)}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length <= 1) {
      detailsContainer.innerHTML = '<div class="text-center py-4">Không có dữ liệu chi tiết</div>';
    } else {
      // ... render bảng chi tiết ...
      showDetails();
    }
    updateTimestamp();
  } catch (e) {
    console.error('[ERROR] loadDetails failed:', e);
    detailsContainer.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tải dữ liệu chi tiết</div>';
    showDetails();
  } finally {
    setBtnLoading(btnSummary, false);
  }
}
