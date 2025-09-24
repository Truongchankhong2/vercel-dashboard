// Dùng bản cho browser
import { supabase } from "./supabaseClient.js";

let currentBox = null;
let bagList = [];
let scanMode = "box"; // "box" | "bag"
let qrScanner = null;

window.addEventListener("DOMContentLoaded", () => {
  const btnScanBox = document.getElementById("btn-scan-box");
  const btnScanBag = document.getElementById("btn-scan-bag");
  const btnSave    = document.getElementById("btn-save");
  const btnTakePhoto = document.getElementById("btn-take-photo");

  btnScanBox.addEventListener("click", () => {
    scanMode = "box";
    bagList = [];
    renderBagTable();
    setStatus("📦 Chế độ quét thùng");
  });

  btnScanBag.addEventListener("click", () => {
    if (!currentBox) return alert("❌ Chưa scan thùng!");
    const bagTarget = parseInt(document.getElementById("input-bag-count").value);
    if (!bagTarget) return alert("❌ Vui lòng nhập số bịch bù!");
    scanMode = "bag";
    setStatus("🛍️ Chế độ quét bịch");
  });

  btnSave.addEventListener("click", saveToSupabase);

  qrScanner = new Html5Qrcode("qr-reader");
  startScanner();

  // gán sự kiện nút chụp
  btnTakePhoto.addEventListener("click", () => {
    if (bagList.length === 0) return;
    captureFromQrCamera(bagList.length - 1);
  });
});

function setStatus(msg) {
  const status = document.getElementById("scan-status");
  status.classList.remove("hidden");
  status.textContent = msg;
}

// ===== Scanner =====
function startScanner() {
  qrScanner
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 200, height: 200 } },
      (qrText) => {
        if (scanMode === "box") handleBoxQR(qrText);
        else handleBagQR(qrText);
      }
    )
    .catch((err) => console.error("Scan init error:", err));
}

// ===== Handle Box =====
async function handleBoxQR(qr) {
  setStatus("🔄 Đang xử lý QR thùng...");
  const parts = qr.split("|");
  const rpro = parts[1]?.trim();
  const boxNo = parts[2] ? parts[2].split("/")[0].trim() : null;

  try {
    const res = await fetch("/powerapp.json");
    const { data } = await res.json();
    const rec = data.find((r) => r["PRO ODER"] === rpro);
    if (!rec) {
      setStatus("❌ Không tìm thấy đơn cho " + rpro);
      return;
    }

    currentBox = { rpro, boxNo, ...rec };
    setStatus("✅ Đã quét thùng: " + rpro);

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
  } catch (e) {
    console.error(e);
    setStatus("❌ Lỗi đọc dữ liệu đơn!");
  }
}

// ===== Handle Bag =====
function handleBagQR(qr) {
  const bagTarget = parseInt(document.getElementById("input-bag-count").value);
  if (bagList.length >= bagTarget) {
    setStatus("⚠️ Đã đủ số bịch bù yêu cầu!");
    return;
  }

  const parts = qr.split("|");
  const rpro  = parts[0]?.trim();
  const boxNo = parts[1]?.trim();
  const bagNo = parts[3]?.trim();

  if (!currentBox || rpro !== currentBox.rpro || boxNo !== currentBox.boxNo) {
    setStatus("❌ Sai QR bịch (không khớp RPRO/Thùng)");
    return;
  }

  if (bagList.some(b => b.rpro === rpro && b.boxNo === boxNo && b.bagNo === bagNo)) {
    setStatus(`⚠️ Bịch ${bagNo} đã được quét trước đó!`);
    return;
  }

  bagList.push({ rpro, boxNo, bagNo, photoBlob: null, photoStatus: "❌ Chưa chụp" });
  renderBagTable();
  setStatus(`✅ Đã thêm bịch ${bagNo} (${bagList.length}/${bagTarget})`);

  // hiện khu chụp ảnh
  document.getElementById("photo-section").classList.remove("hidden");
}

// ===== Capture frame từ camera QR =====
function captureFromQrCamera(bagIndex) {
  const qrVideo = document.querySelector("#qr-reader video");
  const photoCanvas = document.getElementById("photo-canvas");
  const ctx = photoCanvas.getContext("2d");

  photoCanvas.width  = qrVideo.videoWidth;
  photoCanvas.height = qrVideo.videoHeight;
  ctx.drawImage(qrVideo, 0, 0, photoCanvas.width, photoCanvas.height);

  photoCanvas.toBlob(blob => {
    bagList[bagIndex].photoBlob = blob;
    bagList[bagIndex].photoStatus = "✅ Đã chụp ảnh";
    renderBagTable();

    // Nếu đủ số bịch → hiện nút Lưu
    const bagTarget = parseInt(document.getElementById("input-bag-count").value);
    if (bagList.length >= bagTarget) {
      setStatus(`🎉 Hoàn tất ${bagList.length}/${bagTarget} bịch`);
      document.getElementById("btn-save").classList.remove("hidden");
    }
  }, "image/jpeg");
}

// ===== Render bảng =====
function renderBagTable() {
  const tbody = document.querySelector("#bag-table tbody");
  tbody.innerHTML = "";
  bagList.forEach(b => {
    tbody.innerHTML += `
      <tr>
        <td class="border px-2">${b.rpro}</td>
        <td class="border px-2">${b.boxNo}</td>
        <td class="border px-2">${b.bagNo}</td>
        <td class="border px-2">${b.photoStatus}</td>
      </tr>`;
  });
  document.getElementById("bag-table").classList.remove("hidden");
}

// ===== Save =====
async function saveToSupabase() {
  if (!currentBox) return alert("❌ Chưa scan thùng!");

  const bagTarget = parseInt(document.getElementById("input-bag-count").value) || 0;
  if (bagList.length < bagTarget)
    return alert(`❌ Chưa đủ số bịch bù (${bagList.length}/${bagTarget})!`);

  const notCaptured = bagList.filter(b => !b.photoBlob);
  if (notCaptured.length) return alert(`❌ Còn ${notCaptured.length} bịch chưa chụp ảnh!`);

  const btnSave = document.getElementById("btn-save");
  btnSave.disabled = true;
  btnSave.textContent = "⏳ Đang lưu...";
  setStatus("🔄 Đang lưu lên Supabase...");

  try {
    for (const b of bagList) {
      const path = `${b.rpro}/${b.boxNo}_${b.bagNo}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase
        .storage.from("supplement-temp")
        .upload(path, b.photoBlob, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase
        .storage.from("supplement-temp")
        .getPublicUrl(path);

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
        photo_url: publicUrlData.publicUrl,
      }]);
      if (insertError) throw insertError;
    }
    setStatus("✅ Đã lưu tất cả bịch vào Supabase!");
  } catch (err) {
    console.error(err);
    setStatus("❌ Lỗi khi lưu: " + err.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = "Lưu Supabase";
  }
}
