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
    (decodedText) => {
      qrReader.stop();
      handleScanned(decodedText);
    },
    (err) => {
      // Ignore frame decode errors
    }
  ).catch(console.error);
}

// 2) Xử lý khi quét hoặc nhập tay
function handleScanned(text) {
  // Tách RPRO sau dấu '|', nếu không có dấu thì lấy nguyên
  const parts = text.split("|");
  const rpro = parts.length > 1 ? parts[1].trim() : text.trim();
  loadOrderInfo(rpro);
}

// 3) Khi click OK nhập tay
document.getElementById("btn-manual-ok").addEventListener("click", () => {
  handleScanned(document.getElementById("manualRpro").value);
});

// 4) Tải dữ liệu cho RPRO từ powerapp.json
async function loadOrderInfo(rpro) {
  currentRpro = rpro;
  try {
    const res = await fetch("/powerapp.json", { cache: "no-store" });
    const data = await res.json();
    // Tìm bản ghi PRO ODER === rpro
    const rec = data.find(r => (r["PRO ODER"] || "") === rpro);
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

// 5) Vẽ thông tin đơn và bảng size
function renderOrder(r) {
  // metadata
  document.getElementById("info-rpro").textContent   = r["PRO ODER"] || "";
  document.getElementById("info-gender").textContent = r["Giới tính"] || r["Gender"] || "";
  document.getElementById("info-mold").textContent   = r["#MOLD"] || "";
  document.getElementById("info-tool").textContent   = r["Mã dao"] || "";
  document.getElementById("info-fabric").textContent = r["Tên vải"] || r["FB DESCRIPTION"] || "";
  document.getElementById("info-bom").textContent    = r["BOM"] || "";

  document.getElementById("order-info").classList.remove("hidden");

  // Xác định các cột Size: từ sau "CheckLL" trở đi
  const allKeys = Object.keys(r);
  const idx = allKeys.indexOf("CheckLL");
  const sizeKeys = idx >= 0
    ? allKeys.slice(idx + 1)
    : allKeys.filter(k => /^#\d+(\.\d+)?$/.test(k));

  // Build bảng HTML
  let html = `<table class="min-w-full border border-gray-300">`;
  html += `<thead class="bg-gray-100"><tr>
    <th class="border px-2 py-1">Size</th>
    <th class="border px-2 py-1">Số thiếu</th>
    <th class="border px-2 py-1">Số lượng</th>
  </tr></thead><tbody>`;
  sizeKeys.forEach(size => {
    const missing = Number(r[size]) || 0;
    html += `<tr>
      <td class="border px-2 py-1">${size}</td>
      <td class="border px-2 py-1">${missing}</td>
      <td class="border px-2 py-1">
        <input
          type="number" min="0" value="0"
          class="w-16 px-1 py-0.5 input-supp"
          data-size="${size}"
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

  // 6) Bắt event change để tính tổng
  document.querySelectorAll(".input-supp").forEach(inp => {
    inp.addEventListener("input", updateTotal);
  });

  // Enable nút xác nhận
  document.getElementById("btn-confirm-supplement").disabled = false;
}

// 7) Cập nhật tổng số lượng
function updateTotal() {
  const sum = [...document.querySelectorAll(".input-supp")]
    .reduce((acc, i) => acc + Number(i.value || 0), 0);
  document.getElementById("supp-total").textContent = sum;
}

// 8) Gửi dữ liệu lên server khi bấm Xác nhận
document.getElementById("btn-confirm-supplement").addEventListener("click", async () => {
  const details = {};
  document.querySelectorAll(".input-supp").forEach(i => {
    details[i.dataset.size] = Number(i.value) || 0;
  });
  const payload = {
    rpro: currentRpro,
    metadata: {
      gender: document.getElementById("info-gender").textContent,
      mold:   document.getElementById("info-mold").textContent,
      tool:   document.getElementById("info-tool").textContent,
      fabric: document.getElementById("info-fabric").textContent,
      bom:    document.getElementById("info-bom").textContent,
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

// Khởi động module khi DOM load xong
window.addEventListener("DOMContentLoaded", () => {
  // Nút Bù hàng trên index.html
  const btnSup = document.getElementById("btn-supplement");
  if (btnSup) {
    btnSup.addEventListener("click", () => {
      window.location.href = "/supplement.html";
    });
  }
  // Nếu đang ở trang supplement.html thì init QR
  if (document.getElementById("qr-reader")) {
    initQrScanner();
  }
});
