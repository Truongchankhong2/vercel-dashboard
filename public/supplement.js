import { supabase } from './supabaseClient.js';

let currentRpro = null;
let headersArr = [];
let useSizeFix = false;         // Có đang dùng sizeFix (Women's)
let showSizeFixValues = true;   // Hiển thị số Size nữ hay không
let rawRecord = null;           // Dữ liệu gốc
let sizeFixData = {};           // Dữ liệu sizeFix
let existingRecord = null;      // Dữ liệu đã nhập trên Supabase

// 👉 Chuyển size: "7.5" → "size_7_5"
function normalizeSizeKey(size) {
  return 'size_' + size.replace(/\./g, '_');
}

// 👉 Khi scan hoặc nhập tay
function handleScanned(text) {
  const cleanText = (text || "").trim();
  let rpro = "";

  if (cleanText.includes("|")) {
    const parts = cleanText.split("|");
    const rproPart = parts.find(p => p.startsWith("RPRO"));
    rpro = rproPart || cleanText;
  } else if (cleanText.startsWith("RPRO")) {
    rpro = cleanText;
  } else {
    alert("❌ Mã QR không hợp lệ: " + cleanText);
    return;
  }

  loadOrderInfo(rpro);
}

// 👉 Load dữ liệu đơn hàng
async function loadOrderInfo(rpro) {
  currentRpro = rpro;

  const loadingEl = document.getElementById("loading-status");
  if (loadingEl) loadingEl.classList.remove("hidden");

  try {
    // Lấy dữ liệu PowerApp
    const res = await fetch("/powerapp.json", { cache: "no-store" });
    const { headers, data } = await res.json();
    headersArr = headers;

    const rec = data.find(r => (r["PRO ODER"] || "") === rpro);
    if (!rec) {
      alert("Không tìm thấy đơn " + rpro);
      if (loadingEl) loadingEl.classList.add("hidden");
      return;
    }

    // ✅ Kiểm tra Gender & load sizeFix
    const gender = rec["Giới tính"] || rec["GENDER"] || "";
    useSizeFix = false;
    showSizeFixValues = true;
    sizeFixData = {};

    if (gender === "Women's") {
      try {
        const resFix = await fetch("/sizefix.json", { cache: "no-store" });
        const sizefixJson = await resFix.json();
        sizeFixData = sizefixJson[rpro] || {};
        if (Object.keys(sizeFixData).length > 0) {
          useSizeFix = true;
        }
      } catch (err) {
        console.warn("Không thể tải sizefix.json:", err);
      }
    }

    // ✅ Tìm dữ liệu đã lưu trên Supabase
    const { data: existingRows } = await supabase
      .from('supplement')
      .select('*')
      .eq('rpro', rpro)
      .limit(1);

    existingRecord = (existingRows && existingRows.length > 0) ? existingRows[0] : null;

    // ✅ Lưu lại dữ liệu gốc
    rawRecord = rec;

    // ✅ Render giao diện
    renderOrder(rec, existingRecord);

  } catch (err) {
    console.error("loadOrderInfo:", err);
    alert("Lỗi khi tải dữ liệu, vui lòng thử lại.");
  } finally {
    if (loadingEl) loadingEl.classList.add("hidden");
  }
}

// 👉 Vẽ bảng size + metadata
function renderOrder(rec, existing = null) {
  // Metadata
  document.getElementById("info-rpro").textContent = rec["PRO ODER"] || "";
  document.getElementById("info-so").textContent = rec["SO"] || rec["Sales Order"] || "";
  document.getElementById("info-customers").textContent = rec["CUSTOMERS"] || "";
  const gender = rec["Giới tính"] || rec["GENDER"] || "";
  document.getElementById("info-gender").textContent = gender;
  document.getElementById("info-mold").textContent = rec["Mã Khuôn"] || rec["#MOLD"] || "";
  document.getElementById("info-tool").textContent = rec["Mã dao"] || rec["#Last"] || "";
  document.getElementById("info-fabric").textContent = rec["Tên vải"] || rec["FB DESCRIPTION"] || "";
  document.getElementById("info-bom").textContent = rec["BOM"] || "";
  document.getElementById("order-info").classList.remove("hidden");

  // Xác định các cột size gốc
  const idx = headersArr.indexOf("CheckLL");
  const sizeKeys = idx >= 0 ? headersArr.slice(idx + 1) : [];

  // Dữ liệu gốc & size nữ
  const originalData = rec;
  const femaleData = sizeFixData || {};

  // Lọc & sắp xếp size gốc tăng dần
  const originalSizes = sizeKeys
    .filter(s => Number(originalData[s]) > 0)
    .map(s => parseFloat(s))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b)
    .map(n => n.toString());

  // Sắp xếp size nữ tăng dần
  const femaleSizes = Object.keys(femaleData)
    .map(s => parseFloat(s))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b)
    .map(n => n.toString());

  // Render table
  let html = `
    <table class="min-w-full border border-gray-300">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">Size gốc</th>
          <th class="border px-2 py-1">Size nữ</th>
          <th class="border px-2 py-1">Số thiếu</th>
          <th class="border px-2 py-1">PO Quantity</th>
        </tr>
      </thead>
      <tbody>
  `;

  originalSizes.forEach((sizeOriginal, idx) => {
    const sizeFemale = (gender === "Women's" && femaleSizes[idx] && showSizeFixValues) 
                        ? femaleSizes[idx] 
                        : "";

    const poQtyOriginal = Number(originalData[sizeOriginal]) || 0;
    const poQtyFemale = femaleSizes[idx] ? Number(femaleData[femaleSizes[idx]]) || 0 : 0;
    const poQty = (gender === "Women's" && useSizeFix && showSizeFixValues) ? poQtyFemale : poQtyOriginal;

    const inputKey = sizeOriginal;
    const oldQty = existing?.[normalizeSizeKey(inputKey)] || "";

    html += `
      <tr>
        <td class="border px-2 py-1 text-center">${sizeOriginal}</td>
        <td class="border px-2 py-1 text-center">${sizeFemale}</td>
        <td class="border px-2 py-1 text-center">
          <input type="number" min="0"
                 value="${oldQty}"
                 data-size="${inputKey}"
                 class="w-16 input-supp" />
        </td>
        <td class="border px-2 py-1 text-center">${poQty}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
      <tfoot class="bg-gray-50">
        <tr>
          <td class="border px-2 py-1 font-bold" colspan="2">TOTAL</td>
          <td class="border px-2 py-1 font-bold" id="supp-total">0</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;

  // Thêm cảnh báo nếu Women's
  if (useSizeFix && showSizeFixValues) {
    html = `
      <div class="bg-yellow-200 text-yellow-800 p-2 mb-2 rounded">
        ⚠️ CẢNH BÁO SIZE NỮ!! ĐÃ TỰ ĐỘNG GIẢM SIZE NẾU CÓ!!
        <button onclick="cancelSizeFix()"
                class="ml-4 bg-red-600 text-white px-2 py-1 rounded">
          Bỏ giảm size
        </button>
      </div>` + html;
  }

  // Render ra giao diện
  const container = document.getElementById("size-table-container");
  container.innerHTML = html;
  container.classList.remove("hidden");

  // Sự kiện input tính tổng số thiếu
  document.querySelectorAll(".input-supp").forEach(inp => {
    inp.addEventListener("input", updateTotal);
  });
  updateTotal();
  document.getElementById("btn-confirm-supplement").disabled = false;
}

// 👉 Bỏ giảm size: giữ cột Size nữ nhưng ẩn số liệu
function cancelSizeFix() {
  showSizeFixValues = false;  
  renderOrder(rawRecord, existingRecord);
}

// 👉 Tính tổng thiếu
function updateTotal() {
  const sum = [...document.querySelectorAll(".input-supp")]
    .reduce((acc, inp) => acc + Number(inp.value || 0), 0);
  document.getElementById("supp-total").textContent = sum;
}

// 👉 DOM events & QR init
window.addEventListener("DOMContentLoaded", () => {
  // Manual OK
  document.getElementById("btn-manual-ok")
    .addEventListener("click", () => handleScanned(document.getElementById("manualRpro").value));

  // Confirm button
  document.getElementById("btn-confirm-supplement")
    .addEventListener("click", async () => {
      const genderVal = document.getElementById("info-gender").textContent.trim();
      const payload = {
        rpro: currentRpro,
        so: document.getElementById("info-so").textContent,
        customers: document.getElementById("info-customers").textContent,
        gender: genderVal,
        mold: document.getElementById("info-mold").textContent,
        tool: document.getElementById("info-tool").textContent,
        fabric: document.getElementById("info-fabric").textContent,
        bom: document.getElementById("info-bom").textContent,
        total: Number(document.getElementById("supp-total").textContent),
        remark: (genderVal === "Women's" && useSizeFix && showSizeFixValues) ? "Size fixed" : ""
      };
      document.querySelectorAll(".input-supp").forEach(inp => {
        payload[normalizeSizeKey(inp.dataset.size)] = Number(inp.value) || 0;
      });
      try {
        const { error } = await supabase
          .from("supplement")
          .upsert([payload], { onConflict: "rpro" });
        if (error) throw error;
        if (confirm("✅ Đã lưu bù hàng!\nBạn muốn nhập RPRO khác?")) {
          window.location.reload();
        } else {
          window.location.href = "/";
        }
      } catch (err) {
        alert("Lỗi khi lưu: " + err.message);
      }
    });
});

// Cho scanner dùng
window.handleScanned = handleScanned;

// 👉 Khởi động QR scanner khi Html5Qrcode đã sẵn sàng
window.addEventListener("load", () => {
  const container = document.getElementById("qr-reader");
  if (!container) return;

  // responsive qrbox theo container
  const qrBoxSize = Math.min(container.offsetWidth * 0.7, container.offsetHeight * 0.7);

  const html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: { width: 200, height: 200 }, // khung vuông cố định giữa
      aspectRatio: 1.3333
    },
    qrText => {
      html5QrCode.stop().catch(console.error);
      window.handleScanned(qrText);
    },
    err => {
      // Giảm spam log
    }
  ).catch(err => console.error("Could not start scanner:", err));
});
// Gắn hàm vào window để gọi từ HTML
window.cancelSizeFix = cancelSizeFix;


