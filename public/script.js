// public/script.js

// --- DOM elements chung ---
const container        = document.getElementById('table-container');
const detailsContainer = document.getElementById('details-container');
const searchBox        = document.getElementById('searchBox');
const searchField      = document.getElementById('searchField');
const btnSearch        = document.getElementById('btnSearch');
const btnClearSearch   = document.getElementById('btnClearSearch');
const searchResult     = document.getElementById('searchResult');
const lastUpdatedEl    = document.getElementById('last-updated');
const btnRaw           = document.getElementById('btn-raw');
const btnSummary       = document.getElementById('btn-summary');
const btnRefresh       = document.getElementById('btn-refresh');

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
  } else if (btn.id === 'btnSearch') {
    btn.textContent = isLoading ? 'Loading…' : 'Tìm';
  } else if (btn.id === 'btn-refresh') {
    btn.textContent = isLoading ? 'Loading…' : 'Refresh';
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
let currentView = 'summary';   // Có thể: 'summary' | 'raw' | 'detail'
let currentMachine = null;     // Tên máy nếu đang ở detail

async function loadRaw() {
  currentView = 'raw';
  currentMachine = null;
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
      // Header
      rows[0].forEach((_, i) => {
        html += `<th class="border px-2 py-1 text-left text-sm font-medium text-gray-700">Cột ${i + 1}</th>`;
      });
      html += '</tr></thead><tbody>';
      // Dữ liệu
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
  currentView = 'summary';
  currentMachine = null;
  setBtnLoading(btnSummary, true);
  hideDetails();
  container.innerHTML = '';
  searchResult.innerHTML = '';

  try {
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu summary</div>';
      return;
    }

    // Key chính xác trong JSON
    const machineKey = 'LAMINATION MACHINE (PLAN)';
    const qtyKey     = 'Total Qty';

    // Tổng hợp số lượng theo máy
    const machineMap = {};
    data.forEach(row => {
      const machine = (row[machineKey] || '').toString().trim();
      const qty     = Number(row[qtyKey]?.toString().replace(/,/g, '')) || 0;
      if (!machine) return;
      machineMap[machine] = (machineMap[machine] || 0) + qty;
    });

    const result = Object.entries(machineMap).map(([machine, total]) => ({ machine, total }));

    if (result.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu summary</div>';
      return;
    }

    // Sắp xếp theo số cuối (nếu có) hoặc giữ nguyên
    result.sort((a, b) => {
      const aNum = parseInt((a.machine.match(/\d+$/) || ['0'])[0], 10);
      const bNum = parseInt((b.machine.match(/\d+$/) || ['0'])[0], 10);
      return aNum - bNum;
    });

    // Xây dựng bảng summary
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

    // Bắt sự kiện click từng máy để load detail tương ứng
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
// --- DETAILS VIEW (kèm sắp xếp theo PU→Khách Hàng→Order) ---
// -----------------------------------
async function loadDetailsClient(machine) {
  currentView = 'detail';
  currentMachine = machine;

  // Hiện khung chi tiết
  detailsContainer.classList.remove('hidden');
  // Xóa sạch nội dung cũ (nếu có)
  detailsContainer.innerHTML = '';

  // 1. Chèn ngay “Thanh Tìm riêng cho Chi tiết” (Việt hóa)
  const detailSearchHTML = `
    <div id="detail-search-bar" class="mb-4 flex flex-col sm:flex-row sm:items-center sm:space-x-4">
      <label for="detailSearchField" class="block text-sm font-medium text-gray-700 mb-2 sm:mb-0">
        Tìm theo máy:
      </label>
      <select id="detailSearchField"
              class="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="PRO ODER">RPRO</option>
        <option value="Brand Code">Khách Hàng</option>
        <option value="#MOLDED">Loại Hàng</option>
        <option value="PU">Mã PU</option>
      </select>

      <input
        type="text"
        id="detailSearchBox"
        placeholder="Nhập từ khóa chi tiết..."
        class="mt-2 sm:mt-0 border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
      />

      <div class="mt-2 sm:mt-0 flex space-x-2">
        <button
          id="detailBtnSearch"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          Tìm Chi Tiết
        </button>
        <button
          id="detailBtnClear"
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          Xóa Chi Tiết
        </button>
      </div>
    </div>
  `;
  detailsContainer.insertAdjacentHTML('beforeend', detailSearchHTML);

  // 2. Lấy dữ liệu JSON & lọc row cho máy hiện tại
  try {
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Key trong JSON
    const machineKey     = 'LAMINATION MACHINE (PLAN)';
    const qtyKey         = 'Total Qty';
    const orderKey       = 'PRO ODER';
    const brandCodeKey   = 'Brand Code';
    const productTypeKey = '#MOLDED';
    const puKey          = 'PU';

    // Lọc ra những dòng có đúng máy đã click
    let filtered = data
      .filter(row => (row[machineKey] || '').toString().trim() === machine)
      .map(row => ({
        order:       row[orderKey]       || '',
        brandCode:   row[brandCodeKey]   || '',
        productType: row[productTypeKey] || '',
        pu:          row[puKey]          || '',
        quantity:    Number(row[qtyKey]?.toString().replace(/,/g, '')) || 0
      }));

    // Nếu không có dòng nào, hiển thông báo
    if (filtered.length === 0) {
      detailsContainer.insertAdjacentHTML(
        'beforeend',
        `<div class="text-center py-4">Không có chi tiết cho “${machine}”</div>`
      );
      return;
    }

    // 3. Sắp xếp filtered theo thứ tự: PU → Brand Code → Order
    filtered.sort((a, b) => {
      const aPU = (a.pu || '').toUpperCase();
      const bPU = (b.pu || '').toUpperCase();
      if (aPU !== bPU) {
        return aPU.localeCompare(bPU);
      }
      // cùng PU:
      const aBrand = (a.brandCode || '').toUpperCase();
      const bBrand = (b.brandCode || '').toUpperCase();
      if (aBrand !== bBrand) {
        return aBrand.localeCompare(bBrand);
      }
      // cùng Brand: so Order
      return (a.order || '').toUpperCase().localeCompare((b.order || '').toUpperCase());
    });

    // 4. Tạo danh sách PU duy nhất (distinct), theo thứ tự xuất hiện sau khi sort
    const distinctPUs = Array.from(new Set(filtered.map(d => d.pu || '')));

    // 5. Tạo colorMap cho từng PU, theo thứ tự trong distinctPUs
    const colorMap = {};
    const N = distinctPUs.length;
    distinctPUs.forEach((pu, idx) => {
      if (!pu || pu === '') {
        colorMap[pu] = 'hsl(0, 0%, 95%)';
      } else {
        const hue = Math.round((idx * 360) / N);
        colorMap[pu] = `hsl(${hue}, 80%, 90%)`;
      }
    });

    // 6. Xây dựng HTML cho bảng chi tiết (có id="detail-table")
    let html = `<h2 class="text-lg font-semibold mb-2">Chi tiết đơn cho: ${machine}</h2>`;
    html += `
      <table id="detail-table" class="min-w-full divide-y divide-gray-200">
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
    detailsContainer.insertAdjacentHTML('beforeend', html);

    // 7. Bắt sự kiện cho thanh tìm riêng (Detail Search)
    const detailSearchField = document.getElementById('detailSearchField');
    const detailSearchBox   = document.getElementById('detailSearchBox');
    const detailBtnSearch   = document.getElementById('detailBtnSearch');
    const detailBtnClear    = document.getElementById('detailBtnClear');
    const detailTable       = document.getElementById('detail-table');

    // Hàm lọc dòng trong bảng detail
    function filterDetailTable() {
      const query = detailSearchBox.value.trim().toUpperCase();
      const fieldKey = detailSearchField.value; // "PRO ODER", "Brand Code", "#MOLDED", "PU"
      if (!query) {
        // Hiện lại tất cả hàng nếu query rỗng
        Array.from(detailTable.tBodies[0].rows).forEach(row => {
          row.style.display = '';
        });
        return;
      }
      // Xác định index cột cần so sánh dựa vào fieldKey
      const columnIndexMap = {
        'PRO ODER':   0,
        'Brand Code': 1,
        '#MOLDED':    2,
        'PU':         3
      };
      const colIndex = columnIndexMap[fieldKey];
      Array.from(detailTable.tBodies[0].rows).forEach(row => {
        const cellText = row.cells[colIndex].textContent.trim().toUpperCase();
        row.style.display = cellText.includes(query) ? '' : 'none';
      });
    }

    detailBtnSearch.addEventListener('click', () => {
      filterDetailTable();
    });
    detailBtnClear.addEventListener('click', () => {
      detailSearchBox.value = '';
      filterDetailTable(); // reset lại toàn bộ
    });

    updateTimestamp();
  } catch (e) {
    console.error('[ERROR] loadDetailsClient failed:', e);
    detailsContainer.insertAdjacentHTML(
      'beforeend',
      `<div class="text-center text-red-500 py-4">Lỗi tải chi tiết cho “${machine}”</div>`
    );
  }
}

// -----------------------------------
// --- SEARCH ORDERS (tìm tương đối) ---
// -----------------------------------
async function searchOrders() {
  const query = searchBox.value.trim().toUpperCase();
  const fieldKey = searchField.value; // ví dụ: "PRO ODER", "Brand Code", "#MOLDED", "PU"
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

    // Lọc mảng JSON theo fieldKey và substring
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

    let html = `<h3 class="font-semibold mb-2">Kết quả tìm "${searchBox.value}" theo "${searchField.options[searchField.selectedIndex].text}"</h3>`;
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

    // Bắt sự kiện click vào mỗi dòng kết quả để show Detail tương ứng
    document.querySelectorAll('#searchResult tbody tr[data-machine]').forEach(tr => {
      tr.addEventListener('click', () => {
        const machine = tr.dataset.machine;
        loadDetailsClient(machine);
      });
    });

    // Nút “Quay lại”
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
// --- REFRESH BUTTON LOGIC ---
// -----------------------------------
btnRefresh.addEventListener('click', () => {
  // Khi click “Refresh”, tuỳ theo currentView mà gọi lại hàm tương ứng
  setBtnLoading(btnRefresh, true);
  if (currentView === 'summary') {
    loadSummaryClient().finally(() => setBtnLoading(btnRefresh, false));
  } else if (currentView === 'raw') {
    loadRaw().finally(() => setBtnLoading(btnRefresh, false));
  } else if (currentView === 'detail' && currentMachine) {
    loadDetailsClient(currentMachine).finally(() => setBtnLoading(btnRefresh, false));
  } else {
    // Mặc định fallback về Summary
    loadSummaryClient().finally(() => setBtnLoading(btnRefresh, false));
  }
});

// -----------------------------------
// --- INITIALIZATION ---
// -----------------------------------
btnRaw.addEventListener('click', loadRaw);
btnSummary.addEventListener('click', loadSummaryClient);
btnSearch.addEventListener('click', searchOrders);
btnClearSearch.addEventListener('click', clearSearch);

// Khi trang load, hiển Summary mặc định
loadSummaryClient();
