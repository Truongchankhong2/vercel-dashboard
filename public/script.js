// --- DOM elements chung ---
const container        = document.getElementById('table-container');
const detailsContainer = document.getElementById('details-container');
const searchResult     = document.getElementById('searchResult');
const lastUpdatedEl    = document.getElementById('last-updated');

const btnRaw           = document.getElementById('btn-raw');
const btnSummary       = document.getElementById('btn-summary');
const btnProgress      = document.getElementById('btn-progress');
const btnRefresh       = document.getElementById('btn-refresh');
const btnDelayUrgent = document.getElementById('btn-delay');

const delayTabs = document.getElementById('delay-tabs');
const btnDelayTab = document.getElementById('btn-delay-tab');
const btnUrgentTab = document.getElementById('btn-urgent-tab');

// Elements cho Progress View
const progressSearchBar = document.getElementById('progress-search-bar');
const progressSearchBox = document.getElementById('progressSearchBox');
const progressBtnSearch = document.getElementById('progressBtnSearch');
const progressBtnClear  = document.getElementById('progressBtnClear');

// đổi tên cho dễ đọc
const headerDisplayMap = {
  'PRO ODER': 'Order Code',
  'Brand Code': 'Brand',
  '#MOLD': 'Loại hàng',
  'Total Qty': 'PO Quantity (Pairs)',
  'STATUS': 'Status-Trạng thái đơn',
  'PU': 'Mã PU',
  'FB': 'Mã Vải',
  'FB DESCRIPTION': 'Tên Vải',
  'LAMINATION MACHINE (PLAN)': 'Plan Machine',
  'LAMINATION MACHINE (REALTIME)': 'Actual Machine',
  'Check': 'Verify'
};
// Track view hiện tại: 'summary' | 'raw' | 'progress' | 'detail'
let currentView   = 'summary';
let currentMachine = null;

// --- Utility functions ---
function updateTimestamp() {
  lastUpdatedEl.textContent = 'Cập nhật: ' + new Date().toLocaleTimeString();
}
function hideSectionBar() {
  const sectionBarEl = document.getElementById('section-bar');
  if (sectionBarEl) sectionBarEl.innerHTML = '';
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
  document.getElementById('title-simple-filter')?.classList.add('hidden');
  document.getElementById('progress-advanced-filter')?.classList.add('hidden');
  document.getElementById('title-advanced-filter')?.classList.add('hidden');
}

function showProgressSearchBar() {
  progressSearchBar.classList.remove('hidden');
  document.getElementById('title-simple-filter')?.classList.remove('hidden');
  document.getElementById('progress-advanced-filter')?.classList.remove('hidden');
  document.getElementById('title-advanced-filter')?.classList.remove('hidden');
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
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity Pair Plan (Kế hoạch)</th>
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
  hideSectionBar();
  // Hiện thanh tìm kiếm Progress:
  showProgressSearchBar();
}

async function searchProgress() {
  setBtnLoading(progressBtnSearch, true);
  container.innerHTML = '';
  hideDetails();
  searchResult.innerHTML = '';

  const keyword = progressSearchBox.value.trim().toLowerCase();
  const selectedField = document.getElementById('progressColumnSelect').value;

  // Lấy dữ liệu từ checkbox + input nâng cao
  const inputs = document.querySelectorAll('.progress-input');
  const checks = document.querySelectorAll('.progress-check');
  const filters = {};
  checks.forEach((checkbox) => {
    if (checkbox.checked) {
      const key = checkbox.dataset.key;
      const input = Array.from(inputs).find(i => i.dataset.key === key);
      if (input && input.value.trim()) {
        filters[key] = input.value.trim().toLowerCase();
      }
    }
  });

  try {
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const fields = [
      'PRO ODER', 'Brand Code', '#MOLD', 'BOM' ,'PU','FB', 'Total Qty', 'STATUS',
      'RECEIVED (MATERIAL)', 'RECEIVED (LOGO)', 'Laminating (Pro)',
      'Prefitting (Pro)', 'Slipting (Pro)', 'Bào (Pro)',
      'Molding Pro (IN)', 'Molding Pro', 'IN lean Line (Pro)',
      'IN lean Line (MACHINE)', 'Out lean Line (Pro)',
      'PACKING PRO', 'Packing date', 'Finish date', 'STORED'
    ];

    const dateFields = [
      'RECEIVED (MATERIAL)', 'RECEIVED (LOGO)', 'Laminating (Pro)',
      'Prefitting (Pro)', 'Slipting (Pro)', 'Bào (Pro)',
      'Molding Pro (IN)', 'Molding Pro', 'IN lean Line (Pro)',
      'IN lean Line (MACHINE)', 'Out lean Line (Pro)',
      'PACKING PRO', 'Packing date', 'Finish date', 'STORED'
    ];

    const excelDateToString = (serial) => {
      const base = new Date(1899, 11, 30);
      const date = new Date(base.getTime() + Math.floor(serial) * 86400000);
      return `${String(date.getDate()).padStart(2, '0')}/` +
             `${String(date.getMonth() + 1).padStart(2, '0')}/` +
             `${date.getFullYear()}`;
    };

    // Lọc dữ liệu theo: chọn 1 cột + checkbox nâng cao
    const filtered = data.filter(row => {
      let matchBasic = true;
      if (keyword && selectedField) {
        const val = (row[selectedField] || '').toString().toLowerCase();
        matchBasic = val.includes(keyword);
      }

      const matchAdvanced = Object.entries(filters).every(([key, val]) => {
        const v = (row[key] || '').toString().toLowerCase();
        return v.includes(val);
      });

      return matchBasic && matchAdvanced;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-red-500">Không tìm thấy dữ liệu khớp.</div>`;
      return;
    }

    // Render kết quả
    let html = '<table class="min-w-full table-auto border-collapse">';
    html += '<thead class="bg-gray-50"><tr>';
    html += `<th class="border px-2 py-1 text-left text-sm font-medium text-gray-700">STT</th>`;
    fields.forEach(key => {
      html += `<th class="border px-2 py-1 text-left text-sm font-medium text-gray-700">${key}</th>`;
    });
    html += '</tr></thead><tbody>';

    filtered.forEach((row, idx) => {
      html += '<tr class="hover:bg-gray-100">';
      html += `<td class="border px-2 py-1 text-sm text-gray-800">${idx + 1}</td>`;
      fields.forEach(key => {
        let cell = row[key] ?? '';
        if (dateFields.includes(key)) {
          const serial = Number(cell);
          if (!isNaN(serial) && serial > 0) {
            cell = excelDateToString(serial);
          } else {
            cell = '';
          }
        }
        html += `<td class="border px-2 py-1 text-sm text-gray-800">${cell}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
    updateTimestamp();

  } catch (err) {
    console.error('[searchProgress error]', err);
    container.innerHTML = `<div class="text-red-500 text-center py-4">Lỗi tìm tiến trình</div>`;
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
function shouldDisplayRow(d, isInitial) {
  const selectedField = document.getElementById('detailsColumnSelect')?.value || '';
  const keyword = document.getElementById('detailsSearchInput')?.value.trim().toUpperCase() || '';

  // Khi click máy lần đầu (không có thao tác tìm kiếm), chỉ lọc theo STATUS
  if (isInitial) {
    return (d['STATUS'] || '').toUpperCase() === `2.${selectedSection.toUpperCase()}`;
  }

  // Nếu chọn "Tất cả" hoặc không nhập gì → hiển thị tất cả
  if (selectedField === 'ALL' || keyword === '') {
    return true;
  }

  // Nếu chọn cột cụ thể và có từ khóa → lọc theo từ khóa
  return (d[selectedField] || '').toString().toUpperCase().includes(keyword);
}
async function loadDetailsClient(machine, isInitial = false, rememberedField = 'ALL', rememberedKeyword = '') {
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

    const selectedColumns = [
      'PRO ODER', 'Brand Code', '#MOLD', 'Total Qty', 'STATUS', 'PU', 'FB', 'FB DESCRIPTION',
      'LAMINATION MACHINE (PLAN)', 'LAMINATION MACHINE (REALTIME)', 'Check'
    ];
    const selectedIndexes = selectedColumns.map(col => headers.indexOf(col));

    const details = rows
      .map(row => {
        const obj = {};
        selectedColumns.forEach((key, j) => {
          obj[key] = row[selectedIndexes[j]] ?? '';
        });
        obj['STATUS'] = row[headers.indexOf('STATUS')] ?? '';
        return obj;
      })
      .filter(d => {
        const selectedField = rememberedField;
        const keyword = rememberedKeyword.trim().toUpperCase();

        if (isInitial) {
          return (d['STATUS'] || '').toUpperCase() === `2.${selectedSection.toUpperCase()}`;
        }

        if (selectedField === 'ALL' || keyword === '') return true;

        return (d[selectedField] || '').toString().toUpperCase().includes(keyword);
      });

    // Sắp xếp
    details.sort((a, b) => {
      const keys = ['PU', 'FB', 'PRO ODER'];
      for (let k of keys) {
        const va = (a[k] || '').toString().toUpperCase();
        const vb = (b[k] || '').toString().toUpperCase();
        if (va < vb) return -1;
        if (va > vb) return 1;
      }
      return 0;
    });

    details.forEach((d, i) => d.STT = i + 1);

    const trueCount = details.filter(d => d['Check'] === 'True' || d['Check'] === true).length;
    const percentVerify = ((trueCount / details.length) * 100).toFixed(1);

    const colorPalette = ['#fef08a', '#a7f3d0', '#fca5a5', '#c4b5fd', '#f9a8d4', '#fde68a', '#bfdbfe', '#6ee7b7'];
    

    const groupKeys = [...new Set(details.map(d => `${d['PU']}_${d['FB']}`))];
    const puFbColorMap = {};
    groupKeys.forEach((key, idx) => {
      puFbColorMap[key] = colorPalette[idx % colorPalette.length];
    });


    let tbodyHTML = '';
    details.forEach(d => {
      const groupKey = `${d['PU']}_${d['FB']}`;
      const bgColor = puFbColorMap[groupKey] || '';

      tbodyHTML += `<tr style="background-color:${bgColor}">`;
      tbodyHTML += `<td class="border px-2 py-1">${d.STT}</td>`;
      selectedColumns.forEach(key => {
        let cellClass = 'border px-2 py-1';
        if (key === 'FB DESCRIPTION') {
          cellClass += ' max-w-[180px] whitespace-normal break-words';
        } else if (key.includes('MACHINE')) {
          cellClass += ' max-w-[150px] truncate';
        }
        tbodyHTML += `<td class="${cellClass}">${d[key]}</td>`;
      });
      tbodyHTML += `</tr>`;
    });

    const html = `
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xl font-bold">Chi tiết máy: ${machine}</h2>
        <button onclick="hideDetails()" class="text-blue-600 underline">Quay lại</button>
      </div>

      <div class="text-right mb-2 text-sm text-gray-700 italic">
        ✅ Tỷ lệ Verify = true: <b style="color:green;">${percentVerify}%</b>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <select id="detailsColumnSelect" class="w-full border px-2 py-1 rounded col-span-3">
          <option value="ALL"${rememberedField === 'ALL' ? ' selected' : ''}>Tất cả (All)</option>
          ${[
            'PRO ODER',
            'Brand Code',
            '#MOLDED',
            'PU',
            'FB DESCRIPTION', // ✅ Thêm dòng này
            'LAMINATION MACHINE (PLAN)',
            'LAMINATION MACHINE (REALTIME)']
            .map(opt => `<option value="${opt}"${rememberedField === opt ? ' selected' : ''}>${opt}</option>`).join('')}
        </select>

        <input id="detailsSearchInput" type="text" placeholder="Nhập từ khóa..." value="${rememberedKeyword}" class="border px-2 py-1 rounded w-full col-span-2">
        <div class="flex gap-2 col-span-1">
          <button id="detailsSearchBtn" class="bg-blue-600 text-white px-4 py-1 rounded w-full">Tìm</button>
          <button id="detailsClearBtn" class="bg-gray-400 text-white px-4 py-1 rounded w-full">Xóa</button>
        </div>
      </div>

      <div class="overflow-x-auto overflow-y-auto max-h-[70vh] whitespace-nowrap">
        <table class="min-w-full text-sm border border-gray-300 bg-white shadow" id="detailsTable">
          <thead class="bg-gray-100 text-left sticky top-0 z-10">
            <tr>
              <th class="border px-2 py-1">STT</th>
              ${selectedColumns.map(h => {
                const displayName = headerDisplayMap[h] || h;
                if (h === 'FB DESCRIPTION') {
                  return `<th class="border px-2 py-1 max-w-[180px] whitespace-normal break-words">${displayName}</th>`;
                }
                const isMachineCol = h.includes('MACHINE');
                return `<th class="border px-2 py-1 ${isMachineCol ? 'max-w-[150px] truncate' : ''}">${displayName}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>${tbodyHTML}</tbody>
        </table>
      </div>
    `;

    detailsContainer.innerHTML = html;

    // Nút tìm
    document.getElementById('detailsSearchBtn').addEventListener('click', () => {
      const field = document.getElementById('detailsColumnSelect').value;
      const keyword = document.getElementById('detailsSearchInput').value.trim();
      loadDetailsClient(currentMachine, false, field, keyword);
    });

    // Nút xóa
    document.getElementById('detailsClearBtn').addEventListener('click', () => {
      document.getElementById('detailsSearchInput').value = '';
      loadDetailsClient(currentMachine, false, rememberedField, '');
    });

  } catch (err) {
    console.error('DETAILS LOAD ERROR:', err);
    detailsContainer.innerHTML = `<div class="text-red-500 text-center py-4">Lỗi tải dữ liệu</div>`;
  }
}







// -----------------------------------
// --- REFRESH BUTTON (F5) ---
btnRefresh.addEventListener('click', () => {
  window.location.reload();
});

// --- KHỞI TẠO: Đăng ký sự kiện ---

btnSummary.addEventListener('click', loadSummary);
btnProgress.addEventListener('click', loadProgress);

btnDelayUrgent.addEventListener('click', () => {
  hideAllViews();
  delayTabs.classList.remove('hidden');
  loadDelayUrgentData('DELAY'); // Mặc định là Delay
});

btnDelayTab.addEventListener('click', () => {
  loadDelayUrgentData('DELAY');
});

btnUrgentTab.addEventListener('click', () => {
  loadDelayUrgentData('URGENT');
});

progressBtnSearch.addEventListener('click', searchProgress);
progressBtnClear.addEventListener('click', clearProgressSearch);

// Biến toàn cục
let selectedSection = 'LAMINATION';
const sectionButtons = [
  { id: 'btn-lamination', label: 'Lamination', value: 'LAMINATION' }
];

// Hàm vẽ nút
function renderSectionButtons() {
  const sectionBar = document.getElementById('section-bar');
  sectionBar.innerHTML = '';
  sectionButtons.forEach(({ id, label, value }) => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = label;
    btn.className = `px-4 py-1 rounded font-medium text-white ${
      selectedSection === value ? 'bg-green-600' : 'bg-gray-400'
    }`;
    btn.onclick = () => {
      selectedSection = value;
      renderSectionButtons();
      renderSummarySection();
    };
    sectionBar.appendChild(btn);
  });
}

// ✅ Đặt HÀM renderSummarySection trước khi gọi loadSummary
async function renderSummarySection() {
  setBtnLoading(btnSummary, true);
  hideDetails();
  hideProgressSearchBar();
  container.innerHTML = '';

  const sectionBarEl = document.getElementById('section-bar');
  if (sectionBarEl) sectionBarEl.innerHTML = '';
  renderSectionButtons();

  try {
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    const data = await res.json();
    const keyword = `2.${selectedSection.toUpperCase()}`;

    const machines = {};
    const sheets = {}; // Số tấm (DL PU)

    data.forEach(row => {
      const status = (row['STATUS'] || '').toUpperCase();
      const machine = row['LAMINATION MACHINE (PLAN)'];
      const qty = Number(row['Total Qty']) || 0;
      const sheet = Number(row['DL PU']) || 0;

      if (status.includes(keyword) && machine) {
        if (!machines[machine]) machines[machine] = 0;
        if (!sheets[machine]) sheets[machine] = 0;

        machines[machine] += qty;
        sheets[machine] += sheet;
      }
    });

    const entries = Object.entries(machines).sort((a, b) => {
      const aNum = parseInt((a[0].match(/\d+/) || ['0'])[0], 10);
      const bNum = parseInt((b[0].match(/\d+/) || ['0'])[0], 10);
      return aNum - bNum;
    });

    let totalAllQty = 0;
    let totalAllSheets = 0;
    let html = `
      <table class="min-w-full divide-y divide-gray-200" id="summary-table">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity Pair Plan</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số Tấm (Sheet)</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
    `;

    entries.forEach(([machine, total]) => {
      const sheetTotal = sheets[machine] || 0;
      totalAllQty += total;
      totalAllSheets += sheetTotal;

      html += `
        <tr data-machine="${machine}" class="hover:bg-gray-100 cursor-pointer">
          <td class="px-6 py-4 text-sm text-gray-900">${machine}</td>
          <td class="px-6 py-4 text-sm text-right text-gray-900">${formatNumber(total)}</td>
          <td class="px-6 py-4 text-sm text-right text-gray-900">${formatNumber(sheetTotal)}</td>
        </tr>
      `;
    });

    html += `
        <tr class="font-bold bg-gray-100">
          <td class="px-6 py-3 text-sm text-gray-700 text-right">Tổng cộng:</td>
          <td class="px-6 py-3 text-sm text-gray-900 text-right">${formatNumber(totalAllQty)}</td>
          <td class="px-6 py-3 text-sm text-gray-900 text-right">${formatNumber(totalAllSheets)}</td>
        </tr>
        </tbody>
      </table>
    `;

    container.innerHTML = html;

    document.querySelectorAll('tbody tr').forEach(tr => {
      const firstCell = tr.querySelector('td');
      const machineName = firstCell?.textContent?.trim();
      if (machineName && machineName !== 'Tổng cộng:') {
        tr.classList.add('hover:bg-gray-100', 'cursor-pointer');
        tr.addEventListener('click', () => {
          currentMachine = machineName;
          loadDetailsClient(machineName, true);
        });
      }
    });

  } catch (err) {
    console.error('[renderSummarySection error]', err);
    container.innerHTML = `<div class="text-red-500 py-4">Lỗi tải dữ liệu section</div>`;
  } finally {
    setBtnLoading(btnSummary, false);
  }
}




// ✅ Gọi đúng thứ tự
function loadSummary() {
  selectedSection = 'LAMINATION';
  renderSectionButtons();
  renderSummarySection();
}

// ==== Đăng ký sự kiện ====

btnSummary.addEventListener('click', loadSummary);
btnProgress.addEventListener('click', loadProgress);
btnRefresh.addEventListener('click', () => window.location.reload());

progressBtnSearch.addEventListener('click', searchProgress);
progressBtnClear.addEventListener('click', clearProgressSearch);

// ✅ Gọi khi load trang xong
window.addEventListener('DOMContentLoaded', () => {
  loadSummary();
});

function hideAllViews() {
  sectionBar.innerHTML = '';
  searchResult.innerHTML = '';
  tableContainer.innerHTML = '';
  detailsContainer.classList.add('hidden');
  progressSearchBar.classList.add('hidden');
  progressAdvancedFilter.classList.add('hidden');
  basicSearchTitle.classList.add('hidden');
  advancedSearchTitle.classList.add('hidden');
  delayTabs.classList.add('hidden');
}
function loadDelayUrgentData(type) {
  fetch('/powerapp.json')
    .then(res => res.json())
    .then(data => {
      const filtered = data.filter(row => (row['Delay/Urgent'] || '').toUpperCase() === type);
      const headers = ['STT', 'PRO ODER', 'Brand Code', '#MOLDED', 'BOM', 'Total Qty', 'Finish date', 'PPC Confirm', 'STORED', 'STATUS'];

      let html = `
        <table class="min-w-full text-sm text-left border">
          <thead class="bg-gray-200">
            <tr>${headers.map(h => `<th class="px-2 py-1 border">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${filtered.map((row, i) => `
              <tr>
                <td class="border px-2 py-1">${i + 1}</td>
                <td class="border px-2 py-1">${row['PRO ODER'] || ''}</td>
                <td class="border px-2 py-1">${row['Brand Code'] || ''}</td>
                <td class="border px-2 py-1">${row['#MOLDED'] || ''}</td>
                <td class="border px-2 py-1">${row['BOM'] || ''}</td>
                <td class="border px-2 py-1">${row['Total Qty'] || ''}</td>
                <td class="border px-2 py-1">${row['Finish date'] || ''}</td>
                <td class="border px-2 py-1">${row['PPC Confirm'] || ''}</td>
                <td class="border px-2 py-1">${row['STORED'] || ''}</td>
                <td class="border px-2 py-1">${row['STATUS'] || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      tableContainer.innerHTML = html;
    });
}
function hideDelayUrgentButtons() {
  btnDelay.classList.add('hidden');
  btnUrgent.classList.add('hidden');
}
// ==== Load Delay hoặc Urgent View ====
function loadDelayUrgentView(type) {
  // Ẩn các phần khác

    document.getElementById('progress-search-bar').classList.add('hidden');
    document.getElementById('progress-advanced-filter').classList.add('hidden');
    document.getElementById('section-bar').classList.add('hidden');
    document.getElementById('details-container').classList.add('hidden');
    document.getElementById('searchResult').innerHTML = '';
    document.getElementById('table-container').innerHTML = '';


  // Hiện bảng chính
  const container = document.getElementById('table-container');
  container.innerHTML = '';

  // Đổi màu nút
  document.getElementById('btn-delay').classList.remove('bg-red-500');
  document.getElementById('btn-urgent').classList.remove('bg-red-500');
  if (type === 'DELAY') {
    document.getElementById('btn-delay').classList.add('bg-red-500');
  } else {
    document.getElementById('btn-urgent').classList.add('bg-red-500');
  }

  // Lọc dữ liệu
  const table = document.createElement('table');
  table.className = 'min-w-full table-auto border border-gray-300';
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr class="bg-gray-200 text-left">
      <th class="border px-2 py-1">STT</th>
      <th class="border px-2 py-1">PRO ODER</th>
      <th class="border px-2 py-1">Brand Code</th>
      <th class="border px-2 py-1">#MOLDED</th>
      <th class="border px-2 py-1">BOM</th>
      <th class="border px-2 py-1">Total Qty</th>
      <th class="border px-2 py-1">Finish Date</th>
      <th class="border px-2 py-1">PPC Confirm</th>
      <th class="border px-2 py-1">STORED</th>
      <th class="border px-2 py-1">STATUS</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  let filtered = jsonData.filter(row => (row['Delay/Urgent'] || '').toUpperCase() === type);

  filtered.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-2 py-1">${i + 1}</td>
      <td class="border px-2 py-1">${row['PRO ODER'] || ''}</td>
      <td class="border px-2 py-1">${row['Brand Code'] || ''}</td>
      <td class="border px-2 py-1">${row['#MOLDED'] || ''}</td>
      <td class="border px-2 py-1">${row['BOM'] || ''}</td>
      <td class="border px-2 py-1">${row['Total Qty'] || ''}</td>
      <td class="border px-2 py-1">${row['Finish date'] || ''}</td>
      <td class="border px-2 py-1">${row['PPC Confirm'] || ''}</td>
      <td class="border px-2 py-1">${row['STORED'] || ''}</td>
      <td class="border px-2 py-1">${row['STATUS'] || ''}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}
