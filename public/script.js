// --- DOM elements chung ---
const container        = document.getElementById('table-container');
const detailsContainer = document.getElementById('details-container');
const searchResult     = document.getElementById('searchResult');
const lastUpdatedEl    = document.getElementById('last-updated');

const btnRaw           = document.getElementById('btn-raw');
const btnSummary       = document.getElementById('btn-summary');
const btnProgress      = document.getElementById('btn-progress');
const btnRefresh       = document.getElementById('btn-refresh');

// Elements cho Progress View
const progressSearchBar = document.getElementById('progress-search-bar');
const progressSearchBox = document.getElementById('progressSearchBox');
const progressBtnSearch = document.getElementById('progressBtnSearch');
const progressBtnClear  = document.getElementById('progressBtnClear');

// Track view hiện tại: 'summary' | 'raw' | 'progress' | 'detail'
let currentView   = 'summary';
let currentMachine = null;

// --- Utility functions ---
function updateTimestamp() {
  lastUpdatedEl.textContent = 'Cập nhật: ' + new Date().toLocaleTimeString();
}

function setBtnLoading(btn, isLoading) {
  btn.disabled = isLoading;
  if (!btn) return;
  if (btn.id === 'btn-raw') {
    btn.textContent = isLoading ? 'Loading…' : 'Raw View';
  } else if (btn.id === 'btn-summary') {
    btn.textContent = isLoading ? 'Loading…' : 'Summary View';
  } else if (btn.id === 'btn-progress') {
    btn.textContent = isLoading ? 'Loading…' : 'Progress';
  } else if (btn.id === 'btn-refresh') {
    btn.textContent = isLoading ? 'Loading…' : 'Refresh';
  } else if (btn.id === 'progressBtnSearch') {
    btn.textContent = isLoading ? 'Loading…' : 'Tìm Progress';
  }
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

function hideProgressSearchBar() {
  progressSearchBar.classList.add('hidden');
}

function showProgressSearchBar() {
  progressSearchBar.classList.remove('hidden');
}

// -----------------------------------
// --- RAW VIEW (dữ liệu gốc) ---
// -----------------------------------
async function loadRaw() {
  currentView = 'raw';
  currentMachine = null;
  setBtnLoading(btnRaw, true);

  hideDetails();
  hideProgressSearchBar();
  searchResult.innerHTML = '';
  container.innerHTML = '';

  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu raw</div>';
    } else {
      let html = '<table class="min-w-full table-auto border-collapse">';
      html += '<thead class="bg-gray-50"><tr>';
      // Header: Cột 1, 2, ….
      rows[0].forEach((_, i) => {
        html += `<th class="border px-2 py-1 text-left text-sm font-medium text-gray-700">Cột ${i + 1}</th>`;
      });
      html += '</tr></thead><tbody>';
      // Mỗi hàng
      rows.slice(1).forEach(r => {
        html += '<tr class="hover:bg-gray-100">';
        r.forEach(cell => {
          html += `<td class="border px-2 py-1 text-sm text-gray-800">${cell ?? ''}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    }
    updateTimestamp();
  } catch (e) {
    console.error('[ERROR] loadRaw failed:', e);
    container.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tải dữ liệu raw</div>';
  } finally {
    setBtnLoading(btnRaw, false);
  }
}

// -----------------------------------
// --- SUMMARY VIEW (tổng hợp máy) ---
// -----------------------------------
async function loadSummary() {
  currentView = 'summary';
  currentMachine = null;
  setBtnLoading(btnSummary, true);

  hideDetails();
  hideProgressSearchBar();
  searchResult.innerHTML = '';
  container.innerHTML = '';

  try {
    const res = await fetch('/api/summary', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu summary</div>';
      return;
    }

    // Phân nhóm có tên máy (non–blank) trước, rồi blank
    const withMachine = data.filter(d => d.machine?.trim());
    const withoutMachine = data.filter(d => !d.machine?.trim());
    withMachine.sort((a, b) => {
      const aNum = parseInt((a.machine.match(/\d+$/) || ['0'])[0], 10);
      const bNum = parseInt((b.machine.match(/\d+$/) || ['0'])[0], 10);
      return aNum - bNum;
    });
    const sorted = [...withMachine, ...withoutMachine];

    let html = `
      <table id="summary-table" class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
    `;
    let totalAll = 0;
    sorted.forEach(({ machine, total }) => {
      totalAll += total;
      html += `
        <tr data-machine="${machine}" class="hover:bg-gray-100 cursor-pointer">
          <td class="px-6 py-4 text-sm text-gray-900">${machine || '<blank>'}</td>
          <td class="px-6 py-4 text-sm text-gray-900 text-right">${formatNumber(total)}</td>
        </tr>
      `;
    });
    html += `
        <tr class="font-bold bg-gray-100">
          <td class="px-6 py-3 text-sm text-gray-700 text-right">Tổng cộng:</td>
          <td class="px-6 py-3 text-sm text-gray-900 text-right">${formatNumber(totalAll)}</td>
        </tr>
        </tbody>
      </table>
    `;
    container.innerHTML = html;

    // Khi click vào một máy sẽ load chi tiết (nếu muốn)
    document.querySelectorAll('#summary-table tbody tr[data-machine]').forEach(tr => {
      tr.addEventListener('click', () => {
        const machine = tr.dataset.machine;
        loadDetailsClient(machine);
      });
    });

    updateTimestamp();
  } catch (e) {
    console.error('[ERROR] loadSummary failed:', e);
    container.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tải dữ liệu summary</div>';
  } finally {
    setBtnLoading(btnSummary, false);
  }
}

// -----------------------------------
// --- PROGRESS VIEW (tiến trình RPRO) ---
// -----------------------------------
async function loadProgress() {
  currentView = 'progress';
  currentMachine = null;

  // Ẩn các view khác:
  hideDetails();
  container.innerHTML = '';
  searchResult.innerHTML = '';
  updateTimestamp();

  // Hiện thanh tìm kiếm Progress:
  showProgressSearchBar();
}

async function searchProgress() {
  setBtnLoading(progressBtnSearch, true);
  container.innerHTML = '';
  hideDetails();
  searchResult.innerHTML = '';

  try {
    const query = progressSearchBox.value.trim().toUpperCase();
    if (!query) {
      container.innerHTML = '<div class="text-center py-4">Vui lòng nhập mã RPRO để tìm.</div>';
      return;
    }

    // Lấy JSON:
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Các key cần lấy từ JSON:
    const fields = [
      'PRO ODER',
      'Brand Code',
      'Product Type',
      'Total Qty',
      'Status',
      'RECEIVED (MATERIAL)',
      'RECEIVED (LOGO)',
      'Laminating (Pro)',
      'Prefitting (Pro)',
      'Slipting (Pro)',
      'Bào (Pro)',
      'Molding Pro (IN)',
      'Molding Pro',
      'IN lean Line (Pro)',
      'IN lean Line (MACHINE)',
      'Out lean Line (Pro)',
      'PACKING PRO',
      'Packing date',
      'Finish date',
      'STORED'
    ];

    // Lọc các hàng có PRO ODER chứa query:
    const filtered = data.filter(row => {
      const code = (row['PRO ODER'] || '').toString().toUpperCase();
      return code.includes(query);
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="text-center py-4">Không tìm thấy RPRO nào chứa “${progressSearchBox.value}”.</div>`;
      return;
    }

    // Xây bảng với cột STT + các field trên:
    let html = '<table class="min-w-full table-auto border-collapse">';
    // Header:
    html += '<thead class="bg-gray-50"><tr>';
    html += `<th class="border px-2 py-1 text-left text-sm font-medium text-gray-700">STT</th>`;
    fields.forEach(key => {
      html += `<th class="border px-2 py-1 text-left text-sm font-medium text-gray-700">${key}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Dữ liệu:
    filtered.forEach((row, idx) => {
      html += '<tr class="hover:bg-gray-100">';
      html += `<td class="border px-2 py-1 text-sm text-gray-800">${idx + 1}</td>`;
      fields.forEach(key => {
        const cell = row[key] ?? '';
        html += `<td class="border px-2 py-1 text-sm text-gray-800">${cell}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
    updateTimestamp();
  } catch (e) {
    console.error('[ERROR] searchProgress failed:', e);
    container.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tìm tiến trình RPRO</div>';
  } finally {
    setBtnLoading(progressBtnSearch, false);
  }
}

function clearProgressSearch() {
  progressSearchBox.value = '';
  container.innerHTML = '';
}

// -----------------------------------
// --- DETAILS VIEW (nếu cần) ---
// -----------------------------------
async function loadDetailsClient(machine) {
  currentView = 'detail';
  currentMachine = machine;

  detailsContainer.classList.remove('hidden');
  detailsContainer.innerHTML = '<div class="text-center py-4">Loading chi tiết…</div>';

  try {
    const res = await fetch(`/api/details?machine=${encodeURIComponent(machine)}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      detailsContainer.innerHTML = `<div class="text-center py-4">Không có dữ liệu cho máy ${machine}</div>`;
      return;
    }

    const [headers, ...rows] = data;

    // Các cột cần hiển thị
    const selectedColumns = [
      'PRO ODER', 'Brand code', '#MOLDED', 'Total Qty', 'STATUS', 'PU',
      'LAMINATION MACHINE (PLAN)', 'LAMINATION MACHINE (REALTIME)', 'Check'
    ];
    const selectedIndexes = selectedColumns.map(col => headers.indexOf(col));
    const headerRow = selectedColumns;

    // Cột có thể tìm kiếm
    const searchableOptions = [
      'PRO ODER', 'Brand code', '#MOLDED', 'PU',
      'LAMINATION MACHINE (PLAN)', 'LAMINATION MACHINE (REALTIME)'
    ];

    let html = `
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xl font-bold">Chi tiết máy: ${machine}</h2>
        <button onclick="hideDetails()" class="text-blue-600 underline">Quay lại</button>
      </div>

      <div class="flex gap-2 mb-3">
        <select id="detailsColumnSelect" class="border px-2 py-1 rounded">
          ${searchableOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>
        <input id="detailsSearchInput" type="text" placeholder="Nhập từ khóa..." class="border px-2 py-1 flex-1 rounded">
        <button id="detailsSearchBtn" class="bg-blue-600 text-white px-4 py-1 rounded">Tìm kiếm</button>
      </div>

      <div class="overflow-auto max-h-[70vh]">
        <table class="min-w-full text-sm border border-gray-300 bg-white shadow" id="detailsTable">
          <thead class="bg-gray-100 text-left">
            <tr>
              <th class="border px-2 py-1">STT</th>
              ${headerRow.map(h => {
  const isMachineCol = h.includes('MACHINE');
  return `<th class="border px-2 py-1 ${isMachineCol ? 'max-w-[150px] truncate' : ''}">${h}</th>`;
}).join('')}

            </tr>
          </thead>
          <tbody>
            ${rows.map((row, idx) => {
              return `<tr>
                <td class="border px-2 py-1">${idx + 1}</td>
                ${selectedIndexes.map(i => {
  const isMachineCol = headers[i].includes('MACHINE');
  return `<td class="border px-2 py-1 ${isMachineCol ? 'max-w-[150px] truncate' : ''}">${row[i]}</td>`;
}).join('')}

              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    detailsContainer.innerHTML = html;

    // Tìm kiếm khi nhấn nút
    document.getElementById('detailsSearchBtn').addEventListener('click', () => {
  const keyword = document.getElementById('detailsSearchInput').value.trim().toLowerCase();
  const column = document.getElementById('detailsColumnSelect').value;

  const colIndex = selectedColumns.indexOf(column); // 🟢 Sửa điểm này

  const table = document.getElementById('detailsTable');
  const rows = table.querySelectorAll('tbody tr');

  rows.forEach(row => {
    const cell = row.querySelectorAll('td')[colIndex + 1]; // +1 vì có STT
    const text = cell?.textContent.toLowerCase() || '';
    row.style.display = text.includes(keyword) ? '' : 'none';
  });
});


  } catch (err) {
    console.error('DETAILS LOAD ERROR:', err);
    detailsContainer.innerHTML = `<div class="text-red-500 text-center py-4">Lỗi tải dữ liệu</div>`;
  }
}






// -----------------------------------
// --- REFRESH BUTTON (F5) ---
// -----------------------------------
btnRefresh.addEventListener('click', () => {
  window.location.reload();
});

// -----------------------------------
// --- KHỞI TẠO: Đăng ký sự kiện ---
// -----------------------------------
btnRaw.addEventListener('click', loadRaw);
btnSummary.addEventListener('click', loadSummary);
btnProgress.addEventListener('click', loadProgress);

progressBtnSearch.addEventListener('click', searchProgress);
progressBtnClear.addEventListener('click', clearProgressSearch);

// Khi load trang, mặc định cho Summary:
loadSummary();
