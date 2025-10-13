// Dùng bản cho browser
import { supabase } from "./supabaseClient.js";

let currentBox = null;
let bagList = []; // Danh sách các bịch/ảnh mock đã chụp
let scanMode = "box"; 
let qrScanner = null;
let allowScan = true; 

// === ĐỊNH NGHĨA HÀM AN TOÀN TRONG PHẠM VI GLOBAL ===
const safeIsScanning = () => typeof qrScanner?.isScanning === 'function' ? qrScanner.isScanning() : false;


// ========== Helpers về target, UI ==========

function getBagTarget() {
  const v = parseInt(document.getElementById("input-bag-count").value, 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function updateSaveButton() {
  const btnSave = document.getElementById("btn-save");

  // Chỉ kích hoạt nút Lưu khi: đã scan thùng VÀ có ít nhất 1 ảnh đã chụp
  if (currentBox && bagList.length > 0) {
    btnSave.classList.remove("hidden");
  } else {
    btnSave.classList.add("hidden");
  }

  // Luôn cho phép Lưu nếu có ảnh
  btnSave.disabled = false;
  btnSave.textContent = `Lưu ${bagList.length} ảnh lên Supabase`;
}

function updateAllowScan() {
  if (!qrScanner) return; 
  
  // Chỉ cho phép quét QR thùng khi chưa có currentBox
  allowScan = !currentBox;
  if (!allowScan) {
     if (safeIsScanning()) {
        qrScanner.stop().catch(e => console.error("Error stopping scanner:", e));
     }
  } else {
     if (!safeIsScanning()) {
         startScanner();
     }
  }
}

function setStatus(msg) {
  const status = document.getElementById("scan-status");
  if (!status) return;

  let cleanMsg = (msg || "").toString();
  cleanMsg = cleanMsg.replace("qrScanner.isScanning is not a function", "Lỗi khởi động camera, vui lòng tải lại trang.").replace("Cannot clear while scan is ongoing, close it first.", "KHÔNG CÓ LỖI.");
  
  status.classList.remove("hidden");
  status.textContent = cleanMsg;
}

function showPhotoSection() {
  if (currentBox) {
    // Nếu đã quét thùng, luôn hiển thị khu vực chụp ảnh
    document.getElementById("photo-section").classList.remove("hidden");
    // Đặt về trạng thái nút "Chụp ảnh" cho ảnh mới
    document.getElementById("btn-take-photo").classList.remove("hidden");
    document.getElementById("btn-retake").classList.add("hidden");
    document.getElementById("photo-canvas").classList.add("hidden");
    
    setStatus(`📸 Sẵn sàng chụp ảnh mới. Đã có ${bagList.length} ảnh.`);
  } else {
     document.getElementById("photo-section").classList.add("hidden");
  }
}

// Tạo đối tượng bịch mock
function createMockBag(index) {
    const boxNo = currentBox?.boxNo || "UNKNOWN";
    return {
        rpro: currentBox?.rpro || "UNKNOWN",
        boxNo: boxNo,
        bagNo: `IMG_${index}`, // Tên bịch/ảnh mock
        photoBlob: null,
        photoStatus: "❌ Chưa chụp"
    };
}

// ========== LOGIC TRUY VẤN MỚI ==========

async function queryImagesByRpro() {
    const queryRproEl = document.getElementById('queryRpro');
    const resultEl = document.getElementById('query-result');
    const rpro = queryRproEl.value.trim().toUpperCase();

    if (!rpro) {
        resultEl.innerHTML = '<span class="text-red-500">Vui lòng nhập RPRO.</span>';
        return;
    }

    resultEl.innerHTML = '🔄 Đang tìm kiếm...';

    try {
        const { data, error } = await supabase
            .from('supplement_scans')
            .select('*')
            .eq('rpro', rpro)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data.length === 0) {
            resultEl.innerHTML = `<span class="text-gray-500">❌ Không tìm thấy ảnh nào cho RPRO ${rpro}.</span>`;
            return;
        }

        let html = `<p class="font-semibold text-green-600">✅ Tìm thấy ${data.length} ảnh:</p><div class="flex flex-wrap gap-2 mt-2">`;
        
        data.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString('vi-VN');
            const time = new Date(item.created_at).toLocaleTimeString('vi-VN');
            
            html += `
                <div class="text-center p-1 border rounded bg-white">
                    <img src="${item.photo_url}" 
                         class="w-20 h-20 object-cover cursor-pointer" 
                         onclick="window.open('${item.photo_url}', '_blank')"/>
                    <p class="text-xs text-gray-700 mt-1">${item.bag_no}</p>
                    <p class="text-xs text-gray-500">${date} ${time}</p>
                </div>
            `;
        });

        html += '</div>';
        resultEl.innerHTML = html;

    } catch (err) {
        console.error("Lỗi truy vấn Supabase:", err);
        resultEl.innerHTML = `<span class="text-red-500">❌ Lỗi truy vấn: ${err.message}</span>`;
    }
}


// ========== Khởi tạo ==========

window.addEventListener("DOMContentLoaded", () => {
  // Ẩn nút chuyển chế độ 
  const btnBox = document.getElementById("btn-scan-box");
  const btnBag = document.getElementById("btn-scan-bag");
  if(btnBox) btnBox.classList.add("hidden");
  if(btnBag) btnBag.classList.add("hidden");

  // GÁN SỰ KIỆN CHO NÚT TRUY VẤN MỚI
  document.getElementById("btn-query-rpro")
      ?.addEventListener("click", queryImagesByRpro);


  document.getElementById("btn-save").onclick = saveToSupabase;

  document.getElementById("btn-take-photo").onclick = () => {
    // Chụp ảnh mới, index = bagList.length
    captureFromQrCamera(bagList.length); 
  };

  document.getElementById("btn-retake").onclick = () => {
    // Chụp lại ảnh cuối cùng (ảnh vừa chụp)
    const lastIndex = bagList.length - 1;
    if (lastIndex >= 0) {
        captureFromQrCamera(lastIndex, true); 
    }
  };

  document.getElementById("input-bag-count").addEventListener("input", () => {
    // Chỉ cập nhật trạng thái, không ảnh hưởng đến bagList
    updateSaveButton();
    const target = getBagTarget();
    if(currentBox) {
        setStatus(`📦 Đã quét thùng. Nhập số bịch bù (${target}) chỉ để tham khảo.`);
    }
  });

  qrScanner = new Html5Qrcode("qr-reader");
  startScanner();
  setStatus("📦 Vui lòng quét thùng.");
});

function startScanner() {
  if (!qrScanner) return;
  
  // KHÔNG kiểm tra isScanning() tại đây. Việc này do updateAllowScan() đảm nhiệm.

  qrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 200, height: 200 } },
    (qrText) => {
      if (allowScan) handleBoxQR(qrText);
    }
  ).catch(err => console.error("Scan init error:", err));
}


// ========== BOX (Sau khi quét thùng) ==========
async function handleBoxQR(qr) {
  allowScan = false; 
  setStatus("🔄 Đang xử lý QR thùng...");

  const parts = qr.split("|");
  const rpro = parts[1]?.trim();
  const boxNo = parts[2] ? parts[2].split("/")[0].trim() : null;

  try {
    const res = await fetch("/powerapp.json");
    const { data } = await res.json();
    const rec = data.find(r => r["PRO ODER"] === rpro);

    if (!rec) {
      setStatus("❌ Không tìm thấy đơn " + rpro);
      allowScan = true; 
      return;
    }

    currentBox = { rpro, boxNo, ...rec };
    bagList = []; // Reset list ảnh cũ
    setStatus("✅ Đã quét thùng: " + rpro + ". Bấm 'Chụp ảnh bịch' để bắt đầu.");

    // DỪNG SCANNER VĨNH VIỄN SAU KHI QUÉT THÙNG
    if (qrScanner && safeIsScanning()) {
        qrScanner.stop().catch(e => console.error("Error stopping scanner after successful box scan:", e));
    }
    
    // 👉 Hiển thị đầy đủ thông tin
    document.getElementById("box-info").innerHTML = `
      <p><b>RPRO:</b> ${rpro}</p>
      <p><b>Thùng:</b> ${boxNo}</p>
      <p><b>Customer:</b> ${rec["CUSTOMERS"] || "-"}</p>
      <p><b>Brand:</b> ${rec["Brand Code"] || "-"}</p>
      <p><b>#MOLDED:</b> ${rec["#MOLDED"] || "-"}</p>
      <p><b>Total Qty:</b> ${rec["Total Qty"] || "-"}</p>
      <p><b>BOM:</b> ${rec["BOM"] || "-"}</p>
      <p><b>PU:</b> ${rec["PU"] || "-"}</p>
      <p><b>FB:</b> ${rec["FB"] || "-"}</p>
    `;
    document.getElementById("box-info").classList.remove("hidden");

    renderBagTable();
    updateSaveButton();
    showPhotoSection(); 

  } catch (e) {
    console.error(e);
    setStatus("❌ Lỗi đọc dữ liệu đơn!");
  } finally {
    updateAllowScan(); 
  }
}


// ========== Capture từ camera QR ==========

function captureFromQrCamera(bagIndex, isRetake = false) {
  
  const qrVideo = document.querySelector("#qr-reader video");
  const canvas  = document.getElementById("photo-canvas");
  const ctx     = canvas.getContext("2d");
  const isNew = bagIndex === bagList.length && !isRetake;

  if (isNew) {
      bagList.push(createMockBag(bagIndex + 1));
  }
  
  const bagToUpdate = bagList[bagIndex];

  const targetWidth = 1280;
  const scale = targetWidth / qrVideo.videoWidth;
  canvas.width  = targetWidth;
  canvas.height = qrVideo.videoHeight * scale;

  ctx.drawImage(qrVideo, 0, 0, canvas.width, canvas.height);

  const btnTake = document.getElementById("btn-take-photo");
  const btnRetake = document.getElementById("btn-retake");
  const canvasEl = document.getElementById("photo-canvas");

  // HIỂN THỊ PREVIEW & NÚT CHỤP LẠI
  canvasEl.classList.remove("hidden");
  btnTake.classList.add("hidden");
  btnRetake.classList.remove("hidden"); 

  canvas.toBlob(blob => {
    bagToUpdate.photoBlob   = blob;
    bagToUpdate.photoStatus = `✅ Đã chụp (${Math.round(blob.size/1024)} KB)`;
    renderBagTable();

    const capturedCount = bagList.length;
    
    if (confirm(`✅ Đã ${isRetake ? 'chụp lại' : 'chụp'} Ảnh ${bagIndex + 1}/${capturedCount}. Bạn có muốn chụp ảnh tiếp theo?`)) {
        // RESET ĐỂ HIỆN LẠI NÚT CHỤP MỚI
        btnRetake.classList.add("hidden");
        btnTake.classList.remove("hidden"); 
        canvasEl.classList.add("hidden"); // Ẩn preview
        setStatus(`📸 Sẵn sàng chụp Ảnh ${capturedCount + 1}.`);
    } else {
         setStatus(`📸 Đã chụp ${capturedCount} ảnh. Bấm 'Chụp ảnh bịch' để chụp tiếp.`);
    }

    updateSaveButton();
  }, "image/jpeg", 0.8);
}


function renderBagTable() {
  const tbody = document.querySelector("#bag-table tbody");
  const thead = document.querySelector("#bag-table thead tr");

  // Đảm bảo tiêu đề có 6 cột
  if(thead && thead.children.length !== 6) {
      thead.innerHTML = `
          <th class="border px-2">RPRO</th>
          <th class="border px-2">Thùng</th>
          <th class="border px-2">Ảnh</th>
          <th class="border px-2">Trạng thái</th>
          <th class="border px-2">Preview</th> 
          <th class="border px-2">Thao tác</th>
      `;
  }
  
  tbody.innerHTML = ""; 

  bagList.forEach((b, i) => {
    const isCaptured = !!b.photoBlob;
    const saveMark = isCaptured ? "✅" : "❌";
    
    const previewUrl = isCaptured ? URL.createObjectURL(b.photoBlob) : '';
    
    // SỬA LỖI MOBILE: MỞ URL BẰNG HÀM TRỰC TIẾP
    const previewHtml = isCaptured 
        ? `<img src="${previewUrl}" 
                class="w-10 h-10 object-cover cursor-pointer" 
                onclick="window.location.href='${previewUrl}'"/>` 
        : '';


    tbody.innerHTML += `<tr>
      <td class="border px-2">${b.rpro}</td>
      <td class="border px-2">${b.boxNo}</td>
      <td class="border px-2">Ảnh ${i + 1}</td>
      <td class="border px-2">${saveMark} ${b.photoStatus}</td>
      <td class="border px-2 text-center">${previewHtml}</td>
      <td class="border px-2 text-center">
        <button class="bg-red-500 text-white px-2 py-1 rounded text-xs" onclick="deleteBag(${i})">🗑️ Xóa</button>
      </td>
    </tr>`;
  });

  document.getElementById("bag-table")?.classList[bagList.length > 0 ? 'remove' : 'add']("hidden");
}

window.deleteBag = function(index) {
  if (index < 0 || index >= bagList.length) return;

  const removed = bagList.splice(index, 1)[0];
  
  if (removed.photoBlob) {
      URL.revokeObjectURL(URL.createObjectURL(removed.photoBlob));
  }
  
  bagList.forEach((b, i) => {
      b.bagNo = `IMG_${i + 1}`;
  });

  renderBagTable();
  updateSaveButton();
  setStatus(`🗑️ Đã xóa Ảnh ${index + 1}. Tổng còn ${bagList.length} ảnh.`);
};

window.showFullImage = function(url) {
    window.open(url, '_blank');
}

// ========== Lưu ==========

async function saveToSupabase() {
  if (!currentBox) return alert("❌ Chưa scan thùng!");
  if (bagList.length === 0) return alert("❌ Chưa chụp ảnh nào để lưu!");

  const bagsToSave = bagList;
  
  const btnSave = document.getElementById("btn-save");
  btnSave.disabled = true;
  btnSave.textContent = "⏳ Đang lưu...";
  setStatus("🔄 Đang lưu lên Supabase...");

  try {
    for (const b of bagsToSave) {
      const bagIndex = bagsToSave.indexOf(b) + 1;
      const path = `${b.rpro}/${b.boxNo}_Img${bagIndex}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase
        .storage.from("supplement-temp")
        .upload(path, b.photoBlob, { upsert: true });
      if (uploadError) throw new Error(`Lỗi upload ảnh ${bagIndex}: ${uploadError.message}`);

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
        bag_no: `IMG_${bagIndex}`, 
        photo_url: publicUrlData.publicUrl,
      }]);
      if (insertError) throw new Error(`Lỗi insert record ảnh ${bagIndex}: ${insertError.message}`);
    }

    setStatus("✅ Đã lưu thành công! Tiếp tục scan tem thùng khác!");

    currentBox = null;
    bagList.forEach(b => { 
        if(b.photoBlob) URL.revokeObjectURL(URL.createObjectURL(b.photoBlob));
    });
    bagList = [];
    
    document.getElementById("input-bag-count").value = "";
    document.getElementById("box-info").classList.add("hidden");
    document.getElementById("bag-table").classList.add("hidden");
    document.querySelector("#bag-table tbody").innerHTML = "";
    document.getElementById("btn-save").classList.add("hidden");
    document.getElementById("photo-section").classList.add("hidden");
    updateSaveButton();
    updateAllowScan(); 
    

  } catch (err) {
    console.error("LỖI LƯU TỔNG HỢP:", err);
    const errorMsg = err?.message || err || "Lỗi không xác định."; 
    setStatus("❌ Lỗi khi lưu: " + errorMsg);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = "Lưu Supabase";
  }
}