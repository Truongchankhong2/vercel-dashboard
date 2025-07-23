import { supabase } from './supabaseClient.js';

let currentRpro = null;
let headersArr = [];

// 👉 Chuyển "7.5" → "size_7_5"
function normalizeSizeKey(size) {
  return 'size_' + size.replace(/\./g, '_');
}

// 1. Khởi động QR
function initQrScanner() {
  const qrContainer = document.getElementById("qr-reader");
  if (!qrContainer) return;

  const qrReader = new Html5Qrcode("qr-reader");
  qrReader.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    decodedText => {
      qrReader.stop();
      handleScanned(decodedText);
    },
    err => {}
  ).catch(e => {
    console.warn("QR scanner unavailable:", e);
    qrContainer.style.display = "none";
  });
}

// 2. Tách RPRO từ QR hoặc nhập tay
function handleScanned(text) {
  const parts = text.split("|");
  const rpro = parts.length > 1 ? parts[1].trim() : text.trim();
  loadOrderInfo(rpro);
}

// 3. Tải dữ liệu từ powerapp.json và Supabase
async function loadOrderInfo(rpro) {
  currentRpro = rpro;
  // 👉 Hiện thông báo loading
  const loadingEl = document.getElementById("loading-status");
  if (loadingEl) loadingEl.classList.remove("hidden");

  try {
    const res = await fetch("/powerapp.json", { cache: "no-store" });
    const { headers, data } = await res.json();
    headersArr = headers;

    const rec = data.find(r => (r["PRO ODER"] || "") === rpro);
    if (!rec) {
      alert("Không tìm thấy đơn " + rpro);
      if (loadingEl) loadingEl.classList.add("hidden");
      return;
    }

    const { data: existingRows } = await supabase
      .from('supplement')
      .select('*')
      .eq('rpro', rpro)
      .limit(1);

    const existingData = (existingRows && existingRows.length > 0) ? existingRows[0] : null;
    renderOrder(rec, existingData);
  } catch (err) {
    console.error("loadOrderInfo:", err);
    alert("Lỗi khi tải dữ liệu, vui lòng thử lại.");
  } finally {
    // 👉 Ẩn thông báo loading
    if (loadingEl) loadingEl.classList.add("hidden");
  }
  try {
    const res = await fetch("/powerapp.json", { cache: "no-store" });
    const { headers, data } = await res.json();
    headersArr = headers;

    const rec = data.find(r => (r["PRO ODER"] || "") === rpro);
    if (!rec) {
      alert("Không tìm thấy đơn " + rpro);
      return;
    }

    // ✅ Tìm dữ liệu đã từng nhập trên Supabase
    const { data: existingRows } = await supabase
      .from('supplement')
      .select('*')
      .eq('rpro', rpro)
      .limit(1);

    const existingData = (existingRows && existingRows.length > 0) ? existingRows[0] : null;

    renderOrder(rec, existingData);
  } catch (err) {
    console.error("loadOrderInfo:", err);
    alert("Lỗi khi tải dữ liệu, vui lòng thử lại.");
  }
}

// 4. Render form size + metadata
function renderOrder(r, existingData = null) {
  document.getElementById("info-rpro").textContent = r["PRO ODER"] || "";
  document.getElementById("info-gender").textContent = r["Giới tính"] || r["GENDER"] || "";
  document.getElementById("info-mold").textContent = r["Mã Khuôn"] || r["MOLD"] || "";
  document.getElementById("info-tool").textContent = r["Mã dao"] || r["Last"] || "";
  document.getElementById("info-fabric").textContent = r["Tên vải"] || r["FB DESCRIPTION"] || "";
  document.getElementById("info-bom").textContent = r["BOM"] || "";
  document.getElementById("order-info").classList.remove("hidden");

  const idx = headersArr.indexOf("CheckLL");
  const sizeKeys = idx >= 0 ? headersArr.slice(idx + 1) : [];

  let html = `
    <table class="min-w-full border border-gray-300">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">Size</th>
          <th class="border px-2 py-1">Số thiếu</th>
          <th class="border px-2 py-1">PO Quantity</th>
        </tr>
      </thead>
      <tbody>
  `;

  sizeKeys.forEach(size => {
    const poQty = Number(r[size]) || 0;
    if (poQty === 0) return;
    const value = existingData?.[normalizeSizeKey(size)] || 0;
    html += `
      <tr>
        <td class="border px-2 py-1 text-center">${size}</td>
        <td class="border px-2 py-1 text-center">
          <input type="number" min="0"
       value="${existingData?.[normalizeSizeKey(size)] > 0 ? existingData[normalizeSizeKey(size)] : ''}"
       data-size="${size}" class="w-16 input-supp" />

        </td>
        <td class="border px-2 py-1 text-center">${poQty}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
      <tfoot class="bg-gray-50">
        <tr>
          <td class="border px-2 py-1 font-bold">TOTAL</td>
          <td class="border px-2 py-1 font-bold" id="supp-total">0</td>
          <td class="border px-2 py-1"></td>
        </tr>
      </tfoot>
    </table>
  `;

  const container = document.getElementById("size-table-container");
  container.innerHTML = html;
  container.classList.remove("hidden");

  document.querySelectorAll(".input-supp").forEach(inp => {
    inp.addEventListener("input", updateTotal);
  });

  updateTotal();  // ✅ Khởi tạo tổng ban đầu
  document.getElementById("btn-confirm-supplement").disabled = false;
}

// 5. Tính tổng số thiếu
function updateTotal() {
  const sum = [...document.querySelectorAll(".input-supp")]
    .reduce((acc, inp) => acc + Number(inp.value || 0), 0);
  document.getElementById("supp-total").textContent = sum;
}

// 6. DOM Event
window.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btn-back");
  if (btnBack) btnBack.addEventListener("click", () => window.location.href = "/");

  const btnSupp = document.getElementById("btn-supplement");
  if (btnSupp) btnSupp.addEventListener("click", () => window.location.href = "/supplement.html");

  const btnManual = document.getElementById("btn-manual-ok");
  if (btnManual) btnManual.addEventListener("click", () => {
    handleScanned(document.getElementById("manualRpro").value);
  });

  const btnConfirm = document.getElementById("btn-confirm-supplement");
  if (btnConfirm) {
    btnConfirm.addEventListener("click", async () => {
      const payload = {
        rpro: currentRpro,
        gender: document.getElementById("info-gender").textContent,
        mold: document.getElementById("info-mold").textContent,
        tool: document.getElementById("info-tool").textContent,
        fabric: document.getElementById("info-fabric").textContent,
        bom: document.getElementById("info-bom").textContent,
        total: Number(document.getElementById("supp-total").textContent)
      };

      document.querySelectorAll(".input-supp").forEach(inp => {
        const size = inp.dataset.size;
        const qty = Number(inp.value) || 0;
        const key = normalizeSizeKey(size);
        payload[key] = qty;
      });

      try {
        const { error } = await supabase
          .from('supplement')
          .upsert([payload], { onConflict: 'rpro' });

        if (error) {
          console.error("Supabase error:", error);
          alert("Lỗi khi lưu vào Supabase: " + error.message);
        } else {
          const again = window.confirm("✅ Đã lưu bù hàng thành công!\n\nBạn muốn nhập RPRO mới?");
          window.location.href = again ? window.location.href : "/";
        }
      } catch (err) {
        console.error("submit supplement:", err);
        alert("Lỗi khi lưu, thử lại.");
      }
    });
  }

  if (document.getElementById("qr-reader")) {
    initQrScanner();
  }
});
