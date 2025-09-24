import { supabase } from './supabaseClient.js';

let currentBox = null;
let bagList = [];
let scanMode = "box"; // mặc định quét thùng

const status = document.getElementById("scan-status");
const btnSave = document.getElementById("btn-save");
const btnScanBox = document.getElementById("btn-scan-box");
const btnScanBag = document.getElementById("btn-scan-bag");
const btnCapture = document.getElementById("btn-capture");

window.addEventListener("load", () => {
  const qrScanner = new Html5Qrcode("qr-reader");

  function startScanner() {
    qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.3333 },
      qrText => {
        qrScanner.stop().catch(console.error);
        if (scanMode === "box") handleBoxQR(qrText);
        else if (scanMode === "bag") handleBagQR(qrText);

        // bật lại sau 1s để quét tiếp
        setTimeout(startScanner, 1000);
      }
    ).catch(err => console.error("Scan error:", err));
  }

  startScanner();
});

// === Chuyển chế độ quét Thùng ===
btnScanBox.addEventListener("click", () => {
  if (currentBox) {
    const bagTarget = parseInt(document.getElementById("input-bag-count").value);
    if (bagList.length < bagTarget) {
      alert("❌ Scan chưa đủ số bịch bù yêu cầu!");
      return;
    }
  }

  scanMode = "box";
  bagList = []; // reset danh sách bịch
  renderBagTable();

  btnScanBox.disabled = true;
  btnScanBox.classList.add("opacity-50");
  btnScanBox.textContent = "⏳ Đang quét thùng...";
  status.classList.remove("hidden");
  status.textContent = "📦 Chế độ quét thùng";
  setTimeout(() => {
    btnScanBox.disabled = false;
    btnScanBox.classList.remove("opacity-50");
    btnScanBox.textContent = "Scan QR Thùng";
  }, 800);
});

// === Chuyển chế độ quét Bịch ===
btnScanBag.addEventListener("click", () => {
  if (!currentBox) return alert("❌ Chưa scan thùng!");

  const bagTarget = parseInt(document.getElementById("input-bag-count").value);

  if (!bagTarget) {
    alert("❌ Vui lòng nhập số bịch bù trước khi scan bịch!");
    return;
  }

  scanMode = "bag";

  btnScanBag.disabled = true;
  btnScanBag.classList.add("opacity-50");
  btnScanBag.textContent = "⏳ Đang quét bịch...";
  status.classList.remove("hidden");
  status.textContent = "🛍️ Chế độ quét bịch";
  setTimeout(() => {
    btnScanBag.disabled = false;
    btnScanBag.classList.remove("opacity-50");
    btnScanBag.textContent = "Scan QR Bịch";
  }, 800);
});

// === Xử lý QR Thùng ===
async function handleBoxQR(qr) {
  status.classList.remove("hidden");
  status.textContent = "🔄 Đang xử lý QR thùng...";

  const parts = qr.split("|");
  const rpro = parts[1]?.trim();
  let boxNo = parts[2] ? parts[2].split("/")[0].trim() : null;

  const res = await fetch("/powerapp.json");
  const { data } = await res.json();
  const rec = data.find(r => r["PRO ODER"] === rpro);

  if (!rec) {
    status.textContent = "❌ Không tìm thấy đơn cho " + rpro;
    return;
  }

  currentBox = { rpro, boxNo, ...rec };
  status.textContent = "✅ Đã quét thành công RPRO: " + rpro;

  const infoDiv = document.getElementById("box-info");
  infoDiv.innerHTML = `
    <p><b>RPRO:</b> ${rpro}</p>
    <p><b>Thùng số:</b> ${boxNo}</p>
    <p><b>Brand:</b> ${rec["Brand Code"]}</p>
    <p><b>Customer:</b> ${rec["CUSTOMERS"]}</p>
    <p><b>#MOLDED:</b> ${rec["#MOLDED"]}</p>
    <p><b>BOM:</b> ${rec["BOM"]}</p>
    <p><b>Total Qty:</b> ${rec["Total Qty"]}</p>
    <p><b>PU:</b> ${rec["PU"]}</p>
    <p><b>FB:</b> ${rec["FB"]}</p>
  `;
  infoDiv.classList.remove("hidden");
}

// === Xử lý QR Bịch ===
function handleBagQR(qr) {
  const bagTarget = parseInt(document.getElementById("input-bag-count").value);
  if (bagList.length >= bagTarget) {
    status.textContent = "⚠️ Đã đủ số bịch bù yêu cầu!";
    return;
  }

  const parts = qr.split("|");
  const rpro = parts[0]?.trim();
  const boxNo = parts[1]?.trim();
  const bagNo = parts[3]?.trim();

  if (!currentBox || rpro !== currentBox.rpro || boxNo !== currentBox.boxNo) {
    status.textContent = "❌ Sai QR bịch (không khớp RPRO/Thùng)";
    return;
  }

  // Kiểm tra trùng bịch
  const isDuplicate = bagList.some(b => b.rpro === rpro && b.boxNo === boxNo && b.bagNo === bagNo);
  if (isDuplicate) {
    status.textContent = `⚠️ Bịch ${bagNo} đã được quét trước đó!`;
    return;
  }

  bagList.push({
    rpro, boxNo, bagNo,
    photoBlob: null,
    photoStatus: "❌ Chưa chụp"
  });


  renderBagTable();
  status.textContent = `✅ Đã thêm bịch ${bagNo} (${bagList.length}/${bagTarget})`;
}

// === Render bảng bịch ===
function renderBagTable() {
  const tbody = document.querySelector("#bag-table tbody");
  tbody.innerHTML = "";
  bagList.forEach((b, idx) => {
    tbody.innerHTML += `
      <tr>
        <td class="border px-2">${b.rpro}</td>
        <td class="border px-2">${b.boxNo}</td>
        <td class="border px-2">${b.bagNo}</td>
        <td class="border px-2">${b.photoStatus}
          <button class="ml-2 text-blue-600 underline" onclick="captureForBag(${idx})">📷</button>
        </td>
      </tr>`;
  });
  document.getElementById("bag-table").classList.remove("hidden");
}

// === Bổ sung ảnh cho từng bịch ===
window.captureForBag = function(index) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    bagList[index].photoBlob = file;
    bagList[index].photoStatus = "✅ Đã chụp ảnh";

    renderBagTable();
  };
  input.click();
};

// === Chụp ảnh cho bịch cuối ===
btnCapture.addEventListener("click", () => {
  if (bagList.length === 0) {
    alert("❌ Chưa có bịch nào để chụp ảnh!");
    return;
  }

  btnCapture.disabled = true;
  btnCapture.classList.add("opacity-50");
  btnCapture.textContent = "⏳ Đang chọn ảnh...";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    let lastBag = bagList[bagList.length - 1];
    lastBag.photoBlob = file;
    lastBag.photoStatus = "✅ Đã chụp ảnh";

    renderBagTable();

    btnCapture.disabled = false;
    btnCapture.classList.remove("opacity-50");
    btnCapture.textContent = "Chụp ảnh bịch";
  };
  input.click();
});

// === Lưu Supabase ===
btnSave.addEventListener("click", async () => {
  if (!currentBox) {
    alert("❌ Chưa scan thùng!");
    return;
  }

  // Lấy lại số bịch bù từ input
  const bagTarget = parseInt(document.getElementById("input-bag-count").value) || 0;

  // Kiểm tra số bịch đã scan
  if (bagList.length < bagTarget) {
    alert(`❌ Chưa đủ số bịch bù yêu cầu (${bagList.length}/${bagTarget})!`);
    return;
  }

  // Kiểm tra ảnh đã chụp
  const notCaptured = bagList.filter(b => !b.photoBlob);
  if (notCaptured.length > 0) {
    alert(`❌ Còn ${notCaptured.length} bịch chưa chụp ảnh!`);
    return;
  }

  // --- Nếu qua được 2 điều kiện trên thì mới cho phép lưu ---
  btnSave.disabled = true;
  btnSave.classList.add("opacity-50");
  btnSave.textContent = "⏳ Đang lưu...";
  status.classList.remove("hidden");
  status.textContent = "🔄 Đang lưu dữ liệu lên Supabase...";


  try {
    for (const b of bagList) {
      let photoUrl = null;
      if (b.photoBlob) {
        const path = `${b.rpro}/${b.boxNo}_${b.bagNo}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase
          .storage.from("supplement-temp")
          .upload(path, b.photoBlob, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase
          .storage.from("supplement-temp")
          .getPublicUrl(path);
        photoUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("supplement_scans").insert([{
        rpro: b.rpro,
        box_no: b.boxNo,
        brand_code: currentBox["Brand Code"],
        customer: currentBox["CUSTOMERS"],
        molded: currentBox["#MOLDED"],
        bom: currentBox["BOM"],
        total_qty: currentBox["Total Qty"],
        pu: currentBox["PU"],
        fb: currentBox["FB"],
        bag_no: b.bagNo,
        photo_url: photoUrl
      }]);
      if (insertError) throw insertError;
    }

    status.textContent = "✅ Đã lưu tất cả bịch vào Supabase!";
  } catch (err) {
    console.error(err);
    status.textContent = "❌ Lỗi khi lưu: " + err.message;
  } finally {
    btnSave.disabled = false;
    btnSave.classList.remove("opacity-50");
    btnSave.textContent = "Lưu Supabase";
  }
});
