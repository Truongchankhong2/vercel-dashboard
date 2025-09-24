// Dùng bản cho browser
import { supabase } from "./supabaseClient.js";

let currentBox = null;
let bagList = [];
let scanMode = "box";
let qrScanner = null;
let allowScan = true; // 🔑 cờ để dừng quét khi chờ chụp

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-scan-box").onclick = () => {
    scanMode = "box"; bagList = [];
    renderBagTable();
    setStatus("📦 Chế độ quét thùng");
  };
  document.getElementById("btn-scan-bag").onclick = () => {
    if (!currentBox) return alert("❌ Chưa scan thùng!");
    const bagTarget = parseInt(document.getElementById("input-bag-count").value);
    if (!bagTarget) return alert("❌ Nhập số bịch bù!");
    scanMode = "bag"; setStatus("🛍️ Chế độ quét bịch");
  };
  document.getElementById("btn-save").onclick = saveToSupabase;

  document.getElementById("btn-take-photo").onclick = () => {
    if (bagList.length === 0) return;
    captureFromQrCamera(bagList.length - 1);
    allowScan = true; // ✅ cho phép quét tiếp
  };

  qrScanner = new Html5Qrcode("qr-reader");
  startScanner();
});

function setStatus(msg) {
  const status = document.getElementById("scan-status");
  status.classList.remove("hidden");
  status.textContent = msg;
}

function startScanner() {
  qrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 200, height: 200 } },
    (qrText) => {
      if (!allowScan) return; // ❌ đang chờ chụp thì bỏ qua
      if (scanMode === "box") handleBoxQR(qrText);
      else handleBagQR(qrText);
    }
  ).catch(err => console.error("Scan init error:", err));
}

// ===== BOX =====
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
  document.getElementById("box-info").innerHTML = `<p><b>RPRO:</b> ${rpro}</p><p><b>Thùng:</b> ${boxNo}</p>`;
  document.getElementById("box-info").classList.remove("hidden");

  allowScan = true;
}

// ===== BAG =====
function handleBagQR(qr) {
  const bagTarget = parseInt(document.getElementById("input-bag-count").value);
  if (bagList.length >= bagTarget) { setStatus("⚠️ Đủ số bịch"); return; }

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
  setStatus(`✅ Thêm bịch ${bagNo} (${bagList.length}/${bagTarget})`);

  // 🔑 dừng quét, chờ bạn bấm chụp
  allowScan = false;
  document.getElementById("photo-section").classList.remove("hidden");
}

// ===== Capture ảnh từ camera QR =====
function captureFromQrCamera(bagIndex) {
  const qrVideo = document.querySelector("#qr-reader video");
  const canvas  = document.getElementById("photo-canvas");
  const ctx     = canvas.getContext("2d");

  canvas.width = qrVideo.videoWidth;
  canvas.height= qrVideo.videoHeight;
  ctx.drawImage(qrVideo, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    bagList[bagIndex].photoBlob = blob;
    bagList[bagIndex].photoStatus = "✅ Đã chụp";
    renderBagTable();
    document.getElementById("photo-section").classList.add("hidden");

    const bagTarget = parseInt(document.getElementById("input-bag-count").value);
    if (bagList.length >= bagTarget) {
      setStatus("🎉 Hoàn tất đủ bịch");
      document.getElementById("btn-save").classList.remove("hidden");
    } else {
      setStatus("📷 Đã chụp, quét tiếp bịch mới...");
    }
  },"image/jpeg");
}

// ===== Table render =====
function renderBagTable() {
  const tbody = document.querySelector("#bag-table tbody");
  tbody.innerHTML = "";
  bagList.forEach(b=>{
    tbody.innerHTML += `<tr>
      <td class="border px-2">${b.rpro}</td>
      <td class="border px-2">${b.boxNo}</td>
      <td class="border px-2">${b.bagNo}</td>
      <td class="border px-2">${b.photoStatus}</td></tr>`;
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
