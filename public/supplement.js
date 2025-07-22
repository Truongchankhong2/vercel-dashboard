// public/supplement.js

let currentRpro = null;
let orderRecord = null;

// 1) Khởi động QR-reader
function initQrScanner() {
  const qrReader = new Html5Qrcode("qr-reader");
  qrReader.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true
    },
    decodedText => {
      qrReader.stop();
      handleScanned(decodedText);
    },
    err => {
      // ignore frame decode errors
    }
  ).catch(console.error);
}

// 2) Xử lý khi quét hoặc nhập tay
function handleScanned(text) {
  const parts = text.split("|");
  const rpro = parts.length > 1 ? parts[1].trim() : text.trim();
  loadOrderInfo(rpro);
}

// 3) Load dữ liệu đơn từ powerapp.json
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

// 4) Vẽ thông tin đơn và bảng size dùng số thứ tự
function renderOrder(r) {
  // Hiển thị metadata
  document.getElementById("info-rpro").textContent   = r["PRO ODER"]   || "";
  document.getElementById("info-gender").textContent = r["Giới tính"]   || r["Gender"] || "";
  document.getElementById("info-mold").textContent   = r["#MOLD"]      || "";
  document.getElementById("info-tool").textContent   = r["Mã dao"]      || "";
  document.getElementById("info-fabric").textContent = r["Tên vải"]    || r["FB DESCRIPTION"] || "";
  document.getElementById("info-bom").textContent    = r["BOM"]        || "";
  document.getElementById("order-info").classList.remove("hidden");

  // Lấy các cột sau "CheckLL"
  const keys   = Object.keys(r);
  const idx    = keys.indexOf("CheckLL");
  const cols   = idx >= 0 ? keys.slice(idx + 1) : [];

  // Build bảng với nhãn thứ tự
  let html = `<table class="min-w-full border border-gray-300"><thead class="bg-gray-100"><tr>
    <th class="border px-2 py-1">#</th>
    <th class="border px-2 py-1">Số thiếu</th>
    <th class="border px-2 py-1">Số lượng</th>
  </tr></thead><tbody>`;

  cols.forEach((colKey, i) => {
    const missing = Number(r[colKey]) || 0;
    const label   = i + 1;
    html += `<tr>
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
    </tr>`;
  });

  html += `</tbody><tfoot class="bg-gray-50">
    <tr>
      <td class="border px-2 py-1 font-bold">TOTAL</td>
      <td colspan="2" class="border px-2 py-1 font-bold" id="supp-total">0</td>
    </tr>
  </tfoot></table>`;

  const container = document.getElementById("size-table-container");
  container.innerHTML = html;
  container.classList.remove("hidden");

  // Bắt event tính tổng
  document.querySelectorAll(".input-supp").forEach(inp => {
    inp.addEventListener("input", updateTotal);
  });

  // Mở nút Xác nhận
  document.getElementById("btn-confirm-supplement").disabled = false;
}

// 5) Tính tổng các ô input
function updateTotal() {
  const sum = [...document.querySelectorAll(".input-supp")]
    .reduce((acc, i) => acc + Number(i.value || 0), 0);
  document.getElementById("supp-total").textContent = sum;
}

// 6) Bind event và khởi scanner khi DOM sẵn sàng
window.addEventListener("DOMContentLoaded", () => {
  // Nút Bù hàng trên index.html
  const btnSupp = document.getElementById("btn-supplement");
  if (btnSupp) {
    btnSupp.addEventListener("click", () => {
      window.location.href = "/supplement.html";
    });
  }

  // Nút OK khi nhập tay RPRO
  const btnManual = document.getElementById("btn-manual-ok");
  if (btnManual) {
    btnManual.addEventListener("click", () => {
      const val = document.getElementById("manualRpro").value;
      handleScanned(val);
    });
  }

  // Nút Xác nhận bù hàng
  const btnConfirm = document.getElementById("btn-confirm-supplement");
  if (btnConfirm) {
    btnConfirm.addEventListener("click", async () => {
      // Thu dữ liệu theo index
      const details = {};
      document.querySelectorAll(".input-supp").forEach(inp => {
        const idx   = inp.dataset.index;
        details[idx] = Number(inp.value) || 0;
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

  // Nếu đang ở trang supplement.html, khởi QR-reader
  if (document.getElementById("qr-reader")) {
    initQrScanner();
  }
});
