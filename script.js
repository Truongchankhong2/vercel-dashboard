// --- DOM elements ---
const container = document.getElementById('table-container');
const detailsContainer = document.getElementById('details-container');
const lastUpdatedEl = document.getElementById('last-updated');
const btnRaw = document.getElementById('btn-raw');
const btnSummary = document.getElementById('btn-summary');

// --- Utils ---
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

// --- Hide/show ---
function hideDetails() {
  detailsContainer.innerHTML = '';
  detailsContainer.classList.add('hidden');
}

function showDetails() {
  detailsContainer.classList.remove('hidden');
}

// --- RAW VIEW ---
async function loadRaw() {
  setBtnLoading(btnRaw, true);
  hideDetails();
  try {
    const res = await fetch('/api/data');
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu</div>';
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
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tải dữ liệu</div>';
  } finally {
    setBtnLoading(btnRaw, false);
    updateTimestamp();
  }
}

// --- SUMMARY VIEW ---
async function loadSummary() {
  setBtnLoading(btnSummary, true);
  hideDetails();
  try {
    const res = await fetch('/api/summary');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div class="text-center py-4">Không có dữ liệu summary</div>';
    } else {
      const withName = data.filter(d => d.machine?.trim());
      const withoutName = data.filter(d => !d.machine?.trim());
      withName.sort((a, b) => {
        const nA = parseInt((a.machine.match(/\d+$/) || ['0'])[0], 10);
        const nB = parseInt((b.machine.match(/\d+$/) || ['0'])[0], 10);
        return nA - nB;
      });
      const sorted = [...withName, ...withoutName];

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
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${machine || '<blank>'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${formatNumber(total)}</td>
          </tr>
        `;
      });

      html += `
          <tr class="font-bold bg-gray-100">
            <td class="px-6 py-3 text-sm text-gray-700 text-right">Tổng cộng:</td>
            <td class="px-6 py-3 text-sm text-gray-900 text-right">${formatNumber(totalAll)}</td>
          </tr>
        </tbody>
      </table>`;

      container.innerHTML = html;

      document.querySelectorAll('#summary-table tbody tr').forEach(tr => {
        tr.addEventListener('click', () => {
          const machine = tr.dataset.machine;
          loadDetails(machine);
        });
      });
    }
    updateTimestamp();
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="text-center text-red-500 py-4">Lỗi tải summary</div>';
  } finally {
    setBtnLoading(btnSummary, false);
  }
}

// --- MACHINE DETAILS VIEW ---
async function loadDetails(machine) {
  showDetails();
  detailsContainer.innerHTML = '<div class="text-center py-4">Loading details…</div>';
  try {
    const res = await fetch(`/api/details?machine=${encodeURIComponent(machine)}`);
    const details = await res.json();

    if (!Array.isArray(details) || details.length === 0) {
      detailsContainer.innerHTML = `<div class="text-center py-4">Không có chi tiết cho "${machine}"</div>`;
      return;
    }

    // Sort by PU and Order
    details.sort((a, b) => {
      const puCompare = (a.pu || '').localeCompare(b.pu || '');
      if (puCompare !== 0) return puCompare;
      return (a.order || '').localeCompare(b.order || '');
    });

    let html = `<h2 class="text-lg font-semibold mb-2">Chi tiết đơn cho: ${machine}</h2>`;
    html += `<table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Brand Code</th>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Type</th>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PU</th>
          <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">`;

    let lastPU = null;
    let groupIndex = 0;
    const colorClasses = ['bg-white', 'bg-gray-50', 'bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-red-50'];

    for (const d of details) {
      if (d.pu !== lastPU) {
        lastPU = d.pu;
        groupIndex++;
      }
      const bgColor = colorClasses[groupIndex % colorClasses.length];
      html += `
        <tr class="${bgColor}">
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${d.order}</td>
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${d.brandCode}</td>
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${d.productType}</td>
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">${d.pu || ''}</td>
          <td class="px-4 py-2 text-sm text-gray-800 whitespace-nowrap text-right">${formatNumber(d.quantity)}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    detailsContainer.innerHTML = html;
  } catch (e) {
    console.error(e);
    detailsContainer.innerHTML = `<div class="text-center text-red-500 py-4">Lỗi tải chi tiết cho "${machine}"</div>`;
  }
}

// --- SEARCH ORDERS ---
async function searchOrders() {
  const input = document.getElementById('searchBox').value.trim();
  const resultEl = document.getElementById('searchResult');
  if (!input) return;

  const orderList = input.split('|').map(o => o.trim().toUpperCase());
  const res = await fetch('/api/data');
  const data = await res.json();

  if (!data || data.length <= 1) return;

  const results = [];
  for (const code of orderList) {
    const found = data.find(row => String(row[2] || '').toUpperCase() === code);
    if (found) {
      results.push({
        order: code,
        brand: found[3] || '',
        type: found[5] || '',
        quantity: found[6] || '',
        machine: found[57] || ''
      });
    }
  }

  let html = `<h3 class="font-semibold">Kết quả tìm kiếm:</h3>`;
  if (results.length === 0) {
    html += `<p>Không tìm thấy đơn hàng nào.</p>`;
  } else {
    html += `
      <table border="1" cellspacing="0" cellpadding="5" class="mt-2 min-w-full">
        <thead><tr>
          <th>ORDER</th><th>BRAND CODE</th><th>PRODUCT TYPE</th><th>QUANTITY</th><th>MACHINE</th>
        </tr></thead>
        <tbody>`;
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
}

function clearSearch() {
  document.getElementById('searchBox').value = '';
  document.getElementById('searchResult').innerHTML = '';
}

// --- INIT ---
btnRaw.addEventListener('click', loadRaw);
btnSummary.addEventListener('click', loadSummary);
loadSummary();
