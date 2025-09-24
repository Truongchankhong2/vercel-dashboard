import { supabase } from "./supabaseClient.js";


let currentBox = null;
let bagList = [];
let scanMode = "box"; // mặc định quét thùng
let localStream = null;

const status = document.getElementById("scan-status");
const btnSave = document.getElementById("btn-save");
const btnScanBox = document.getElementById("btn-scan-box");
const btnScanBag = document.getElementById("btn-scan-bag");

const qrReaderEl = document.getElementById("qr-reader");
const photoSection = document.getElementById("photo-section");
const photoVideo = document.getElementById("photo-video");
const photoCanvas = document.getElementById("photo-canvas");
const btnTakePhoto = document.getElementById("btn-take-photo");

let qrScanner = null;

window.addEventListener("load", () => {
  qrScanner = new Html5Qrcode("qr-reader");
  startScanner();
});

function startScanner() {
  qrScanner
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.3333 },
      (qrText) => {
        qrScanner.stop().catch(console.error);
        if (scanMode === "box") handleBoxQR(qrText);
        else if (scanMode === "bag") handleBagQR(qrText);
      }
    )
    .catch((err) => console.error("Scan error:", err));
}

// === Chuyển chế độ quét Thùng ===
btnScanBox.addEventListener("click", () => {
  scanMode = "box";
  bagList = []; // reset danh sách bịch
  renderBagTable();

  status.classList.remove("hidden");
  status.textContent = "📦 Chế độ quét thùng";
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
  status.classList.remove("hidden");
  status.textContent = "🛍️ Chế độ quét bịch";
});

// === Xử lý QR Thùng ===
async function handleBoxQR(qr) {
  status.textContent = "🔄 Đang xử lý QR thùng...";

  const parts = qr.split("|");
  const rpro = parts[1]?.trim();
  let boxNo = parts[2] ? parts[2].split("/")[0].trim() : null;

  const res = await fetch("/powerapp.json");
  const { data } = await res.json();
  const rec = data.find((r) => r["PRO ODER"] === rpro);

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

  // Quay lại scanner
  setTimeout(startScanner, 800);
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

  const isDuplicate = bagList.some(
    (b) => b.rpro === rpro && b.boxNo === boxNo && b.bagNo === bagNo
  );
  if (isDuplicate) {
    status.textContent = `⚠️ Bịch ${bagNo} đã được quét trước đó!`;
    return;
  }

  bagList.push({
    rpro,
    boxNo,
    bagNo,
    photoBlob: null,
    photoStatus: "❌ Chưa chụp",
  });

  renderBagTable();
  status.textContent = `✅ Đã thêm bịch ${bagNo} (${bagList.length}/${bagTarget})`;

  // 👉 Sau khi thêm bịch → chuyển sang chụp ảnh
  startPhotoMode(bagList.length - 1);
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
        <td class="border px-2">${b.photoStatus}</td>
      </tr>`;
  });
  document.getElementById("bag-table").classList.remove("hidden");
}

// === Photo Mode ===
async function startPhotoMode(bagIndex) {
  qrReaderEl.classList.add("hidden");
  photoSection.classList.remove("hidden");

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true });
    photoVideo.srcObject = localStream;

    btnTakePhoto.onclick = () => {
      capturePhoto(bagIndex);
    };
  } catch (err) {
    console.error("Camera error:", err);
    alert("Không mở được camera chụp ảnh");
  }
}

function capturePhoto(bagIndex) {
  const ctx = photoCanvas.getContext("2d");
  photoCanvas.width = photoVideo.videoWidth;
  photoCanvas.height = photoVideo.videoHeight;
  ctx.drawImage(photoVideo, 0, 0, photoCanvas.width, photoCanvas.height);

  photoCanvas.toBlob((blob) => {
    bagList[bagIndex].photoBlob = blob;
    bagList[bagIndex].photoStatus = "✅ Đã chụp ảnh";
    renderBagTable();

    // Dừng camera
    if (localStream) localStream.getTracks().forEach((t) => t.stop());

    const bagTarget = parseInt(document.getElementById("input-bag-count").value);
    if (bagList.length < bagTarget) {
      photoSection.classList.add("hidden");
      qrReaderEl.classList.remove("hidden");
      setTimeout(startScanner, 800);
    } else {
      status.textContent = `🎉 Hoàn tất ${bagList.length}/${bagTarget} bịch`;
      photoSection.classList.add("hidden");
      btnSave.classList.remove("hidden");
    }
  }, "image/jpeg");
}

// === Lưu Supabase ===
btnSave.addEventListener("click", async () => {
  if (!currentBox) {
    alert("❌ Chưa scan thùng!");
    return;
  }

  const bagTarget = parseInt(document.getElementById("input-bag-count").value) || 0;
  if (bagList.length < bagTarget) {
    alert(`❌ Chưa đủ số bịch bù yêu cầu (${bagList.length}/${bagTarget})!`);
    return;
  }

  const notCaptured = bagList.filter((b) => !b.photoBlob);
  if (notCaptured.length > 0) {
    alert(`❌ Còn ${notCaptured.length} bịch chưa chụp ảnh!`);
    return;
  }

  btnSave.disabled = true;
  btnSave.textContent = "⏳ Đang lưu...";
  status.textContent = "🔄 Đang lưu dữ liệu lên Supabase...";

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

      await supabase.from("supplement_scans").insert([
        {
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
        },
      ]);
    }

    status.textContent = "✅ Đã lưu tất cả bịch vào Supabase!";
  } catch (err) {
    console.error(err);
    status.textContent = "❌ Lỗi khi lưu: " + err.message;
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = "Lưu Supabase";
  }
});
