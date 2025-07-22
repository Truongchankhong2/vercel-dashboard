// public/supplement.js

let currentRpro = null;
let headersArr  = [];

// 1) Khởi động QR-reader (ẩn nếu không có camera)
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
      // Ignore decode errors per frame
    }
  ).catch(e => {
    console.warn("QR scanner unavailable:", e);
    qrContainer.style.display = "none";
  });
}

// 2) Tách RPRO từ QR hoặc nhập tay
function handleScanned(text) {
  const parts = text.split("|");
  const rpro  = parts.length > 1 ? parts[1].trim() : text.trim();
  loadOrderInfo(rpro);
}

// 3) Load headers + data từ powerapp.json
async function loadOrderInfo(rpro) {
  currentRpro = rpro;
  try {
    const res  = await fetch("/powerapp.json", { cache: "no-store" });
    const { headers, data } = await res.json();
    headersArr = headers;
    const rec = data.find(r => (r["PRO ODER"]||"") === rpro);
    if (!rec) {
      alert("Không tìm thấy đơn " + rpro);
      return;
    }
    renderOrder(rec);
  } catch (err) {
    console.error("loadOrderInfo:", err);
    alert("Lỗi khi tải dữ liệu, vui lòng thử lại.");
  }
}

// 4) Vẽ metadata và bảng size theo đúng thứ tự headersArr
function renderOrder(r) {
  // 4.1) Metadata
  document.getElementById("info-rpro").textContent   = r["PRO ODER"]   || "";
  document.getElementById("info-gender").textContent = r["Giới tính"]   || r["Gender"] || "";
  document.getElementById("info-mold").textContent   = r["#MOLD"]      || "";
  document.getElementById("info-tool").textContent   = r["Mã dao"]      || "";
  document.getElementById("info-fabric").textContent = r["Tên vải"]    || r["FB DESCRIPTION"] || "";
  document.getElementById("info-bom").textContent    = r["BOM"]        || "";
  document.getElementById("order-info").classList.remove("hidden");

  // 4.2) Xác định sizeKeys: header sau "CheckLL"
  const idx = headersArr.indexOf("CheckLL");
  let sizeKeys = idx >= 0
    ? headersArr.slice(idx + 1)
    : headersArr.filter(h => /^\d+(\.\d+)?$/.test(h));

  // 4.3) Build bảng
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
    const missing = Number(r[size]) || 0;
    html += `
      <tr>
        <td class="border px-2 py-1 text-center">${size}</td>
        <td class="border px-2 py-1 text-center">${missing}</td>
        <td class="border px-2 py-1 text-center">${missing ? "" : ""}</td>
        <td class="border px-2 py-1 text-center">
          <input
            type="number"
            min="0"
            value="0"
            data-size="${size}"
            class="w-16 input-supp"
          />
        </td>
      </tr>
    `.replace('<td class="border px-2 py-1 text-center"></td>', ''); // remove extra cell
  });
  html = html.replace(/<td class="border px-2 py-1 text-center"><\/td>/g, ''); // cleanup
  // Actually PO Quantity should be the input, Số thiếu static, so:
  html = `
    <table class="min-w-full border border-gray-300">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">Size</th>
          <th class="border px-2 py-1">PO Quantity</th>
          <th class="border px-2 py-1">Số thiếu</th>
        </tr>
      </thead>
      <tbody>
  `;
  sizeKeys.forEach(size => {
    const missing = Number(r[size]) || 0;
    html += `
      <tr>
        <td class="border px-2 py-1 text-center">${size}</td>
        <td class="border px-2 py-1 text-center">${missing}</td>
        <td class="border px-2 py-1 text-center">
          <input type="number" min="0" value="0"
                 data-size="${size}" class="w-16 input-supp" />
        </td>
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

  // 4.4) Bắt event tính tổng
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

// 6) Bind sự kiện & init QR-reader khi DOM sẵn sàng
window.addEventListener("DOMContentLoaded", () => {
  // Nút quay về
  const btnBack = document.getElementById("btn-back");
  if (btnBack) {
    btnBack.addEventListener("click", () => window.location.href = "/");
  }

  // Nút Bù hàng (index.html)
  const btnSupp = document.getElementById("btn-supplement");
  if (btnSupp) {
    btnSupp.addEventListener("click", () => {
      window.location.href = "/supplement.html";
    });
  }

  // Nút OK nhập tay (supplement.html)
  const btnManual = document.getElementById("btn-manual-ok");
  if (btnManual) {
    btnManual.addEventListener("click", () => {
      handleScanned(document.getElementById("manualRpro").value);
    });
  }

  // Nút Xác nhận bù hàng, kèm hộp thoại hỏi tiếp
  const btnConfirm = document.getElementById("btn-confirm-supplement");
  if (btnConfirm) {
    btnConfirm.addEventListener("click", async () => {
      const details = {};
      document.querySelectorAll(".input-supp").forEach(inp => {
        details[inp.dataset.size] = Number(inp.value) || 0;
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
          const again = window.confirm(
            "Lưu bù hàng thành công!\n\nBạn có muốn nhập RPRO mới không?"
          );
          if (again) {
            window.location.reload();
          } else {
            window.location.href = "/";
          }
        } else {
          const body = await res.json().catch(() => ({}));
          alert("Lỗi khi lưu: " + (body.error || res.statusText));
        }
      } catch (err) {
        console.error("submit supplement:", err);
        alert("Lỗi khi lưu, thử lại.");
      }
    });
  }

  // Nếu ở supplement.html, khởi QR-reader
  if (document.getElementById("qr-reader")) {
    initQrScanner();
  }
});
