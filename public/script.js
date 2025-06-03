// public/script.js

// --- DOM elements ---
const container = document.getElementById('table-container');
const detailsContainer = document.getElementById('details-container');
const searchBox = document.getElementById('searchBox');
const searchField = document.getElementById('searchField');
const btnSearch = document.getElementById('btnSearch');
const btnClearSearch = document.getElementById('btnClearSearch');
const searchResult = document.getElementById('searchResult');
const lastUpdatedEl = document.getElementById('last-updated');
const btnRaw = document.getElementById('btn-raw');
const btnSummary = document.getElementById('btn-summary');

// --- Utility functions ---
function updateTimestamp() {
  lastUpdatedEl.textContent = 'Cập nhật: ' + new Date().toLocaleTimeString();
}

function setBtnLoading(btn, isLoading) {
  btn.disabled = isLoading;
  if (btn.id === 'btn-raw') {
    btn.textContent = isLoading ? 'Loading…' : 'Raw View';
  } else if (btn.id === 'btn-summary') {
    btn.textContent = isLoading ? 'Loading…' : 'Summary View';
  } else if (btn.id === 'btnSearch') {
    btn.textContent = isLoading ? 'Loading…' : 'Tìm';
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

// -----------------------------------
// --- RAW VIEW (dữ liệu gốc) ---
// -----------------------------------
async function loadRaw() {
  setBtnLoading(btnRaw, true);
  hideDetails();
  container.innerHTML = '';
  searchResult.innerHTML = '';

  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu raw</div>';
    } else {
      let html = '<table class="min-w-full table-auto border-collapse">';
      html += '<thead class="bg-gray-50"><tr>';
      rows[0].forEach((_, i) => {
        html += `<th class="border px-2 py-1 text-left text-sm font-medium text-gray-700">Cột ${i + 1}</th>`;
      });
      html += '</tr></thead><tbody>';
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
// --- SUMMARY VIEW (tổng hợp) ---
// -----------------------------------
async function loadSummaryClient() {
  setBtnLoading(btnSummary, true);
  hideDetails();
  container.innerHTML = '';
  searchResult.innerHTML = '';

  try {
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log('[DEBUG] raw JSON length =', data.length);
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu summary</div>';
      return;
    }

    // Phải khớp chính xác với key trong JSON
    const machineKey = 'LAMINATION MACHINE (PLAN)';
    const qtyKey     = 'Total Qty';

    const machineMap = {};
    data.forEach(row => {
      const machine = (row[machineKey] || '').toString().trim();
      const qty     = Number(row[qtyKey]?.toString().replace(/,/g, '')) || 0;
      if (!machine) return;
      machineMap[machine] = (machineMap[machine] || 0) + qty;
    });

    const result = Object.entries(machineMap).map(([machine, total]) => ({ machine, total }));
    console.log('[DEBUG] Summary data (client) =', result);
    if (result.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu summary</div>';
      return;
    }

    result.sort((a, b) => {
      const aNum = parseInt((a.machine.match(/\d+$/) || ['0'])[0], 10);
      const bNum = parseInt((b.machine.match(/\d+$/) || ['0'])[0], 10);
      return aNum - bNum;
    });

    let totalAll = 0;
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
    result.forEach(({ machine, total }) => {
      totalAll += total;
      html += `
        <tr data-machine="${machine}" class="hover:bg-gray-100 cursor-pointer">
          <td class="px-6 py-4 text-sm text-gray-900">${machine}</td>
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

    document.querySelectorAll('#summary-table tbody tr[data-machine]').forEach(tr => {
      tr.addEventListener('click', () => {
        const machine = tr.dataset.machine;
        loadDetailsClient(machine);
      });
    });

    updateTimestamp();
  } catch (e) {
    console.error('[ERROR] loadSummaryClient failed:', e);
    container.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tải dữ liệu summary</div>';
  } finally {
    setBtnLoading(btnSummary, false);
  }
}

// -----------------------------------
// --- DETAILS VIEW (chi tiết cho từng máy) ---
// -----------------------------------
async function loadDetailsClient(machine) {
  showDetails();
  detailsContainer.innerHTML = '<div class="text-center py-4">Loading details…</div>';

  try {
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const machineKey     = 'LAMINATION MACHINE (PLAN)';
    const qtyKey         = 'Total Qty';
    const orderKey       = 'PRO ODER';
    const brandCodeKey   = 'Brand Code';
    const productTypeKey = '#MOLDED';
    const puKey          = 'PU';

    const filtered = data
      .filter(row => (row[machineKey] || '').toString().trim() === machine)
      .map(row => ({
        order:       row[orderKey]       || '',
        brandCode:   row[brandCodeKey]   || '',
        productType: row[productTypeKey] || '',
        pu:          row[puKey]          || '',
        quantity:    Number(row[qtyKey]?.toString().replace(/,/g, '')) || 0
      }));

    if (filtered.length === 0) {
      detailsContainer.innerHTML = `<div class="text-center py-4">Không có chi tiết cho “${machine}”</div>`;
      return;
    }

    // Tạo colorMap cho từng nhóm PU
    const uniquePUs = [];
    filtered.forEach(item => {
      const pu = item.pu || '(No PU)';
      if (!uniquePUs.includes(pu)) {
        uniquePUs.push(pu);
      }
    });

    const colorMap = {};
    const N = uniquePUs.length;
    uniquePUs.forEach((pu, idx) => {
      if (!pu || pu === '') {
        colorMap[pu] = 'hsl(0, 0%, 95%)';
      } else {
        const hue = Math.round((idx * 360) / N);
        colorMap[pu] = `hsl(${hue}, 80%, 90%)`;
      }
    });

    let html = `<h2 class="text-lg font-semibold mb-2">Chi tiết đơn cho: ${machine}</h2>`;
    html += `
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Brand Code</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Type</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PU</th>
            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
    `;
    filtered.forEach(d => {
      const pu = d.pu || '';
      const bgColor = colorMap[pu];
      html += `
        <tr style="background-color: ${bgColor}">
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${d.order}</td>
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${d.brandCode}</td>
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${d.productType}</td>
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${pu}</td>
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap text-right">${formatNumber(d.quantity)}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    detailsContainer.innerHTML = html;
  } catch (e) {
    console.error('[ERROR] loadDetailsClient failed:', e);
    detailsContainer.innerHTML = `<div class="text-center text-red-500 py-4">Lỗi tải chi tiết cho “${machine}”</div>`;
  }
}

// -----------------------------------
// --- SEARCH ORDERS (tìm tương đối) ---
// -----------------------------------
async function searchOrders() {
  const query = searchBox.value.trim().toUpperCase();
  const fieldKey = searchField.value; // Giá trị key (ví dụ: "PRO ODER", "Brand Code", "#MOLDED", "PU")
  if (!query) {
    searchResult.innerHTML = '';
    return;
  }

  setBtnLoading(btnSearch, true);
  container.innerHTML = '';
  hideDetails();

  try {
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const results = data.filter(row => {
      const cellValue = (row[fieldKey] || '').toString().toUpperCase();
      return cellValue.includes(query);
    }).map(row => ({
      order:       row['PRO ODER']       || '',
      brandCode:   row['Brand Code']     || '',
      productType: row['#MOLDED']        || '',
      pu:          row['PU']             || '',
      quantity:    Number(row['Total Qty']?.toString().replace(/,/g, '')) || 0,
      machine:     row['LAMINATION MACHINE (PLAN)'] || ''
    }));

    let html = `<h3 class="font-semibold mb-2">Kết quả Tìm "${searchBox.value}" theo "${searchField.options[searchField.selectedIndex].text}"</h3>`;
    if (results.length === 0) {
      html += `<p>Không tìm thấy kết quả nào.</p>`;
    } else {
      html += `
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Brand Code</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Type</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PU</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
      `;
      results.forEach(r => {
        html += `
          <tr class="hover:bg-gray-100 cursor-pointer" data-machine="${r.machine}">
            <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${r.order}</td>
            <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${r.brandCode}</td>
            <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${r.productType}</td>
            <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${r.pu}</td>
            <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap text-right">${formatNumber(r.quantity)}</td>
            <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${r.machine}</td>
          </tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `<button id="btnClearAfter" class="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded">Quay lại</button>`;
    searchResult.innerHTML = html;

    // Khi click vào 1 dòng kết quả, hiển Detail cho máy tương ứng
    document.querySelectorAll('#searchResult tbody tr[data-machine]').forEach(tr => {
      tr.addEventListener('click', () => {
        const machine = tr.dataset.machine;
        loadDetailsClient(machine);
      });
    });

    // Nút “Quay lại” để xóa kết quả tìm và hiển Summary lại
    document.getElementById('btnClearAfter').addEventListener('click', () => {
      searchResult.innerHTML = '';
      loadSummaryClient();
    });

    updateTimestamp();
  } catch (e) {
    console.error('[ERROR] searchOrders failed:', e);
    searchResult.innerHTML = `<p class="text-red-500">Lỗi tìm kiếm dữ liệu</p>`;
  } finally {
    setBtnLoading(btnSearch, false);
  }
}

function clearSearch() {
  searchBox.value = '';
  searchResult.innerHTML = '';
}

// -----------------------------------
// --- INITIALIZATION ---
// -----------------------------------
btnRaw.addEventListener('click', loadRaw);
btnSummary.addEventListener('click', loadSummaryClient);
btnSearch.addEventListener('click', searchOrders);
btnClearSearch.addEventListener('click', clearSearch);

// Khi trang load, hiển Summary View mặc định
loadSummaryClient();
