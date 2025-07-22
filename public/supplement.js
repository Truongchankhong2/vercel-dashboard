// public/supplement.js

let currentRpro = null;
let orderRecord = null;

// 1) Khởi động QR-reader (và ẩn nếu không có camera)
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
    err => {
      // ignore frame decode errors
    }
  ).catch(e => {
    console.warn("QR scanner unavailable:", e);
    qrContainer.style.display = "none";
  });
}

// 2) Xử lý khi quét hoặc nhập tay
function handleScanned(text) {
  const parts = text.split("|");
  const rpro  = parts.length > 1 ? parts[1].trim() : text.trim();
  loadOrderInfo(rpro);
}

// 3) Load dữ liệu đơn từ public/powerapp.json
async function loadOrderInfo(rpro) {
  currentRpro = rpro;
  try {
    const res  = await fetch("/powerapp.json", { cache: "no-store" });
    const data = await res.json();
    const rec  = data.find(r => (r["PRO ODER"] || "") === rpro);
    if (!rec) {
      alert("Không tìm thấy đơn " + rpro);
      return;
    }
    orderRecord = rec;
    renderOrder(rec);
  } catch (err) {
    console.error(err);
    alert("Lỗi khi tải dữ liệu, thử lại sau.");
  }
}

// 4) Vẽ thông tin đơn và bảng size
function renderOrder(r) {
  // 4.1) Metadata
  document.getElementById("info-rpro").textContent   = r["PRO ODER"]   || "";
  document.getElementById("info-gender").textContent = r["Giới tính"]   || r["Gender"] || "";
  document.getElementById("info-mold").textContent   = r["#MOLD"]      || "";
  document.getElementById("info-tool").textContent   = r["Mã dao"]      || "";
  document.getElementById("info-fabric").textContent = r["Tên vải"]    || r["FB DESCRIPTION"] || "";
  document.getElementById("info-bom").textContent    = r["BOM"]        || "";
  document.getElementById("order-info").classList.remove("hidden");

  // 4.2) Xác định key size: từ sau "CheckLL" hoặc fallback numeric
  const allKeys = Object.keys(r);
  const idx     = allKeys.findIndex(k => /^check\s*ll$/i.test(k));
  let sizeKeys  = idx >= 0
    ? allKeys.slice(idx + 1)
    : allKeys.filter(k => /^(\d+(\.\d+)?)$/.test(k));

  // 4.3) Sắp xếp theo số học
  sizeKeys.sort((a, b) => parseFloat(a) - parseFloat(b));

  // 4.4) Build bảng HTML
  let html = `
    <table class="min-w-full border border-gray-300">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">#</th>
          <th class="border px-2 py-1">Số thiếu</th>
          <th class="border px-2 py-1">Số lượng</th>
        </tr>
      </thead>
      <tbody>
  `;
  sizeKeys.forEach((colKey, i) => {
    const missing = Number(r[colKey]) || 0;
    const label   = i + 1;
    html += `
      <tr>
        <td class="border px-2 py-1 text-center">${label}</td>
        <td class="border px-2 py-1 text-center">${missing}</td>
        <td class="border px-2 py-1 text-center">
          <input
            type="number"
            min="0"
            value="0"
            data-index="${i}"
            class="w-16 input-supp"
          />
        </td>
      </tr>
    `;
  });
  html += `
      </tbody>
      <tfoot class="bg-gray-50">
        <tr>
          <td class="border px-2 py-1 font-bold">TOTAL</td>
          <td colspan="2" class="border px-2 py-1 font-bold" id="supp-total">0</td>
        </tr>
      </tfoot>
    </table>
  `;

  const container = document.getElementById("size-table-container");
  container.innerHTML = html;
  container.classList.remove("hidden");

  // 4.5) Bắt event tính tổng
  document.querySelectorAll(".input-supp").forEach(inp => {
    inp.addEventListener("input", updateTotal);
  });
  document.getElementById("btn-confirm-supplement").disabled = false;
}

// 5) Cập nhật tổng
function updateTotal() {
  const sum = [...document.querySelectorAll(".input-supp")]
    .reduce((acc, inp) => acc + Number(inp.value || 0), 0);
  document.getElementById("supp-total").textContent = sum;
}

// 6) Bind event & init QR khi DOM sẵn sàng
window.addEventListener("DOMContentLoaded", () => {
  // Nút Bù hàng trên index.html
  const btnSupp = document.getElementById("btn-supplement");
  if (btnSupp) {
    btnSupp.addEventListener("click", () => {
      window.location.href = "/supplement.html";
    });
  }

  // Nút OK nhập tay
  const btnManual = document.getElementById("btn-manual-ok");
  if (btnManual) {
    btnManual.addEventListener("click", () => {
      handleScanned(document.getElementById("manualRpro").value);
    });
  }

  // Nút Xác nhận
  const btnConfirm = document.getElementById("btn-confirm-supplement");
  if (btnConfirm) {
    btnConfirm.addEventListener("click", async () => {
      const details = {};
      document.querySelectorAll(".input-supp").forEach(inp => {
        details[inp.dataset.index] = Number(inp.value) || 0;
      });

      const payload = {
        rpro: currentRpro,
        metadata: {
          gender: document.getElementById("info-gender").textContent,
          mold:   document.getElementById("info-mold").textContent,
          tool:   document.getElementById("info-tool").textContent,
          fabric: document.getElementById("info-fabric").textContent,
          bom:    document.getElementById("info-bom").textContent
        },
        details,
        total: Number(document.getElementById("supp-total").textContent)
      };

      try {
        const res = await fetch("/supplement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          alert("Lưu bù hàng thành công!");
          window.location.href = "/";
        } else {
          throw new Error("Server trả lỗi");
        }
      } catch (err) {
        console.error(err);
        alert("Lỗi khi lưu, thử lại.");
      }
    });
  }

  // Init QR-reader nếu có
  if (document.getElementById("qr-reader")) {
    initQrScanner();
  }
});
