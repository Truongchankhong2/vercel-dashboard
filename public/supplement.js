import { supabase } from './supabaseClient.js';

let currentRpro = null;
let headersArr = [];
let useSizeFix = false;
let rawRecord = null;
let sizeFixData = null;

// 👉 Chuyển size: "7.5" → "size_7_5"
function normalizeSizeKey(size) {
  return 'size_' + size.replace(/\./g, '_');
}

// 👉 Khi scan hoặc nhập tay
function handleScanned(text) {
  const parts = text.split("|");
  const rpro = parts.length > 1 ? parts[1].trim() : text.trim();
  loadOrderInfo(rpro);
}

// 👉 Load dữ liệu đơn hàng
async function loadOrderInfo(rpro) {
  currentRpro = rpro;
  useSizeFix = false;
  rawRecord = null;
  sizeFixData = null;

  const loadingEl = document.getElementById("loading-status");
  if (loadingEl) loadingEl.classList.remove("hidden");

  try {
    const res = await fetch("/powerapp.json", { cache: "no-store" });
    const { headers, data } = await res.json();
    headersArr = headers;
    const rec = data.find(r => (r["PRO ODER"] || "") === rpro);
    if (!rec) throw new Error("Không tìm thấy đơn " + rpro);
    rawRecord = rec;

    // Check gender
    const gender = rec["Giới tính"] || rec["GENDER"] || "";
    if (gender === "Women's") {
      const resFix = await fetch("/sizefix.json");
      const fixJson = await resFix.json();
      sizeFixData = fixJson[rpro] || null;
      if (sizeFixData) useSizeFix = true;
    }

    const { data: existingRows } = await supabase
      .from("supplement")
      .select("*")
      .eq("rpro", rpro)
      .limit(1);
    const existingData = existingRows?.[0] || null;

    renderOrder(rec, existingData);
  } catch (err) {
    alert(err.message || "Lỗi khi tải dữ liệu");
    console.error(err);
  } finally {
    if (loadingEl) loadingEl.classList.add("hidden");
  }
}

// 👉 Vẽ bảng size + metadata
/**
 * Vẽ thông tin đơn và bảng Size
 * @param {Object} rec     – Bản ghi của đơn (từ powerapp.json)
 * @param {Object|null} existing – Dữ liệu bù hàng đã lưu (nếu có)
 */
function renderOrder(rec, existing = null) {
  // 1) Hiển thị metadata đơn
  document.getElementById("info-rpro").textContent   = rec["PRO ODER"] || "";
  document.getElementById("info-gender").textContent = rec["Giới tính"] || rec["GENDER"] || "";
  document.getElementById("info-mold").textContent   = rec["Mã Khuôn"] || rec["MOLD"] || "";
  document.getElementById("info-tool").textContent   = rec["Mã dao"] || rec["Last"] || "";
  document.getElementById("info-fabric").textContent = rec["Tên vải"] || rec["FB DESCRIPTION"] || "";
  document.getElementById("info-bom").textContent    = rec["BOM"] || "";
  document.getElementById("order-info").classList.remove("hidden");

  // 2) Xác định danh sách Size gốc (các cột sau "CheckLL" trong headersArr)
  const idx      = headersArr.indexOf("CheckLL");
  const allSizes = idx >= 0 ? headersArr.slice(idx + 1) : [];
  const origSizes = allSizes.filter(sz => Number(rec[sz]) > 0);

  // 3) Nếu là Women's và có sizeFixData, build mảng fixEntries = [[femaleSize, fixQty], ...]
  let fixEntries = [];
  if (useSizeFix && sizeFixData) {
    fixEntries = Object.entries(sizeFixData)
      .filter(([, qty]) => qty > 0)
      .map(([s, qty]) => [s, qty])
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b));
  }

  // 4) Bắt đầu dựng HTML bảng
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

  // 5) Zip origSizes với fixEntries theo chỉ số
  for (let i = 0; i < origSizes.length; i++) {
    const orig     = origSizes[i];
    const [female, fixQty] = fixEntries[i] || ["", ""];
    const oldQty   = existing?.[normalizeSizeKey(female)] || "";

    html += `
      <tr>
        <td class="border px-2 py-1 text-center">${orig}</td>
        <td class="border px-2 py-1 text-center">${female}</td>
        <td class="border px-2 py-1 text-center">
          <input type="number" min="0"
                 value="${oldQty}"
                 data-size="${female || orig}"
                 class="w-16 input-supp" />
        </td>
        <td class="border px-2 py-1 text-center">${fixQty}</td>
      </tr>
    `;
  }

  // 6) Footer tổng
  html += `
      </tbody>
      <tfoot class="bg-gray-50">
        <tr>
          <td colspan="2" class="border px-2 py-1 font-bold">TOTAL</td>
          <td class="border px-2 py-1 font-bold" id="supp-total">0</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;

  // 7) Nếu đang giảm size (Women's), thêm cảnh báo ở đầu
  if (useSizeFix) {
    html = `
      <div class="bg-yellow-200 text-yellow-800 p-2 mb-2 rounded">
        ⚠️ CẢNH BÁO SIZE NỮ!! ĐÃ TỰ ĐỘNG GIẢM SIZE!!
        <button onclick="cancelSizeFix()"
                class="ml-4 bg-red-600 text-white px-2 py-1 rounded">
          Bỏ giảm size
        </button>
      </div>
    ` + html;
  }

  // 8) Render lên DOM và bind sự kiện
  const container = document.getElementById("size-table-container");
  container.innerHTML = html;
  container.classList.remove("hidden");

  // Kích hoạt input và tính tổng khi thay đổi
  document.querySelectorAll(".input-supp").forEach(inp =>
    inp.addEventListener("input", updateTotal)
  );
  updateTotal();

  // Cho phép nút Xác nhận
  document.getElementById("btn-confirm-supplement").disabled = false;
}



// 👉 Bỏ giảm size (quay về bảng gốc)
window.cancelSizeFix = () => {
  useSizeFix = false;
  renderOrder(rawRecord);
};

// 👉 Tính tổng số thiếu
function updateTotal() {
  const sum = [...document.querySelectorAll(".input-supp")]
    .reduce((acc, inp) => acc + Number(inp.value || 0), 0);
  document.getElementById("supp-total").textContent = sum;
}

// 👉 DOM Event
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-back")?.addEventListener("click", () => window.location.href = "/");
  document.getElementById("btn-supplement")?.addEventListener("click", () => window.location.href = "/supplement.html");
  document.getElementById("btn-manual-ok")?.addEventListener("click", () => {
    handleScanned(document.getElementById("manualRpro").value);
  });

  document.getElementById("btn-confirm-supplement")?.addEventListener("click", async () => {
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
      payload[normalizeSizeKey(size)] = qty;
    });

    try {
      const { error } = await supabase
        .from("supplement")
        .upsert([payload], { onConflict: "rpro" });

      if (error) throw error;

      const again = window.confirm("✅ Đã lưu bù hàng!\nBạn muốn nhập RPRO khác?");
      window.location.href = again ? window.location.href : "/";
    } catch (err) {
      alert("Lỗi khi lưu: " + err.message);
    }
  });

  if (document.getElementById("qr-reader")) {
    const qrContainer = document.getElementById("qr-reader");
    const qrReader = new Html5Qrcode("qr-reader");
    qrReader.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      decoded => {
        qrReader.stop();
        handleScanned(decoded);
      },
      err => {}
    ).catch(() => qrContainer.style.display = "none");
  }
});
