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

// --- Utility functions (giữ nguyên) ---
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
// --- RAW VIEW (giữ nguyên) ---
// -----------------------------------
async function loadRaw() {
  /* ... như cũ ... */
}

// -----------------------------------
// --- SUMMARY VIEW (giữ nguyên) ---
// -----------------------------------
async function loadSummaryClient() {
  /* ... như cũ ... */
}

// -----------------------------------
// --- DETAILS VIEW (giữ nguyên) ---
// -----------------------------------
async function loadDetailsClient(machine) {
  /* ... như cũ ... */
}

// -----------------------------------
// --- SEARCH ORDERS (tìm tương đối) ---
// -----------------------------------
async function searchOrders() {
  const query = searchBox.value.trim().toUpperCase();
  // Lấy value từ dropdown; giá trị chính xác phải khớp với key trong JSON
  // Ví dụ nếu user chọn "RPRO", searchField.value sẽ là "PRO ODER"
  const fieldKey = searchField.value;
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

    // Lọc mảng JSON: lấy tất cả các row sao cho row[fieldKey] chứa chuỗi query
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

    // Khi click vào 1 dòng kết quả, hiển Detail cho machine tương ứng
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

// Gắn sự kiện cho các nút
btnRaw.addEventListener('click', loadRaw);
btnSummary.addEventListener('click', loadSummaryClient);
btnSearch.addEventListener('click', searchOrders);
btnClearSearch.addEventListener('click', clearSearch);

// Khi trang load, hiển Summary View mặc định
loadSummaryClient();
