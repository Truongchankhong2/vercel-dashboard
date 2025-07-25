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

/**
 * Vẽ thông tin đơn và bảng Size
 * @param {Object} rec     – Bản ghi của đơn (từ powerapp.json)
 * @param {Object|null} existing – Dữ liệu bù hàng đã lưu (nếu có)
 */
function renderOrder(rec, existing = null) {
  // 1) Hiển thị metadata đơn
  document.getElementById("info-rpro").textContent   = rec["PRO ODER"] || "";
  document.getElementById("info-gender").textContent = rec["Giới tính"] || rec["GENDER"] || "";
  document.getElementById("info-mold").textContent   = rec["Mã Khuôn"] || rec["#MOLD"] || "";
  document.getElementById("info-tool").textContent   = rec["Mã dao"]  || rec["#Last"]  || "";
  document.getElementById("info-fabric").textContent = rec["Tên vải"] || rec["FB DESCRIPTION"] || "";
  document.getElementById("info-bom").textContent    = rec["BOM"]      || "";
  document.getElementById("order-info").classList.remove("hidden");

  // 2) Xác định danh sách Size gốc (các cột sau "CheckLL" trong headersArr)
  const idx      = headersArr.indexOf("CheckLL");
  const allSizes = idx >= 0 ? headersArr.slice(idx + 1) : [];
  // Lấy ra chỉ những size gốc có PO>0
  const origSizes = allSizes.filter(sz => {
    const v = rec[sz];
    return v !== undefined && v !== null && Number(v) > 0;
  });

  // 3) Nếu là Women's, build mảng fixEntries = [[femaleSize, fixQty], ...]
  let fixEntries = [];
  if (useSizeFix && sizeFixData) {
    fixEntries = Object.entries(sizeFixData)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([s, qty]) => [s, Number(qty)])
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

  // 5) Duyệt origSizes, với Men's poQty từ rec, với Women's từ fixEntries
  for (let i = 0; i < origSizes.length; i++) {
    const orig = origSizes[i];
    // với Women's thì zip, còn Men's fixEntries rỗng => female="" và fixQty=""
    const female = useSizeFix ? (fixEntries[i]?.[0] || "") : "";
    const fixQty = useSizeFix ? (fixEntries[i]?.[1] || 0) : 0;

    // PO quantity: nếu dùng sizeFix thì lấy fixQty, còn không thì từ rec[orig]
    const poQty = useSizeFix
      ? fixQty
      : ( () => {
          const raw = rec[orig];
          // ép kiểu sao cho parse được cả "1,290" thành 1290
          const num = parseInt((raw||"").toString().replace(/,/g,''), 10);
          return isNaN(num) ? 0 : num;
        })();

    // Giữ lại giá trị đã lưu (nếu có)
    const oldQty = existing?.[normalizeSizeKey(useSizeFix ? female : orig)] || "";

    html += `
      <tr>
        <td class="border px-2 py-1 text-center">${orig}</td>
        <td class="border px-2 py-1 text-center">${female}</td>
        <td class="border px-2 py-1 text-center">
          <input type="number" min="0"
                 value="${oldQty}"
                 data-size="${useSizeFix ? female : orig}"
                 class="w-16 input-supp" />
        </td>
        <td class="border px-2 py-1 text-center">${poQty}</td>
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

  // 7) Nếu Women's, thêm cảnh báo ở đầu
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

  // 8) Render và bind sự kiện
  const container = document.getElementById("size-table-container");
  container.innerHTML = html;
  container.classList.remove("hidden");

  document.querySelectorAll(".input-supp").forEach(inp =>
    inp.addEventListener("input", updateTotal)
  );
  updateTotal();

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
    // 1) Chuẩn bị payload cơ bản
    const payload = {
      rpro: currentRpro,
      gender: document.getElementById("info-gender").textContent,
      mold:   document.getElementById("info-mold").textContent,
      tool:   document.getElementById("info-tool").textContent,
      fabric: document.getElementById("info-fabric").textContent,
      bom:    document.getElementById("info-bom").textContent,
      total:  Number(document.getElementById("supp-total").textContent)
    };

    // 2) Lấy các giá trị số bù hàng
    document.querySelectorAll(".input-supp").forEach(inp => {
      const size = inp.dataset.size;
      const qty  = Number(inp.value) || 0;
      payload[normalizeSizeKey(size)] = qty;
    });

    // 3) Tính remark nếu Women's và có sizeFixData
    let remark = "";
    if (useSizeFix && sizeFixData) {
      // 3.1) Xác định origSizes từ rawRecord
      const idx      = headersArr.indexOf("CheckLL");
      const allSizes = idx >= 0 ? headersArr.slice(idx + 1) : [];
      const origSizes = allSizes.filter(sz =>
        Number(rawRecord[sz]) > 0
      );

      // 3.2) Xây mảng fixEntries = [[femaleSize, fixQty], ...]
      const fixEntries = Object.entries(sizeFixData)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([s, qty]) => [s, Number(qty)])
        .sort(([a], [b]) => parseFloat(a) - parseFloat(b));

      // 3.3) Kiểm tra 3 dòng liên tiếp femaleSize ≠ origSize
      let consec = 0;
      for (let i = 0; i < origSizes.length; i++) {
        const orig     = origSizes[i];
        const female   = fixEntries[i]?.[0] || "";
        if (female && female !== orig) {
          consec++;
          if (consec >= 3) {
            remark = "Size fixed";
            break;
          }
        } else {
          consec = 0;
        }
      }
    }
    payload.remark = remark;

    // 4) Upsert lên Supabase
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

});
