// Dùng bản cho browser
import { supabase } from "./supabaseClient.js";

let currentBox = null;
let bagList = [];
let scanMode = "box";
let qrScanner = null;
let allowScan = true; // cờ dừng/cho phép quét

// ========== Helpers về target, UI ==========

function getBagTarget() {
  const v = parseInt(document.getElementById("input-bag-count").value, 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function updateSaveButton() {
  const target = getBagTarget();
  const btnSave = document.getElementById("btn-save");

  if (target > 0 && bagList.length >= target) {
    btnSave.classList.remove("hidden");
  } else {
    btnSave.classList.add("hidden");
  }

  const need = bagList.slice(0, Math.min(target, bagList.length));
  const missing = need.filter(b => !b.photoBlob).length;

  btnSave.disabled = missing > 0;
  btnSave.textContent = missing > 0
    ? `Chụp đủ ảnh (${need.length - missing}/${need.length})`
    : "Lưu Supabase";
}

function updateAllowScan() {
  const target = getBagTarget();
  allowScan = scanMode === "bag" ? (target === 0 || bagList.length < target) : true;
}

function setStatus(msg) {
  const status = document.getElementById("scan-status");
  status.classList.remove("hidden");
  status.textContent = msg;
}

// ========== Khởi tạo ==========

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-scan-box").onclick = () => {
    scanMode = "box";
    bagList = [];
    renderBagTable();
    setStatus("📦 Chế độ quét thùng");
    updateSaveButton();
    updateAllowScan();
  };

  document.getElementById("btn-scan-bag").onclick = () => {
    if (!currentBox) return alert("❌ Chưa scan thùng!");
    if (!getBagTarget()) return alert("❌ Nhập số bịch bù!");
    scanMode = "bag";
    setStatus("🛍️ Chế độ quét bịch");
    updateAllowScan();
  };

  document.getElementById("btn-save").onclick = saveToSupabase;

  document.getElementById("btn-take-photo").onclick = () => {
    if (bagList.length === 0) return;
    captureFromQrCamera(bagList.length - 1);
  };

  document.getElementById("btn-retake").onclick = () => {
    const canvas = document.getElementById("photo-canvas");
    canvas.classList.add("hidden");
    document.getElementById("btn-take-photo").classList.remove("hidden");
    document.getElementById("btn-retake").classList.add("hidden");
  };

  document.getElementById("input-bag-count").addEventListener("input", () => {
    const target = getBagTarget();
    updateSaveButton();
    updateAllowScan();

    if (target > 0 && bagList.length >= target) {
      setStatus(`🎉 Hoàn tất ${Math.min(bagList.length, target)}/${target} bịch`);
    } else if (scanMode === "bag") {
      setStatus(`🛍️ Đã quét ${bagList.length}/${target || 0} bịch`);
    }
  });

  qrScanner = new Html5Qrcode("qr-reader");
  startScanner();
});

function startScanner() {
  qrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 200, height: 200 } },
    (qrText) => {
      if (!allowScan) return;
      if (scanMode === "box") handleBoxQR(qrText);
      else handleBagQR(qrText);
    }
  ).catch(err => console.error("Scan init error:", err));
}

// ========== BOX ==========

async function handleBoxQR(qr) {
  allowScan = false;
  setStatus("🔄 Đang xử lý QR thùng...");

  const parts = qr.split("|");
  const rpro = parts[1]?.trim();
  const boxNo = parts[2] ? parts[2].split("/")[0].trim() : null;

  const res = await fetch("/powerapp.json");
  const { data } = await res.json();
  const rec = data.find(r => r["PRO ODER"] === rpro);
  if (!rec) {
    setStatus("❌ Không tìm thấy đơn " + rpro);
    allowScan = true;
    return;
  }

  currentBox = { rpro, boxNo, ...rec };
  setStatus("✅ Đã quét thùng: " + rpro);
  document.getElementById("box-info").innerHTML =
    `<p><b>RPRO:</b> ${rpro}</p><p><b>Thùng:</b> ${boxNo}</p>`;
  document.getElementById("box-info").classList.remove("hidden");

  updateSaveButton();
  updateAllowScan();
  allowScan = true;
}

// ========== BAG ==========

function handleBagQR(qr) {
  const target = getBagTarget();

  if (target > 0 && bagList.length >= target) {
    updateSaveButton();
    updateAllowScan();
    setStatus(`⚠️ Đủ số bịch (${bagList.length}/${target}). Tăng target nếu cần quét thêm.`);
    return;
  }

  const parts = qr.split("|");
  const rpro = parts[0]?.trim();
  const boxNo = parts[1]?.trim();
  const bagNo = parts[3]?.trim();

  if (!currentBox || rpro !== currentBox.rpro || boxNo !== currentBox.boxNo) {
    setStatus("❌ Sai QR bịch"); return;
  }
  if (bagList.some(b => b.rpro===rpro && b.boxNo===boxNo && b.bagNo===bagNo)) {
    setStatus(`⚠️ Bịch ${bagNo} đã quét`); return;
  }

  bagList.push({ rpro, boxNo, bagNo, photoBlob:null, photoStatus:"❌ Chưa chụp" });
  renderBagTable();

  const after = bagList.length;
  if (target > 0) {
    setStatus(`✅ Thêm bịch ${bagNo} (${after}/${target})`);
  } else {
    setStatus(`✅ Thêm bịch ${bagNo} (${after})`);
  }

  allowScan = false;
  const photoSection = document.getElementById("photo-section");
  const btnTake = document.getElementById("btn-take-photo");
  const btnRetake = document.getElementById("btn-retake");

  photoSection.classList.remove("hidden");
  btnTake.classList.remove("hidden");
  btnRetake.classList.add("hidden");

  updateSaveButton();
  updateAllowScan();
}

// ========== Capture từ camera QR ==========

function captureFromQrCamera(bagIndex) {
  const qrVideo = document.querySelector("#qr-reader video");
  const canvas  = document.getElementById("photo-canvas");
  const ctx     = canvas.getContext("2d");

  const targetWidth = 1280;
  const scale = targetWidth / qrVideo.videoWidth;
  canvas.width  = targetWidth;
  canvas.height = qrVideo.videoHeight * scale;

  ctx.drawImage(qrVideo, 0, 0, canvas.width, canvas.height);

  // Hiện preview & giữ lại
  const btnTake = document.getElementById("btn-take-photo");
  const btnRetake = document.getElementById("btn-retake");
  canvas.classList.remove("hidden");
  btnTake.classList.add("hidden");
  btnRetake.classList.remove("hidden");

  canvas.toBlob(blob => {
    bagList[bagIndex].photoBlob   = blob;
    bagList[bagIndex].photoStatus = `✅ Đã chụp (${Math.round(blob.size/1024)} KB)`;
    renderBagTable();

    const target = getBagTarget();
    if (target > 0 && bagList.length >= target) {
      setStatus(`🎉 Hoàn tất ${Math.min(bagList.length, target)}/${target} bịch`);
    } else {
      setStatus(`📷 Đã chụp bịch ${bagIndex + 1}, quét tiếp bịch mới...`);
    }

    updateAllowScan();
    updateSaveButton();
  }, "image/jpeg", 0.8);
}

// ========== Bảng ==========

function renderBagTable() {
  const tbody = document.querySelector("#bag-table tbody");
  tbody.innerHTML = "";
  const target = getBagTarget();

  bagList.forEach((b, i) => {
    const willSave = target === 0 ? false : i < target;
    const saveMark = willSave ? "✅" : "⛔";

    tbody.innerHTML += `<tr>
      <td class="border px-2">${b.rpro}</td>
      <td class="border px-2">${b.boxNo}</td>
      <td class="border px-2">${b.bagNo} ${willSave ? "" : "<span class='text-xs text-gray-500'>(bỏ qua)</span>"}</td>
      <td class="border px-2">${saveMark} ${b.photoStatus}</td>
      <td class="border px-2 text-center">
        <button class="bg-red-500 text-white px-2 py-1 rounded text-xs" onclick="deleteBag(${i})">🗑️ Xóa</button>
      </td>
    </tr>`;
  });

  document.getElementById("bag-table").classList.remove("hidden");
}

// ========== Xóa bịch ==========

window.deleteBag = function(index) {
  if (index < 0 || index >= bagList.length) return;

  const removed = bagList.splice(index, 1)[0];
  renderBagTable();
  updateSaveButton();
  updateAllowScan();

  setStatus(`🗑️ Đã xóa bịch ${removed.bagNo}. Tổng còn ${bagList.length}/${getBagTarget() || 0}`);
};

// ========== Lưu ==========

async function saveToSupabase() {
  if (!currentBox) return alert("❌ Chưa scan thùng!");

  const target = getBagTarget();
  if (target === 0) return alert("❌ Nhập số bịch bù!");

  if (bagList.length < target)
    return alert(`❌ Chưa đủ số bịch bù (${bagList.length}/${target})!`);

  const bagsToSave = bagList.slice(0, target);
  const notCaptured = bagsToSave.filter(b => !b.photoBlob);
  if (notCaptured.length)
    return alert(`❌ Còn ${notCaptured.length}/${bagsToSave.length} bịch chưa chụp ảnh!`);

  const btnSave = document.getElementById("btn-save");
  btnSave.disabled = true;
  btnSave.textContent = "⏳ Đang lưu...";
  setStatus("🔄 Đang lưu lên Supabase...");

  try {
    for (const b of bagsToSave) {
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

    // Reset
    currentBox = null;
    bagList = [];
    document.getElementById("input-bag-count").value = "";
    document.getElementById("box-info").classList.add("hidden");
    document.getElementById("bag-table").classList.add("hidden");
    document.querySelector("#bag-table tbody").innerHTML = "";
    document.getElementById("btn-save").classList.add("hidden");
    document.getElementById("photo-section").classList.add("hidden");
    updateSaveButton();
    updateAllowScan();
    setStatus("🔁 Sẵn sàng cho lần bù tiếp theo. Vui lòng quét thùng mới.");

  } catch (err) {
    console.error(err);
    setStatus("❌ Lỗi khi lưu: " + err.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = "Lưu Supabase";
  }
}
