// public/script.js

// --- DOM elements ---
const container = document.getElementById('table-container');
const detailsContainer = document.getElementById('details-container');
const lastUpdatedEl = document.getElementById('last-updated');
const btnRaw = document.getElementById('btn-raw');
const btnSummary = document.getElementById('btn-summary');

// --- Utility functions ---
function updateTimestamp() {
  lastUpdatedEl.textContent = new Date().toLocaleTimeString();
}

function setBtnLoading(btn, isLoading) {
  btn.disabled = isLoading;
  if (btn.id === 'btn-raw') {
    btn.textContent = isLoading ? 'Loading…' : 'Raw View';
  } else {
    btn.textContent = isLoading ? 'Loading…' : 'Summary View';
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

  try {
    // Bắt buộc fetch không dùng cache để tránh 304 Not Modified
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu raw</div>';
    } else {
      let html = '<table class="min-w-full table-auto border-collapse">';
      html += '<thead class="bg-gray-50"><tr>';

      // Dòng đầu tiên của rows là header (mảng tên cột)
      rows[0].forEach((_, i) => {
        html += `<th class="border px-2 py-1 text-left text-sm font-medium text-gray-700">Cột ${i + 1}</th>`;
      });
      html += '</tr></thead><tbody>';

      // Dữ liệu thực tế (từ hàng thứ 2 trở đi)
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

  try {
    // 1. Lấy toàn bộ JSON từ public/powerapp.json
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    console.log('[DEBUG] raw JSON length =', data.length);
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu summary</div>';
      return;
    }

    // 2. Đặt đúng key cho "tên máy" và "số lượng"
    const machineKey = 'LAMINATION MACHINE (PLAN)';
    const qtyKey     = 'Total Qty';

    // 3. Tổng hợp số lượng theo máy
    const machineMap = {};
    data.forEach(row => {
      const machine = (row[machineKey] || '').toString().trim();
      const qty     = Number(row[qtyKey]?.toString().replace(/,/g, '')) || 0;
      if (!machine) return;
      machineMap[machine] = (machineMap[machine] || 0) + qty;
    });

    // 4. Chuyển thành mảng kết quả [{ machine, total }, …]
    const result = Object.entries(machineMap).map(([machine, total]) => ({
      machine,
      total
    }));

    console.log('[DEBUG] Summary data (client) =', result);
    if (result.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu summary</div>';
      return;
    }

    // 5. Sắp xếp theo số cuối trong tên máy (nếu có) hoặc giữ nguyên thứ tự
    result.sort((a, b) => {
      const aNum = parseInt((a.machine.match(/\d+$/) || ['0'])[0], 10);
      const bNum = parseInt((b.machine.match(/\d+$/) || ['0'])[0], 10);
      return aNum - bNum;
    });

    // 6. Xây dựng HTML cho bảng summary
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

    // 7. Đăng ký sự kiện click cho mỗi hàng để load chi tiết
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
    // Gọi lại toàn bộ JSON và lọc ra các dòng có cùng machine
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    // Đặt đúng key cho các trường cần lấy
    const machineKey     = 'LAMINATION MACHINE (PLAN)';
    const qtyKey         = 'Total Qty';
    const orderKey       = 'PRO ODER';       // “Order” thực tế trong JSON
    const brandCodeKey   = 'Brand Code';
    const productTypeKey = '#MOLDED';        // “Product Type” thực tế trong JSON
    const puKey          = 'PU';             // PU

    // Lọc ra các dòng thuộc máy này
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

    // --- TẠO BẢN ĐỒ PU → MÀU SẮC ---
    // Lấy danh sách PU duy nhất theo thứ tự xuất hiện
    const uniquePUs = [];
    filtered.forEach(item => {
      const pu = item.pu || '(No PU)';
      if (!uniquePUs.includes(pu)) {
        uniquePUs.push(pu);
      }
    });

    // Sử dụng HSL để chia đều các hue (tương phản tốt)
    // Ví dụ: nếu có N nhóm, mỗi nhóm sẽ nằm ở hue = k*(360/N), saturation 80%, lightness 90%
    const colorMap = {};
    const N = uniquePUs.length;
    uniquePUs.forEach((pu, idx) => {
      // Nếu PU rỗng, bạn có thể gán màu xám nhạt
      if (!pu || pu === '') {
        colorMap[pu] = 'hsl(0, 0%, 95%)';
      } else {
        const hue = Math.round((idx * 360) / N);
        colorMap[pu] = `hsl(${hue}, 80%, 90%)`;
      }
    });

    // --- XÂY DỰNG HTML CHO BẢNG CHI TIẾT ---
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

    // Tạo từng dòng <tr> với background-color dựa vào colorMap[item.pu]
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
// --- SEARCH ORDERS (nếu cần) ---
// -----------------------------------
async function searchOrders() {
  const input = document.getElementById('searchBox').value.trim();
  const resultEl = document.getElementById('searchResult');
  if (!input) return;

  const orderList = input.split('|').map(o => o.trim().toUpperCase());
  try {
    const res = await fetch('/powerapp.json', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    const results = [];
    orderList.forEach(code => {
      const found = data.find(row => String(row['PRO ODER'] || '').toUpperCase() === code);
      if (found) {
        results.push({
          order:    code,
          brand:    found['Brand Code']   || '',
          type:     found['#MOLDED']      || '',
          quantity: Number(found['Total Qty']?.toString().replace(/,/g, '')) || 0,
          machine:  found['LAMINATION MACHINE (PLAN)'] || ''
        });
      }
    });

    let html = `<h3 class="font-semibold">Kết quả tìm kiếm:</h3>`;
    if (results.length === 0) {
      html += `<p>Không tìm thấy đơn hàng nào.</p>`;
    } else {
      html += `
        <table border="1" cellspacing="0" cellpadding="5" class="mt-2 min-w-full">
          <thead>
            <tr>
              <th>ORDER</th>
              <th>BRAND CODE</th>
              <th>PRODUCT TYPE</th>
              <th>QUANTITY</th>
              <th>MACHINE</th>
            </tr>
          </thead>
          <tbody>
      `;
      results.forEach(r => {
        html += `<tr>
            <td>${r.order}</td>
            <td>${r.brand}</td>
            <td>${r.type}</td>
            <td>${formatNumber(r.quantity)}</td>
            <td>${r.machine}</td>
          </tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `<button onclick="clearSearch()" class="mt-2 px-3 py-1 bg-red-500 text-white rounded">Xóa</button>`;
    resultEl.innerHTML = html;
  } catch (e) {
    console.error('[ERROR] searchOrders failed:', e);
    resultEl.innerHTML = `<p class="text-red-500">Lỗi tìm kiếm dữ liệu</p>`;
  }
}

function clearSearch() {
  document.getElementById('searchBox').value = '';
  document.getElementById('searchResult').innerHTML = '';
}

// -----------------------------------
// --- INITIALIZATION ---
// -----------------------------------

// Gắn sự kiện cho hai nút
btnRaw.addEventListener('click', loadRaw);
btnSummary.addEventListener('click', loadSummaryClient);

// Khi trang load, tự động hiển bảng Summary lần đầu
loadSummaryClient();
