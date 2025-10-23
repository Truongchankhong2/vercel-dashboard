import { supabase } from './supabaseClient.js';


let currentRpro = null;
let headersArr = [];
let useSizeFix = false;         // Có đang dùng sizeFix (Women's)
let showSizeFixValues = true;   // Hiển thị số Size nữ hay không
let rawRecord = null;           // Dữ liệu gốc
let sizeFixData = {};           // Dữ liệu sizeFix
let existingRecord = null;      // Dữ liệu đã nhập trên Supabase

// 👉 Hàm ghi lượt truy cập vào bảng visit
async function logVisit(page, button = null) {
  const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

  const { data, error } = await supabase.rpc('increment_visit', {
  p_date: today,
  p_page: page || '',
  p_button: button || 'unknown'
});



  if (error) {
    console.error(`❌ logVisit error for page=${page}, button=${button}:`, error);
  } else {
    console.log(`✅ logVisit success for page=${page}, button=${button}`, data);
  }
}

// 👉 SỬA LỖI NULL: Thêm lại hàm chuẩn hóa key
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
    const res = await fetch("/powerapp.json?v=" + Date.now(), { cache: "no-store" });
    const { headers, data } = await res.json();
    headersArr = headers;

    const rec = data.find(r => (r["PRO ODER"] || "") === rpro);
    if (!rec) {
      alert("Không tìm thấy đơn " + rpro);
      if (loadingEl) loadingEl.classList.add("hidden");
      return;
    }

    const gender = rec["Giới tính"] || rec["GENDER"] || "";
    useSizeFix = false;
    showSizeFixValues = true;
    sizeFixData = {};

    if (gender === "Women's") {
      try {
        const resFix = await fetch("/sizefix.json?v=" + Date.now(), { cache: "no-store" });
        const sizefixJson = await resFix.json();
        sizeFixData = sizefixJson[rpro] || {};
        if (Object.keys(sizeFixData).length > 0) {
          useSizeFix = true;
        }
      } catch (err) {
        console.warn("Không thể tải sizefix.json:", err);
      }
    }

    const { data: existingRows } = await supabase
      .from('supplement')
      .select('*')
      .eq('rpro', rpro)
      .limit(1);

    existingRecord = (existingRows && existingRows.length > 0) ? existingRows[0] : null;
    rawRecord = rec;

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
  document.getElementById("info-rpro").textContent = rec["PRO ODER"] || "";
  document.getElementById("info-so").textContent = rec["SO"] || rec["Sales Order"] || "";
  document.getElementById("info-customers").textContent = rec["CUSTOMERS"] || "";
  const gender = rec["Giới tính"] || rec["GENDER"] || "";
  document.getElementById("info-gender").textContent = gender;
  document.getElementById("info-mold").textContent = rec["Mã Khuôn"] || rec["#MOLD"] || "";
  document.getElementById("info-pu").textContent = rec["Mã dao"] || rec["PU"] || "";
  document.getElementById("info-fabric").textContent = rec["Tên vải"] || rec["FB DESCRIPTION"] || "";
  document.getElementById("info-bom").textContent = rec["BOM"] || "";
  document.getElementById("order-info").classList.remove("hidden");

  const sizeKeys = headersArr.filter(h => !isNaN(parseFloat(h)));

  const originalData = rec;
  const femaleData = sizeFixData || {};

  const originalSizes = sizeKeys
    .filter(s => Number(originalData[s]) > 0)
    .map(s => parseFloat(s))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b)
    .map(n => n.toString());

  const femaleSizes = Object.keys(femaleData)
    .map(s => parseFloat(s))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b)
    .map(n => n.toString());

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

  if (originalSizes.length === 0) {
     html += `<tr><td colspan="4" class="text-center p-4 text-red-600">Không tìm thấy dữ liệu size cho đơn hàng này!</td></tr>`;
  }

  originalSizes.forEach((sizeOriginal, idx) => {
    const sizeFemale = (gender === "Women's" && femaleSizes[idx] && showSizeFixValues) 
                        ? femaleSizes[idx] 
                        : "";

    const poQtyOriginal = Number(originalData[sizeOriginal]) || 0;
    const poQtyFemale = femaleSizes[idx] ? Number(femaleData[femaleSizes[idx]]) || 0 : 0;
    const poQty = (gender === "Women's" && useSizeFix && showSizeFixValues) ? poQtyFemale : poQtyOriginal;

    const inputKey = sizeOriginal;
    // SỬA LỖI NULL: Thêm lại hàm chuẩn hóa key
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

  const container = document.getElementById("size-table-container");
  container.innerHTML = html;
  container.classList.remove("hidden");

  document.querySelectorAll(".input-supp").forEach(inp => {
    inp.addEventListener("input", updateTotal);
  });
  updateTotal();
  document.getElementById("btn-confirm-supplement").disabled = false;
}

function cancelSizeFix() {
  showSizeFixValues = false;  
  renderOrder(rawRecord, existingRecord);
}

function updateTotal() {
  const sum = [...document.querySelectorAll(".input-supp")]
    .reduce((acc, inp) => acc + Number(inp.value || 0), 0);
  document.getElementById("supp-total").textContent = sum;
}

// 👉 DOM events & QR init
window.addEventListener("DOMContentLoaded", () => {
  // Log visit khi vừa mở trang
  logVisit("Supplement");

  document.getElementById("btn-manual-ok")
    .addEventListener("click", () => handleScanned(document.getElementById("manualRpro").value));

  document.getElementById("btn-confirm-supplement")
    .addEventListener("click", async () => {
      const genderVal = document.getElementById("info-gender").textContent.trim();
      const remarkNote = document.getElementById("note-textarea").value.trim();
      const payload = {
        rpro: currentRpro,
        so: document.getElementById("info-so").textContent,
        customers: document.getElementById("info-customers").textContent,
        gender: genderVal,
        mold: document.getElementById("info-mold").textContent,
        pu: document.getElementById("info-pu").textContent,
        fabric: document.getElementById("info-fabric").textContent,
        bom: document.getElementById("info-bom").textContent,
        total: Number(document.getElementById("supp-total").textContent),
        remark: (genderVal === "Women's" && useSizeFix && showSizeFixValues) ? "Size fixed" : "",
        remark2: remarkNote
      };
      document.querySelectorAll(".input-supp").forEach(inp => {
        // SỬA LỖI NULL: Thêm lại hàm chuẩn hóa key
        payload[normalizeSizeKey(inp.dataset.size)] = Number(inp.value) || 0;
      });
      // === THÊM DÒNG NÀY ĐỂ KIỂM TRA ===
      console.log("Dữ liệu đang gửi:", payload); 
      // ==================================
      try {
        const { error } = await supabase
          .from("supplement")
          .upsert([payload], { onConflict: "rpro" });
        if (error) throw error;

        // Log thêm khi bấm nút Confirm
        logVisit("Supplement", "Confirm");

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

window.handleScanned = handleScanned;
window.cancelSizeFix = cancelSizeFix;

window.addEventListener("load", () => {
  const container = document.getElementById("qr-reader");
  if (!container) return;

  const html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.3333 },
    qrText => {
      html5QrCode.stop().catch(console.error);
      window.handleScanned(qrText);
    }
  ).catch(err => console.error("Could not start scanner:", err));
});