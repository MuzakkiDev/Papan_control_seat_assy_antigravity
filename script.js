// =========================================================================
// FITUR TRANSLATE (INDONESIA - MANDARIN)
// =========================================================================
const dict = {
  id: {
    nav_ops: "Operasional",
    nav_board: "Papan Kontrol",
    nav_scan: "Smart Scanner",
    nav_hist: "Riwayat Transaksi",
    nav_master: "Master Data",
    nav_item: "Master Barang",
    nav_cust: "Master Customer",
    nav_user: "Kelola Pengguna",
    btn_login: "Masuk Sistem",
    hdr_overview: "Overview",
    title_board: "Papan Kontrol Seat Assy",
    desc_board: "Monitoring Live Stok & Delivery (Rollover 08:00)",
    lbl_tot_row: "Total Baris:",
    search_part: "Cari Part Number...",
    search_cust: "Cari customer...",
    search_user: "Cari akun...",
    th_cust: "CUSTOMER",
    th_rak: "NO RELL",
    th_part: "PART NUMBER",
    th_stock: "STOCK",
    th_del: "DELIVERY",
    th_target: "QTY/DAY",
    th_out: "QTY OUT",
    th_sisa: "SISA DEL",
    th_assy: "ASSY IN<br>STORE FSG",
    btn_cam_on: "Aktifkan Kamera",
    btn_cam_off: "Matikan Kamera",
    lbl_gun: "Mode Gun Scanner (Batch Troli)",
    input_gun: "Klik & Scan barcode...",
    title_trolley: "Daftar Troli",
    lbl_dest: "Tujuan Pengiriman Massal",
    btn_assy: "Tambah ke Assy",
    opt_all: "Semua Aktivitas",
    btn_export: "Ekspor",
    th_time: "Waktu",
    th_type: "Tipe",
    th_diff: "Selisih",
    th_pic: "Petugas",
    th_note: "Catatan",
    th_item_name: "Nama Barang",
    th_main_stock: "Stok Utama",
    th_action: "Aksi",
    btn_new_item: "Part Baru",
    btn_new_cust: "Customer Baru",
    btn_new_user: "Akun Baru",
    th_id_cust: "ID Customer",
    th_company: "Perusahaan",
    th_address: "Alamat",
    th_user: "Username",
    th_auth: "Otorisasi",
  },
  zh: {
    nav_ops: "运营",
    nav_board: "控制面板",
    nav_scan: "智能扫码",
    nav_hist: "交易记录",
    nav_master: "主数据",
    nav_item: "物料主数据",
    nav_cust: "客户主数据",
    nav_user: "用户管理",
    btn_login: "登录系统",
    hdr_overview: "总览",
    title_board: "座椅总成控制面板",
    desc_board: "实时库存与发货监控（每日 08:00 重置）",
    lbl_tot_row: "总行数：",
    search_part: "搜索零件号...",
    search_cust: "搜索客户...",
    search_user: "搜索账号...",
    th_cust: "客户",
    th_rak: "货架",
    th_part: "零件号",
    th_stock: "库存",
    th_del: "发货量",
    th_target: "日目标量",
    th_out: "出库量",
    th_sisa: "剩余发货量",
    th_assy: "总成入库<br>FSG",
    btn_cam_on: "启用相机",
    btn_cam_off: "关闭相机",
    lbl_gun: "扫码枪模式（手推车批量）",
    input_gun: "点击并扫描条码...",
    title_trolley: "手推车列表",
    lbl_dest: "批量发货目的地",
    btn_assy: "加入总成",
    opt_all: "所有活动",
    btn_export: "导出 Excel",
    th_time: "时间",
    th_type: "类型",
    th_diff: "差异",
    th_pic: "操作员",
    th_note: "备注",
    th_item_name: "物料名称",
    th_main_stock: "主库存",
    th_action: "操作",
    btn_new_item: "新增物料",
    btn_new_cust: "新增客户",
    btn_new_user: "新增账号",
    th_id_cust: "客户ID",
    th_company: "公司",
    th_address: "地址",
    th_user: "用户名",
    th_auth: "权限",
  },
};

let currentLang = localStorage.getItem("sim_lang") || "id";
if (!dict[currentLang]) currentLang = "id";

function toggleLang() {
  currentLang = currentLang === "id" ? "zh" : "id";
  localStorage.setItem("sim_lang", currentLang);
  applyLang();
  if (typeof refreshAllUI === "function") refreshAllUI();
}

function applyLang() {
  const btn = document.getElementById("btnLang");
  if (btn) btn.innerText = currentLang === "id" ? "中文" : "ID";
  const langDict = dict[currentLang] || dict.id;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = langDict[key] || dict.id[key];
    if (!text) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA")
      el.placeholder = text;
    else el.innerHTML = text;
  });
}

// =========================================================================
// KONFIGURASI GOOGLE APPS SCRIPT WEB APP (DATABASE GOOGLE SHEETS)
// =========================================================================
// ⚠️ GANTI DENGAN URL WEB APP HASIL DEPLOY APPS SCRIPT ANDA (/exec) ⚠️
const GAS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbz4uVDIz5EEa1t8XfinFJjm4hl1L9ft2ED1e5XoINERwavIgR_WNSTG9VHJt_HSWPdD/exec";

let currentUser = null,
  appData = {
    barang: [],
    customer: [],
    orders: [],
    masuk: [],
    keluar: [],
    seatAssyControl: [],
    users: [],
  };
let activeScannedPart = null,
  isProcessing = false;
let selectedForDelete = [],
  batchTrolley = [],
  currentEditPart = null,
  currentEditCustomer = null,
  currentEditUser = null;
let codeReader = null,
  isCameraPaused = false;

function normalizeTransactionRecord(k) {
  if (!k) return k;
  // Jika kolom tergeser di Google Sheets: Part_Number berisi tanggal ISO dan qty berisi nama Part
  if (
    k.Part_Number &&
    String(k.Part_Number).includes("T") &&
    k.qty &&
    typeof k.qty === "string" &&
    isNaN(Number(k.qty))
  ) {
    return {
      id: k.id,
      tanggal: k.Part_Number,
      Part_Number: String(k.qty).trim(),
      qty: Number(k.petugas) || 0,
      petugas: k.catatan || "-",
      catatan: k.tanggal || "",
    };
  }
  return {
    id: k.id,
    tanggal: k.tanggal || k.created_at || "",
    Part_Number: String(k.Part_Number || "").trim(),
    qty: Number(k.qty) || 0,
    petugas: k.petugas || "-",
    catatan: k.catatan || "",
  };
}

const style = document.createElement("style");
style.innerHTML = `@keyframes toastSlideDown { from { transform: translateY(-100%) scale(0.9); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } } @keyframes toastSlideUp { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(-100%) scale(0.9); opacity: 0; } } .animate-toast-in { animation: toastSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; } .animate-toast-out { animation: toastSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }`;
document.head.appendChild(style);

function showToast(type, title, message = "") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className =
      "fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-sm";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  let iconColor = "text-green-500",
    icon = '<i class="fa-solid fa-circle-check text-xl"></i>';
  if (type === "error") {
    iconColor = "text-red-500";
    icon = '<i class="fa-solid fa-circle-xmark text-xl"></i>';
  } else if (type === "warning") {
    iconColor = "text-amber-500";
    icon = '<i class="fa-solid fa-triangle-exclamation text-xl"></i>';
  } else if (type === "info") {
    iconColor = "text-blue-500";
    icon = '<i class="fa-solid fa-circle-info text-xl"></i>';
  }
  toast.className = `flex items-start gap-4 bg-white/80 backdrop-blur-2xl border border-white shadow-xl shadow-gray-200/50 p-4 rounded-2xl pointer-events-auto animate-toast-in`;
  toast.innerHTML = `<div class="${iconColor} mt-0.5">${icon}</div><div class="flex-1"><h4 class="font-bold text-sm text-gray-900 leading-tight">${title}</h4>${message ? `<p class="text-[11px] font-medium text-gray-500 mt-1 leading-snug">${message}</p>` : ""}</div><button onclick="this.parentElement.classList.replace('animate-toast-in', 'animate-toast-out'); setTimeout(() => this.parentElement.remove(), 300)" class="text-gray-400 hover:text-gray-800 transition-colors"><i class="fa-solid fa-xmark text-lg"></i></button>`;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.replace("animate-toast-in", "animate-toast-out");
      setTimeout(() => toast.remove(), 300);
    }
  }, 3000);
}

const swalUI = Swal.mixin({ buttonsStyling: false });

window.addEventListener("DOMContentLoaded", () => {
  applyLang();
  startLiveClock();
  const savedUser =
    sessionStorage.getItem("sim_inventory_user") ||
    localStorage.getItem("sim_inventory_user");
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {
      currentUser = null;
    }
  }
  applyRbacUI();
  loadInitialOrMockData();

  let isBackgroundSyncing = false;
  setInterval(() => {
    const overviewTab = document.getElementById("tab-overview"),
      riwayatTab = document.getElementById("tab-riwayat"),
      barangTab = document.getElementById("tab-barang"),
      custTab = document.getElementById("tab-customer"),
      usersTab = document.getElementById("tab-users");
    if (isProcessing || isBackgroundSyncing) return;
    if (!GAS_WEBAPP_URL || GAS_WEBAPP_URL.includes("PASTE_URL_WEB_APP")) return;
    if (
      (overviewTab && !overviewTab.classList.contains("hidden")) ||
      (riwayatTab && !riwayatTab.classList.contains("hidden")) ||
      (barangTab && !barangTab.classList.contains("hidden")) ||
      (custTab && !custTab.classList.contains("hidden")) ||
      (usersTab && !usersTab.classList.contains("hidden"))
    ) {
      isBackgroundSyncing = true;
      sendToBackend("apiGetMasterData")
        .then(async (res) => {
          isBackgroundSyncing = false;
          if (res && res.success) {
            appData.barang = res.barang || [];
            appData.customer = res.customer || [];
            appData.orders = res.orders || [];
            appData.masuk = (res.masuk || []).map(normalizeTransactionRecord);
            appData.keluar = (res.keluar || []).map(normalizeTransactionRecord);
            appData.users = res.users || [];
            buildSeatAssyControlDataset();
            refreshAllUI();
          }
        })
        .catch(() => {
          isBackgroundSyncing = false;
        });
    }
  }, 15000);
});

function getOperationalDayInfo() {
  const now = new Date();
  const opStart = new Date(now);
  opStart.setHours(8, 0, 0, 0);
  if (now < opStart) opStart.setDate(opStart.getDate() - 1);
  return {
    opKey: `${opStart.getFullYear()}-${String(opStart.getMonth() + 1).padStart(2, "0")}-${String(opStart.getDate()).padStart(2, "0")}`,
    opStart,
  };
}

async function checkAndRunDailyRollover(isForce = false) {
  if (isProcessing) return;
  const { opKey } = getOperationalDayInfo();
  if (isForce) showToast("info", "Memproses...", "Melakukan tutup buku manual");
  isProcessing = true;
  try {
    const res = await sendToBackend("apiDailyRollover", { isForce, opKey });
    isProcessing = false;
    return res;
  } catch (e) {
    console.error("Rollover error:", e);
    isProcessing = false;
  }
}

function triggerForceRollover() {
  if (!currentUser || currentUser.role !== "Admin") return;
  swalUI
    .fire({
      title: currentLang === "zh" ? "手动结算?" : "Paksa Tutup Buku?",
      html:
        currentLang === "zh"
          ? "这会强制将当天的组装数据合并到总库存并清空目标量。"
          : "Tindakan ini akan mereset Target dan memindahkan Stok Assy ke Stok Utama sekarang juga.",
      showCancelButton: true,
      confirmButtonText:
        currentLang === "zh" ? "是的，立即重置" : "Ya, Reset Sekarang",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((res) => {
      if (res.isConfirmed) {
        swalUI.fire({
          title: currentLang === "zh" ? "处理中..." : "Memproses...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        checkAndRunDailyRollover(true).then(() => {
          Swal.close();
          showToast("success", "Berhasil", "Tutup Buku manual selesai.");
          refreshAllData();
        });
      }
    });
}

function parseYimmBarcode(rawCode) {
  let result = {
    partNumberClean: rawCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
    original: rawCode,
    qty: 1,
  };
  if (rawCode.startsWith("[)>")) {
    let partMatch = rawCode.match(/P([A-Z0-9]+)V/);
    if (partMatch && partMatch[1]) result.partNumberClean = partMatch[1];
    else {
      let fallbackPart = rawCode.match(/P([A-Z0-9]{10,15})/);
      if (fallbackPart) result.partNumberClean = fallbackPart[1];
    }
    let qtyMatch = rawCode.match(/Q(\d{6})/);
    if (qtyMatch && qtyMatch[1]) result.qty = parseInt(qtyMatch[1], 10);
    return result;
  }
  if (rawCode.includes("|")) {
    let parts = rawCode.split("|")[0].split("-");
    if (parts.length > 1) {
      let possibleQty = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(possibleQty)) {
        result.qty = possibleQty;
        parts.pop();
      }
      result.partNumberClean = parts
        .join("")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
    } else
      result.partNumberClean = parts[0]
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
  }
  return result;
}

function resolveCustomerDisplay(custCode) {
  if (
    !custCode ||
    custCode === "-" ||
    String(custCode) === "undefined" ||
    String(custCode) === "null"
  )
    return "-";
  const cleanCode = String(custCode).trim();
  const found = (appData.customer || []).find(
    (c) =>
      String(c.id_customer).trim().toLowerCase() === cleanCode.toLowerCase() ||
      String(c.nama_customer).trim().toLowerCase() === cleanCode.toLowerCase(),
  );
  return found ? found.nama_customer || found.id_customer : cleanCode;
}

function extractCustomerFromCatatan(catatan) {
  if (!catatan) return null;
  const match = String(catatan).match(
    /Kirim ke:\s*(.+?)(?:\s*\(\d+\s*Troli\))?$/i,
  );
  if (match && match[1]) {
    const raw = match[1].trim();
    if (raw && raw !== "-" && raw.toLowerCase() !== "undefined")
      return resolveCustomerDisplay(raw);
  }
  const matchManual = String(catatan).match(
    /(?:Kirim ke|Dari|Tujuan):\s*(.+)$/i,
  );
  if (matchManual && matchManual[1]) {
    const raw = matchManual[1].trim();
    if (raw && raw !== "-" && raw.toLowerCase() !== "undefined")
      return resolveCustomerDisplay(raw);
  }
  return null;
}

function getLocalMultiCustMap(partNum) {
  try {
    const raw = localStorage.getItem("multi_cust_orders_" + partNum);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function saveLocalMultiCustTarget(partNum, customerName, qtyOrder) {
  const cName = resolveCustomerDisplay(customerName);
  if (!cName || cName === "-") return;
  const map = getLocalMultiCustMap(partNum);
  if (qtyOrder !== undefined && qtyOrder !== null)
    map[cName] = Number(qtyOrder) || 0;
  else if (map[cName] === undefined) map[cName] = 0;
  localStorage.setItem("multi_cust_orders_" + partNum, JSON.stringify(map));
}
function removeLocalMultiCustTarget(partNum, customerName) {
  const cName = resolveCustomerDisplay(customerName),
    map = getLocalMultiCustMap(partNum);
  delete map[cName];
  localStorage.setItem("multi_cust_orders_" + partNum, JSON.stringify(map));
}

async function sendToBackend(action, payload = {}) {
  if (!GAS_WEBAPP_URL || GAS_WEBAPP_URL.includes("PASTE_URL_WEB_APP")) {
    return {
      success: false,
      message:
        "URL Google Apps Script belum dikonfigurasi! Buka script.js dan masukkan URL Web App pada variabel GAS_WEBAPP_URL.",
    };
  }
  try {
    const response = await fetch(GAS_WEBAPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ action, payload }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const result = await response.json();
    return result;
  } catch (err) {
    console.error(`Error sendToBackend [${action}]:`, err);
    return {
      success: false,
      message: err.message || "Gagal menghubungi server Google Apps Script",
    };
  }
}

function startLiveClock() {
  setInterval(() => {
    const el = document.getElementById("liveClock");
    if (el)
      el.innerText = new Date().toLocaleTimeString("id-ID", { hour12: false });
  }, 1000);
}
function toggleSidebar() {
  toggleSidebarPin();
}
function toggleSidebarPin() {
  const sb = document.getElementById("mainSidebar");
  const main = document.querySelector("main");
  const pinIcon = document.getElementById("sidebarPinIcon");
  if (!sb) return;
  sb.classList.toggle("sidebar-pinned");
  const isPinned = sb.classList.contains("sidebar-pinned");
  if (isPinned) {
    if (main) {
      main.classList.remove("pl-[68px]");
      main.classList.add("pl-[260px]");
    }
    if (pinIcon) pinIcon.classList.add("text-white", "rotate-45");
  } else {
    if (main) {
      main.classList.remove("pl-[260px]");
      main.classList.add("pl-[68px]");
    }
    if (pinIcon) pinIcon.classList.remove("text-white", "rotate-45");
  }
}
function closeSidebar() {
  // Biarkan sidebar hover beroperasi normal
}

function switchTab(tabId) {
  document
    .querySelectorAll(".tab-pane")
    .forEach((el) => el.classList.add("hidden"));
  const activeTab = document.getElementById(`tab-${tabId}`);
  if (activeTab) activeTab.classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.remove("bg-white", "text-[#540b17]", "shadow-md");
    btn.classList.add("text-rose-100/80");
  });
  const activeNav = document.getElementById(`btn-tab-${tabId}`);
  if (activeNav) {
    activeNav.classList.add("bg-white", "text-[#540b17]", "shadow-md");
    activeNav.classList.remove("text-rose-100/80");
  }

  if (tabId === "overview") renderSeatAssyControlBoard();
  if (tabId === "riwayat") renderRiwayatTable();
  if (tabId === "barang")
    renderMasterBarangTable(
      document.getElementById("searchMasterBarang")?.value || "",
    );
  if (tabId === "customer")
    renderCustomerTable(
      document.getElementById("searchMasterCustomer")?.value || "",
    );
  if (tabId === "users")
    renderUsersTable(document.getElementById("searchMasterUser")?.value || "");
  if (tabId !== "scanner") stopSmartScanner();
  if (tabId === "scanner") {
    populateCustomerDropdown(
      document.getElementById("batchSelectCustomer"),
      "-",
    );
    updateBatchTrolleyUI();
    setTimeout(() => document.getElementById("manualSmartInput")?.focus(), 100);
  }
  closeSidebar();
}

function applyRbacUI() {
  const pCard = document.getElementById("userProfileCard"),
    gPrompt = document.getElementById("guestLoginPrompt");
  document
    .querySelectorAll(".role-admin, .role-auth")
    .forEach((el) => el.classList.add("hidden"));
  const bWH = document.getElementById("batchBtnGroupWH"),
    bAssy = document.getElementById("batchBtnGroupAssy"),
    bCust = document.getElementById("batchCustWrapper"),
    btnForce = document.getElementById("btnForceRollover"),
    btnForceNav = document.getElementById("btnForceRolloverNav");

  if (currentUser) {
    if (pCard) {
      pCard.classList.remove("hidden");
      pCard.classList.add("flex");
    }
    if (gPrompt) gPrompt.classList.add("hidden");
    const uDisplay = document.getElementById("userNameDisplay");
    if (uDisplay) uDisplay.innerText = currentUser.username;
    const rBadge = document.getElementById("userRoleBadge");
    if (rBadge) rBadge.innerText = currentUser.role;
    const aLetter = document.getElementById("avatarLetter");
    if (aLetter)
      aLetter.innerText = currentUser.username.charAt(0).toUpperCase();
    document
      .querySelectorAll(".role-auth")
      .forEach((el) => el.classList.remove("hidden"));
    if (currentUser.role === "Admin") {
      document
        .querySelectorAll(".role-admin")
        .forEach((el) => el.classList.remove("hidden"));
      if (btnForce) {
        btnForce.classList.remove("hidden");
        btnForce.classList.add("flex");
      }
      if (btnForceNav) {
        btnForceNav.classList.remove("hidden");
        btnForceNav.classList.add("flex");
      }
    } else {
      if (btnForce) {
        btnForce.classList.add("hidden");
        btnForce.classList.remove("flex");
      }
      if (btnForceNav) {
        btnForceNav.classList.add("hidden");
        btnForceNav.classList.remove("flex");
      }
    }
    if (bWH && bAssy && bCust) {
      if (currentUser.role === "Admin") {
        bWH.classList.remove("hidden");
        bAssy.classList.remove("hidden");
        bCust.classList.remove("hidden");
      } else if (currentUser.role === "Produksi") {
        bWH.classList.add("hidden");
        bAssy.classList.remove("hidden");
        bCust.classList.add("hidden");
      } else {
        bWH.classList.remove("hidden");
        bAssy.classList.add("hidden");
        bCust.classList.remove("hidden");
      }
    }
  } else {
    if (pCard) {
      pCard.classList.add("hidden");
      pCard.classList.remove("flex");
    }
    if (gPrompt) gPrompt.classList.remove("hidden");
    if (btnForce) {
      btnForce.classList.add("hidden");
      btnForce.classList.remove("flex");
    }
    if (btnForceNav) {
      btnForceNav.classList.add("hidden");
      btnForceNav.classList.remove("flex");
    }
  }
}

function showSyncSpinner(show) {
  const s = document.getElementById("syncSpinner");
  if (s) s.classList.toggle("animate-spin", show);
  const sNav = document.getElementById("syncSpinnerNav");
  if (sNav) sNav.classList.toggle("animate-spin", show);
}
function refreshAllData() {
  showSyncSpinner(true);
  loadInitialOrMockData();
}

const DEFAULT_BOARD_RAW = [
  // YIMM
  {
    cust: "YIMM",
    rel: "A.01 - A.07",
    part: "BWP-F4730-00",
    nama: "SEAT ASSY BWP-00",
  },
  {
    cust: "YIMM",
    rel: "A.08 - A.13",
    part: "BJM-F4730-00",
    nama: "SEAT ASSY BJM-00",
  },
  {
    cust: "YIMM",
    rel: "A.14/16",
    part: "BWP-F4730-10",
    nama: "SEAT ASSY BWP-10",
  },
  {
    cust: "YIMM",
    rel: "A.15 - A.17",
    part: "BJM-F4730-10",
    nama: "SEAT ASSY BJM-10",
  },
  {
    cust: "YIMM",
    rel: "A.18 - A.21",
    part: "BEJ-F4730-20",
    nama: "SEAT ASSY BEJ-20",
  },
  {
    cust: "YIMM",
    rel: "A.22 - A.24",
    part: "BXY-F4730-00",
    nama: "SEAT ASSY BXY-00",
  },
  { cust: "YIMM", rel: "A.25", part: "BEJ-F4730-30", nama: "SEAT ASSY BEJ-30" },
  { cust: "YIMM", rel: "A.26", part: "B3W-F4730-01", nama: "SEAT ASSY B3W-01" },
  {
    cust: "YIMM",
    rel: "A.27 - A.28",
    part: "BXY-F4730-10",
    nama: "SEAT ASSY BXY-10",
  },
  {
    cust: "YIMM",
    rel: "A.29 - A.30",
    part: "BBP-F4730-00",
    nama: "SEAT ASSY BBP-00",
  },
  { cust: "YIMM", rel: "A.31", part: "1DY-F4730-02", nama: "SEAT ASSY 1DY-02" },
  { cust: "YIMM", rel: "A.32", part: "BDL-F4730-00", nama: "SEAT ASSY BDL-00" },
  { cust: "YIMM", rel: "A.34", part: "BNU-F4710-00", nama: "SEAT ASSY BNU-10" },
  { cust: "YIMM", rel: "A.34", part: "BNU-F4750-00", nama: "SEAT ASSY BNU-50" },
  { cust: "YIMM", rel: "A.35", part: "BY8-F4730-20", nama: "SEAT ASSY BY8-20" },
  { cust: "YIMM", rel: "A.36", part: "BDJ-F4710-00", nama: "SEAT ASSY BDJ-10" },
  { cust: "YIMM", rel: "A.36", part: "BDJ-F4750-00", nama: "SEAT ASSY BDJ-50" },
  { cust: "YIMM", rel: "A.37", part: "D48-F4730-00", nama: "SEAT ASSY D48-00" },
  { cust: "YIMM", rel: "A.38", part: "BDJ-F4710-10", nama: "SEAT ASSY BDJ-10" },
  { cust: "YIMM", rel: "A.38", part: "BDJ-F4750-10", nama: "SEAT ASSY BDJ-50" },

  // SIM
  {
    cust: "SIM",
    rel: "A.39",
    part: "45100-45H30-PR7",
    nama: "SEAT ASSY 45H30-PR7",
  },
  {
    cust: "SIM",
    rel: "A.39",
    part: "45100-22J00-W3A",
    nama: "SEAT ASSY 22J00-W3A",
  },
  {
    cust: "SIM",
    rel: "A.40",
    part: "45100-25G20-HES",
    nama: "SEAT ASSY 25G20-HES",
  },

  // KMI
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-0896",
    nama: "SEAT ASSY 53066-0896",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-0898",
    nama: "SEAT ASSY 53066-0898",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-0860 MA",
    nama: "SEAT ASSY 53066-0860 MA",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-0861 12Y",
    nama: "SEAT ASSY 53066-0861 12Y",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-1088 MA",
    nama: "SEAT ASSY 53066-1088 MA",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-1090 MA",
    nama: "SEAT ASSY 53066-1090 MA",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-1091 MA",
    nama: "SEAT ASSY 53066-1091 MA",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-1089 12Y",
    nama: "SEAT ASSY 53066-1089 12Y",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-0904 336",
    nama: "SEAT ASSY 53066-0904 336",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-0904-61U",
    nama: "SEAT ASSY 53066-0904-61U",
  },
  {
    cust: "KMI",
    rel: "A.41",
    part: "53066-0904 0927",
    nama: "SEAT ASSY 53066-0904 0927",
  },
  {
    cust: "KMI",
    rel: "A.43",
    part: "53066-0905 336",
    nama: "SEAT ASSY 53066-0905 336",
  },
  {
    cust: "KMI",
    rel: "A.43",
    part: "53066-0905 61U",
    nama: "SEAT ASSY 53066-0905 61U",
  },
  {
    cust: "KMI",
    rel: "A.43",
    part: "53066-0905 MA",
    nama: "SEAT ASSY 53066-0905 MA",
  },
  {
    cust: "KMI",
    rel: "A.43",
    part: "53066-0905 0928",
    nama: "SEAT ASSY 53066-0905 0928",
  },

  // TVS
  {
    cust: "TVS",
    rel: "A.44",
    part: "R3130220 TVSN101.W",
    nama: "SEAT ASSY TVSN101.W",
  },
  {
    cust: "TVS",
    rel: "A.44",
    part: "R3130190-TVSN101.R",
    nama: "SEAT ASSY TVSN101.R",
  },
  {
    cust: "TVS",
    rel: "A.45",
    part: "R1130190 TVSU358",
    nama: "SEAT ASSY TVSU358",
  },
  {
    cust: "TVS",
    rel: "A.46",
    part: "NA130010 TVSMAX",
    nama: "SEAT ASSY TVSMAX",
  },
  {
    cust: "TVS",
    rel: "A.46",
    part: "R3130230 TVSU313",
    nama: "SEAT ASSY TVSU313",
  },
  {
    cust: "TVS",
    rel: "A.46",
    part: "R4130020 TVSN100",
    nama: "SEAT ASSY TVSN100",
  },
  {
    cust: "TVS",
    rel: "A.46",
    part: "R1322380 SEAT BASE",
    nama: "SEAT BASE TVS",
  },
  { cust: "TVS", rel: "A.46", part: "Y4D Grey", nama: "SEAT ASSY Y4D GREY" },

  // OTHER PART ALL ITEM
  { cust: "ALL CUSTOMER", rel: "-", part: "P.T", nama: "PART P.T" },
  {
    cust: "ALL CUSTOMER",
    rel: "-",
    part: "Seat Base N100",
    nama: "SEAT BASE N100",
  },
  {
    cust: "ALL CUSTOMER",
    rel: "-",
    part: "Assy PP 4313",
    nama: "ASSY PP 4313",
  },
  { cust: "ALL CUSTOMER", rel: "A.47", part: "XT 604", nama: "PART XT 604" },
  { cust: "ALL CUSTOMER", rel: "A.47", part: "N27", nama: "PART N27" },
];

function applyDefaultBoardData() {
  appData.customer = [
    {
      id_customer: "YIMM",
      nama_customer: "YAMAHA (YIMM)",
      alamat: "Pulo Gadung / Karawang",
    },
    {
      id_customer: "SIM",
      nama_customer: "SUZUKI (SIM)",
      alamat: "Tambun, Bekasi",
    },
    {
      id_customer: "KMI",
      nama_customer: "KAWASAKI (KMI)",
      alamat: "Pulo Gadung / Cibitung",
    },
    {
      id_customer: "TVS",
      nama_customer: "TVS MOTOR (TVS)",
      alamat: "Karawang, Jawa Barat",
    },
    {
      id_customer: "ALL CUSTOMER",
      nama_customer: "ALL CUSTOMER",
      alamat: "Other Part All Item",
    },
  ];

  appData.barang = DEFAULT_BOARD_RAW.map((item) => ({
    Part_Number: item.part,
    nama_barang: item.nama,
    No_Rel: item.rel,
    stok: 0,
    assy_fsg: 0,
  }));

  appData.orders = DEFAULT_BOARD_RAW.map((item, idx) => ({
    id: "def_ord_" + (idx + 1),
    Part_Number: item.part,
    id_customer: item.cust,
    qty_order: 0,
  }));

  buildSeatAssyControlDataset();
  refreshAllUI();
}

function loadInitialOrMockData() {
  showSyncSpinner(true);
  sendToBackend("apiGetMasterData")
    .then(async (res) => {
      showSyncSpinner(false);
      if (res && res.success && res.barang && res.barang.length > 0) {
        appData.barang = res.barang || [];
        appData.customer = res.customer || [];
        appData.orders = res.orders || [];
        appData.masuk = (res.masuk || []).map(normalizeTransactionRecord);
        appData.keluar = (res.keluar || []).map(normalizeTransactionRecord);
        appData.users = res.users || [];
        buildSeatAssyControlDataset();
        refreshAllUI();
      } else {
        // Jika backend belum siap/kosong, otomatis tampilkan 51 part papan kontrol dengan stok 0
        applyDefaultBoardData();
        if (
          res &&
          !res.success &&
          res.message &&
          !res.message.includes("belum dikonfigurasi")
        ) {
          showToast(
            "info",
            "Papan Kontrol Siap",
            "Menampilkan 51 Part Number fisik (Stok & Target kosong)",
          );
        }
      }
    })
    .catch((err) => {
      showSyncSpinner(false);
      applyDefaultBoardData();
    });
}

function refreshAllUI() {
  renderSeatAssyControlBoard(
    document.getElementById("globalSearchInput")?.value || "",
  );
  renderRiwayatTable();
  renderMasterBarangTable(
    document.getElementById("searchMasterBarang")?.value || "",
  );
  renderCustomerTable(
    document.getElementById("searchMasterCustomer")?.value || "",
  );
  renderUsersTable(document.getElementById("searchMasterUser")?.value || "");
  populateCustomerDropdown(
    document.getElementById("batchSelectCustomer"),
    document.getElementById("batchSelectCustomer")?.value || "-",
  );
}

function buildSeatAssyControlDataset() {
  const list = [];
  const { opStart } = getOperationalDayInfo();
  appData.barang.forEach((itemBarang) => {
    const partNum = String(itemBarang.Part_Number).trim();
    const relatedOrders = appData.orders.filter(
      (o) => String(o.Part_Number).trim() === partNum,
    );
    const currentStock = Number(itemBarang.stok) || 0,
      assyFsg = Number(itemBarang.assy_fsg) || 0;
    const partOutLogs = appData.keluar.filter(
      (k) =>
        String(k.Part_Number).trim() === partNum &&
        new Date(k.tanggal || k.created_at) >= opStart,
    );
    const customerMap = new Map();

    relatedOrders.forEach((ord) => {
      const cName = resolveCustomerDisplay(ord.id_customer);
      if (cName && cName !== "-") {
        const key = cName.toLowerCase();
        customerMap.set(key, {
          name: cName,
          qty_day:
            (customerMap.get(key)?.qty_day || 0) + (Number(ord.qty_order) || 0),
        });
      }
    });
    const localMap = getLocalMultiCustMap(partNum);
    Object.keys(localMap).forEach((cRaw) => {
      const cName = resolveCustomerDisplay(cRaw);
      if (cName && cName !== "-") {
        const key = cName.toLowerCase();
        if (!customerMap.has(key))
          customerMap.set(key, {
            name: cName,
            qty_day: Number(localMap[cRaw]) || 0,
          });
        else if (
          customerMap.get(key).qty_day === 0 &&
          Number(localMap[cRaw]) > 0
        )
          customerMap.get(key).qty_day = Number(localMap[cRaw]);
      }
    });
    partOutLogs.forEach((k) => {
      const extractedCust = extractCustomerFromCatatan(k.catatan);
      if (extractedCust && extractedCust !== "-") {
        const key = extractedCust.toLowerCase();
        if (!customerMap.has(key))
          customerMap.set(key, {
            name: extractedCust,
            qty_day: Number(localMap[extractedCust]) || 0,
          });
      }
    });

    if (customerMap.size === 0) {
      let fallbackCust = resolveCustomerDisplay(
        itemBarang.id_customer ||
          localStorage.getItem("cust_map_" + partNum) ||
          "-",
      );
      const fallbackQtyDay = relatedOrders.reduce(
        (s, o) => s + (Number(o.qty_order) || 0),
        0,
      );
      customerMap.set(fallbackCust.toLowerCase(), {
        name: fallbackCust,
        qty_day: fallbackQtyDay,
      });
    }

    let totalQtyDayAllCust = 0;
    customerMap.forEach((val) => {
      totalQtyDayAllCust += val.qty_day;
    });
    const variancePart = currentStock + assyFsg - totalQtyDayAllCust;
    const custEntries = Array.from(customerMap.values());

    custEntries.forEach((custObj, idx) => {
      const qtyOutCust = partOutLogs
        .filter((k) => {
          const logCust = extractCustomerFromCatatan(k.catatan);
          if (logCust)
            return logCust.toLowerCase() === custObj.name.toLowerCase();
          return idx === 0;
        })
        .reduce((sum, k) => sum + (Number(k.qty) || 0), 0);
      list.push({
        Customer: custObj.name,
        CustomerCount: custEntries.length,
        No_Rel: itemBarang.No_Rel || "-",
        Part_Number: partNum,
        nama_barang: itemBarang.nama_barang || "-",
        stock: currentStock,
        qty_day: custObj.qty_day,
        qty_out: qtyOutCust,
        sisa_del: Math.max(0, custObj.qty_day - qtyOutCust),
        assy_fsg: assyFsg,
        variance: variancePart,
      });
    });
  });
  appData.seatAssyControl = list;
}

function promptLoginToEdit(fieldLabel = "data ini") {
  showToast(
    "info",
    currentLang === "zh" ? "需要登录" : "Perlu Login",
    currentLang === "zh"
      ? `请先登录以修改 ${fieldLabel}。`
      : `Silakan login terlebih dahulu untuk mengubah ${fieldLabel}.`,
  );
  openLoginModal();
}

function promptUpdateCustomerPart(partNumber, currentCust, custCount = 1) {
  if (!currentUser) return promptLoginToEdit("Customer");
  if (isProcessing) return;
  if (!appData.customer || appData.customer.length === 0)
    return showToast("info", "Info", "Tambahkan data di Master Customer dulu!");
  let optionsHtml = `<option value="-">-- Kosongkan --</option>`;
  appData.customer.forEach((c) => {
    const val = c.nama_customer || c.id_customer;
    optionsHtml += `<option value="${val}" ${String(val).toLowerCase() === String(currentCust).toLowerCase() ? "selected" : ""}>${c.nama_customer ? `${c.nama_customer} (${c.id_customer})` : c.id_customer}</option>`;
  });

  swalUI
    .fire({
      title: currentLang === "zh" ? "选择目标客户" : "Pilih Customer Tujuan",
      html: `<div class="text-left"><p class="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">${partNumber}</p>
      <div class="mb-3"><label class="block text-xs font-medium text-gray-500 mb-1">${currentLang === "zh" ? "客户:" : "Customer:"}</label><select id="swalSelectCust" class="swal2-select w-full rounded-xl px-4 py-3 text-sm">${optionsHtml}</select></div>
      <div><label class="block text-xs font-medium text-gray-500 mb-1">${currentLang === "zh" ? "操作:" : "Tindakan:"}</label>
        <select id="swalModeCust" onchange="document.getElementById('swalWrapQtyBaru').classList.toggle('hidden', this.value !== 'ADD_NEW')" class="swal2-select w-full rounded-xl px-4 py-3 text-sm">
          <option value="UPDATE">${currentLang === "zh" ? "仅修改此行" : "Ubah Baris Ini Saja"}</option><option value="ADD_NEW">${currentLang === "zh" ? "+ 添加新目标 (相同零件)" : "+ Tambah Tujuan Baru (Part Sama)"}</option>
          ${custCount > 1 ? `<option value="DELETE_ROW">${currentLang === "zh" ? "删除此行" : "Hapus Baris Ini"}</option>` : ""}
        </select>
      </div><div id="swalWrapQtyBaru" class="hidden mt-3"><label class="block text-xs font-medium text-gray-500 mb-1">${currentLang === "zh" ? "新的发货目标 (Pcs):" : "Target Pengiriman (Pcs):"}</label><input type="number" id="swalQtyOrderBaru" value="100" class="swal2-input" /></div></div>`,
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "保存" : "Simpan",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
      preConfirm: () => ({
        customer: document.getElementById("swalSelectCust").value,
        mode: document.getElementById("swalModeCust").value,
        qtyOrder: document.getElementById("swalQtyOrderBaru").value,
      }),
    })
    .then((res) => {
      if (res.isConfirmed) {
        if (
          res.value.mode === "ADD_NEW" &&
          (!res.value.customer || res.value.customer === "-")
        )
          return showToast(
            "warning",
            "Pilih Customer!",
            "Pilih nama Customer baru yang ingin ditambahkan.",
          );
        isProcessing = true;
        swalUI.fire({
          title: "Menyimpan...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        sendToBackend("apiUpdateCustomerPart", {
          partNumber,
          oldCustomer: currentCust,
          ...res.value,
        }).then((r) => {
          isProcessing = false;
          Swal.close();
          if (r.success) {
            showToast("success", "Tersimpan!");
            refreshAllData();
          } else {
            showToast("error", "Gagal", r.message);
          }
        });
      }
    });
}

function promptUpdateStokUtama(partNumber, currentQty) {
  if (!currentUser) return promptLoginToEdit("Stok Utama");
  if (isProcessing) return;
  swalUI
    .fire({
      title: currentLang === "zh" ? "更新主库存" : "Update Stok Utama",
      html: `<p class="text-sm font-bold text-gray-800 mb-1">${partNumber}</p><p class="text-xs text-blue-600 font-medium mb-3">${currentLang === "zh" ? "当前库存:" : "Stok saat ini:"} <b>${currentQty}</b> Pcs</p><p class="text-[11px] text-gray-500">${currentLang === "zh" ? "输入 <b>实际库存总数</b>。系统将自动计算差额并记录到交易历史中。" : "Masukkan <b>Total Real Stok Utama</b>. Sistem akan menghitung selisihnya otomatis dan mencatatnya ke Riwayat Transaksi."}</p>`,
      input: "number",
      inputValue: currentQty,
      inputAttributes: { min: 0 },
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "保存总数" : "Simpan Total",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((res) => {
      if (res.isConfirmed) {
        const newTotal = Number(res.value) || 0;
        if (newTotal < 0)
          return showToast("error", "Error", "Total tidak boleh minus");
        if (newTotal === currentQty)
          return showToast(
            "info",
            "Tidak ada perubahan",
            "Angka sama dengan sebelumnya",
          );
        isProcessing = true;
        swalUI.fire({
          title: "Memproses...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        sendToBackend("apiUpdateStokUtama", {
          partNumber: partNumber,
          qty: newTotal,
          petugas: currentUser.username,
        }).then((response) => {
          isProcessing = false;
          Swal.close();
          if (response.success) {
            let item = (appData.barang || []).find(
              (b) => String(b.Part_Number).trim() === partNumber,
            );
            if (item) item.stok = newTotal;
            buildSeatAssyControlDataset();
            refreshAllUI();
            showToast("success", "Berhasil Diupdate!");
            refreshAllData();
          } else {
            showToast("error", "Gagal", response.message);
          }
        });
      }
    });
}

function promptUpdateAssyFsg(partNumber, currentQty) {
  if (!currentUser) return promptLoginToEdit("Stok Assy");
  if (isProcessing) return;
  swalUI
    .fire({
      title: currentLang === "zh" ? "更新组装库存" : "Update Stok Assy",
      html: `<p class="text-sm font-bold text-gray-800 mb-1">${partNumber}</p><p class="text-xs text-purple-600 font-medium mb-3">${currentLang === "zh" ? "当前记录:" : "Tercatat saat ini:"} <b>${currentQty}</b> Pcs</p><p class="text-[11px] text-gray-500">${currentLang === "zh" ? "输入 <b>总数</b>。系统将自动计算差额并记录到交易历史中。" : "Masukkan <b>Total Akhir</b>. Sistem akan otomatis menghitung selisihnya dan mencatat ke Riwayat Transaksi."}</p>`,
      input: "number",
      inputValue: currentQty,
      inputAttributes: { min: 0 },
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "保存总数" : "Simpan Total",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((res) => {
      if (res.isConfirmed) {
        const newTotal = Number(res.value) || 0;
        if (newTotal < 0)
          return showToast("error", "Error", "Total tidak boleh minus");
        if (newTotal === currentQty)
          return showToast(
            "info",
            "Tidak ada perubahan",
            "Angka sama dengan sebelumnya",
          );
        isProcessing = true;
        swalUI.fire({
          title: "Memproses...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        sendToBackend("apiUpdateAssyFsg", {
          partNumber: partNumber,
          qty: newTotal,
          mode: "SET",
          petugas: currentUser.username,
        }).then((response) => {
          isProcessing = false;
          Swal.close();
          if (response.success) {
            let item = (appData.barang || []).find(
              (b) => String(b.Part_Number).trim() === partNumber,
            );
            if (item) item.assy_fsg = newTotal;
            buildSeatAssyControlDataset();
            refreshAllUI();
            showToast("success", "Berhasil Diupdate!");
            refreshAllData();
          } else {
            showToast("error", "Gagal", response.message);
          }
        });
      }
    });
}

function promptUpdateQtyDay(partNumber, currentQty, customerName = "-") {
  if (!currentUser) return promptLoginToEdit("Target QTY/DAY");
  if (isProcessing) return;
  swalUI
    .fire({
      title:
        currentLang === "zh" ? "设置每日目标 (QTY/DAY)" : "Set Target Harian",
      html: `<p class="text-sm font-bold text-gray-800 mb-1">${partNumber}</p><p class="text-xs text-gray-600 font-medium mb-1">${currentLang === "zh" ? "目的:" : "Tujuan:"} ${customerName}</p><p class="text-xs text-apple-blue font-medium mb-3">${currentLang === "zh" ? "当前目标:" : "Target saat ini:"} <b>${currentQty}</b> Pcs</p><p class="text-[11px] text-gray-500">${currentLang === "zh" ? "输入 <b>最终目标总数</b>。系统将自动计算差额并将其记录在历史记录中。" : "Masukkan <b>Total Akhir Target</b>. Sistem akan otomatis menghitung selisih perubahannya dan mencatatnya ke Riwayat Transaksi."}</p>`,
      input: "number",
      inputValue: currentQty > 0 ? currentQty : "",
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "保存目标" : "Simpan Target",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((res) => {
      if (res.isConfirmed) {
        const newTotal = Number(res.value) || 0;
        if (newTotal < 0)
          return showToast("error", "Error", "Target tidak boleh minus");
        const diff = newTotal - currentQty;
        if (diff === 0)
          return showToast(
            "info",
            "Tidak ada perubahan",
            "Angka target sama dengan sebelumnya",
          );
        isProcessing = true;
        swalUI.fire({
          title: "Menyimpan...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        sendToBackend("apiUpdateQtyDay", {
          partNumber: partNumber,
          qty: newTotal,
          diff: diff,
          customer: customerName,
          petugas: currentUser.username,
        }).then((response) => {
          isProcessing = false;
          Swal.close();
          if (response.success) {
            saveLocalMultiCustTarget(partNumber, customerName, newTotal);
            let foundOrd = (appData.orders || []).find(
              (o) =>
                String(o.Part_Number).trim() === partNumber &&
                String(o.id_customer || "").toLowerCase() ===
                  String(customerName).toLowerCase(),
            );
            if (foundOrd) {
              foundOrd.qty_order = newTotal;
            } else {
              appData.orders.push({
                id: "ord_" + Date.now(),
                Part_Number: partNumber,
                qty_order: newTotal,
                id_customer: customerName !== "-" ? customerName : "",
              });
            }
            buildSeatAssyControlDataset();
            refreshAllUI();
            showToast("success", "Target Disimpan");
            refreshAllData();
          } else {
            showToast("error", "Gagal", response.message);
          }
        });
      }
    });
}

function promptUpdateQtyOut(partNumber, customerName, currentQtyOut) {
  if (!currentUser) return promptLoginToEdit("QTY OUT");
  if (isProcessing) return;
  swalUI
    .fire({
      title: currentLang === "zh" ? "更新发货 (OUT)" : "Update Pengiriman",
      html: `<p class="text-sm font-bold text-gray-800 mb-1">${partNumber}</p><p class="text-xs text-gray-600 font-medium mb-1">${currentLang === "zh" ? "目的:" : "Tujuan:"} ${customerName}</p><p class="text-xs text-red-500 font-medium mb-3">${currentLang === "zh" ? "当前已发送:" : "Terkirim saat ini:"} <b>${currentQtyOut}</b> Pcs</p><p class="text-[11px] text-gray-500">${currentLang === "zh" ? "输入交货的 <b>最终总数</b>。系统将自动计算差额并将其记录在历史记录中 (OUT)。" : "Masukkan <b>Total Akhir</b> pengiriman. Sistem otomatis menghitung selisih dan mencatatnya ke Riwayat (OUT)."}</p>`,
      input: "number",
      inputValue: currentQtyOut,
      inputAttributes: { min: 0 },
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "保存总数" : "Simpan Total",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((res) => {
      if (res.isConfirmed) {
        const newTotal = Number(res.value) || 0;
        if (newTotal < 0)
          return showToast("error", "Error", "Total tidak boleh minus");
        if (newTotal === currentQtyOut)
          return showToast(
            "info",
            "Tidak ada perubahan",
            "Angka sama dengan sebelumnya",
          );
        const diff = newTotal - currentQtyOut;
        isProcessing = true;
        swalUI.fire({
          title: "Mencatat Riwayat...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        let catatanStr =
          diff > 0
            ? `Pengiriman Papan Kontrol - Tujuan: ${customerName}`
            : `Koreksi Batal Kirim - Dari: ${customerName}`;
        sendToBackend("apiSaveTransaksiKeluar", {
          partNumber: partNumber,
          qty: diff,
          petugas: currentUser.username,
          customer: customerName,
          catatan: catatanStr,
        }).then((response) => {
          isProcessing = false;
          Swal.close();
          if (response.success) {
            appData.keluar.push({
              id: "trx_" + Date.now(),
              tanggal: new Date().toISOString(),
              Part_Number: partNumber,
              qty: diff,
              petugas: currentUser.username,
              catatan: catatanStr,
            });
            buildSeatAssyControlDataset();
            refreshAllUI();
            showToast("success", "Berhasil Diperbarui!");
            refreshAllData();
          } else {
            showToast("error", "Gagal", response.message);
          }
        });
      }
    });
}

function promptUpdateSisaDel(
  partNumber,
  currentSisaDel,
  currentQtyDay,
  currentQtyOut,
  customerName = "-",
) {
  if (!currentUser) return promptLoginToEdit("Sisa Delivery");
  if (isProcessing) return;
  swalUI
    .fire({
      title:
        currentLang === "zh" ? "调整剩余交货 (SISA DEL)" : "Atur Sisa Delivery",
      html: `<p class="text-sm font-bold text-gray-800 mb-1">${partNumber}</p>
      <p class="text-xs text-gray-600 font-medium mb-1">Customer: <b>${customerName}</b></p>
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 mb-3 text-left space-y-1">
        <div class="flex justify-between"><span>Target Harian (QTY/DAY):</span> <b class="text-slate-800">${currentQtyDay}</b></div>
        <div class="flex justify-between"><span>Terkirim (QTY OUT):</span> <b class="text-slate-800">${currentQtyOut}</b></div>
        <div class="flex justify-between border-t border-slate-200 pt-1 font-bold text-red-600"><span>Sisa Del Saat Ini:</span> <span>${currentSisaDel}</span></div>
      </div>
      <p class="text-[11px] text-gray-500 mb-2">Masukkan <b>target sisa kirim yang diinginkan</b>. Sistem otomatis menyesuaikan Target QTY/DAY (Target = QTY OUT + Sisa Baru).</p>`,
      input: "number",
      inputValue: currentSisaDel > 0 ? currentSisaDel : "",
      inputAttributes: { min: 0 },
      showCancelButton: true,
      confirmButtonText: "Simpan Sisa Delivery",
      cancelButtonText: "Batal",
    })
    .then((res) => {
      if (res.isConfirmed) {
        const targetSisa = Number(res.value) || 0;
        if (targetSisa < 0)
          return showToast("error", "Error", "Sisa delivery tidak boleh minus");
        const newQtyDay = (Number(currentQtyOut) || 0) + targetSisa;
        const diff = newQtyDay - (Number(currentQtyDay) || 0);
        if (diff === 0 && targetSisa === currentSisaDel) {
          return showToast(
            "info",
            "Tidak ada perubahan",
            "Angka sisa delivery sama dengan saat ini",
          );
        }
        isProcessing = true;
        swalUI.fire({
          title: "Menyimpan...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        sendToBackend("apiUpdateQtyDay", {
          partNumber: partNumber,
          qty: newQtyDay,
          diff: diff,
          customer: customerName,
          petugas: currentUser.username,
        }).then((response) => {
          isProcessing = false;
          Swal.close();
          if (response.success) {
            saveLocalMultiCustTarget(partNumber, customerName, newQtyDay);
            let foundOrd = (appData.orders || []).find(
              (o) =>
                String(o.Part_Number).trim() === partNumber &&
                String(o.id_customer || "").toLowerCase() ===
                  String(customerName).toLowerCase(),
            );
            if (foundOrd) {
              foundOrd.qty_order = newQtyDay;
            } else {
              appData.orders.push({
                id: "ord_" + Date.now(),
                Part_Number: partNumber,
                qty_order: newQtyDay,
                id_customer: customerName !== "-" ? customerName : "",
              });
            }
            buildSeatAssyControlDataset();
            refreshAllUI();
            showToast("success", "Sisa Delivery & Target Disimpan");
            refreshAllData();
          } else {
            showToast("error", "Gagal", response.message);
          }
        });
      }
    });
}

function generateTableRowsHtml(subDataset) {
  if (!subDataset || subDataset.length === 0) {
    return `<tr><td colspan="9" class="py-6 text-center text-gray-400 font-medium">${currentLang === "zh" ? "无数据" : "Tidak ada data"}</td></tr>`;
  }
  const canEditTarget = currentUser !== null;
  const canEditCust =
    currentUser &&
    (currentUser.role === "Admin" || currentUser.role === "Warehouse");
  const canEditAssy =
    currentUser &&
    (currentUser.role === "Admin" || currentUser.role === "Produksi");
  const canEditStokUtama =
    currentUser &&
    (currentUser.role === "Admin" || currentUser.role === "Warehouse");

  let html = "";
  for (let i = 0; i < subDataset.length; i++) {
    let row = subDataset[i];
    const formatNum = (num) => (num === 0 ? "-" : num);
    let varFormat =
      row.variance > 0
        ? "+" + row.variance
        : row.variance < 0
          ? row.variance
          : "-";
    let varBadge =
      row.variance > 0
        ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">${varFormat}</span>`
        : row.variance < 0
          ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">${varFormat}</span>`
          : `<span class="text-slate-400 font-medium text-xs">-</span>`;

    const custAction = canEditCust
      ? `onclick="promptUpdateCustomerPart('${row.Part_Number}', '${row.Customer}', ${row.CustomerCount || 1})"`
      : currentUser
        ? `onclick="showToast('warning', 'Akses Ditolak', 'Hanya Admin / Warehouse yang dapat mengubah Customer')"`
        : `onclick="promptLoginToEdit('Customer')"`;
    const custClass =
      "cursor-pointer hover:bg-slate-200 transition-colors rounded p-1 inline-block";

    const stokUtamaAction = canEditStokUtama
      ? `onclick="promptUpdateStokUtama('${row.Part_Number}', ${row.stock})"`
      : currentUser
        ? `onclick="showToast('warning', 'Akses Ditolak', 'Hanya Admin / Warehouse yang dapat mengubah Stok Utama')"`
        : `onclick="promptLoginToEdit('Stok Utama')"`;
    const stokUtamaClass =
      "cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors rounded block py-0.5";

    const qtyDayAction = canEditTarget
      ? `onclick="promptUpdateQtyDay('${row.Part_Number}', ${row.qty_day}, '${row.Customer}')"`
      : `onclick="promptLoginToEdit('Target QTY/DAY')"`;
    const qtyDayClass =
      "cursor-pointer hover:bg-slate-100 transition-colors rounded block py-0.5";

    const qtyOutAction = canEditCust
      ? `onclick="promptUpdateQtyOut('${row.Part_Number}', '${row.Customer}', ${row.qty_out})"`
      : currentUser
        ? `onclick="showToast('warning', 'Akses Ditolak', 'Hanya Admin / Warehouse yang dapat mengubah QTY OUT')"`
        : `onclick="promptLoginToEdit('QTY OUT')"`;
    const qtyOutClass =
      "cursor-pointer hover:bg-rose-50 hover:text-rose-600 transition-colors rounded block py-0.5";

    const sisaDelAction = canEditTarget
      ? `onclick="promptUpdateSisaDel('${row.Part_Number}', ${row.sisa_del}, ${row.qty_day}, ${row.qty_out}, '${row.Customer}')"`
      : `onclick="promptLoginToEdit('Sisa Delivery')"`;
    const sisaDelClass =
      "cursor-pointer hover:bg-red-50 hover:text-red-700 transition-colors rounded block py-0.5";

    const assyAction = canEditAssy
      ? `onclick="promptUpdateAssyFsg('${row.Part_Number}', ${row.assy_fsg})"`
      : currentUser
        ? `onclick="showToast('warning', 'Akses Ditolak', 'Hanya Admin / Produksi yang dapat mengubah Stok Assy')"`
        : `onclick="promptLoginToEdit('Stok Assy')`;
    const assyClass =
      "cursor-pointer hover:bg-purple-50 hover:text-purple-700 transition-colors rounded block py-0.5";

    let isFirstOfGroup = false,
      rowspan = 1;
    if (i === 0 || subDataset[i].Customer !== subDataset[i - 1].Customer) {
      isFirstOfGroup = true;
      for (let j = i + 1; j < subDataset.length; j++) {
        if (subDataset[j].Customer === row.Customer) rowspan++;
        else break;
      }
    }

    html += `<tr class="hover:bg-slate-50/80 transition-colors bg-white border-b border-slate-200">`;
    if (isFirstOfGroup) {
      html += `<td rowspan="${rowspan}" class="align-middle font-bold text-slate-800 text-center bg-slate-50/70 border border-slate-300 px-1 py-1 text-xs"><span class="${custClass}" ${custAction} title="Ubah Customer">${row.Customer}</span></td>`;
    }
    html += `
      <td class="text-center border border-slate-300 px-1 py-1 font-semibold text-xs text-slate-700">${row.No_Rel || "-"}</td>
      <td class="border border-slate-300 px-2 py-1 overflow-hidden">
        <div class="font-black text-slate-900 text-sm tracking-tight leading-snug truncate" title="${row.Part_Number}">${row.Part_Number}</div>
        <div class="text-[9.5px] text-slate-500 uppercase truncate font-medium leading-none mt-0.5" title="${row.nama_barang}">${row.nama_barang}</div>
      </td>
      <td class="text-center font-bold text-blue-700 border border-slate-300 px-1 py-1 text-sm tabular-nums" title="${currentLang === "zh" ? "点击调整主库存" : "Klik untuk Sesuaikan Stok Utama"}"><span class="${stokUtamaClass}" ${stokUtamaAction}>${formatNum(row.stock)}</span></td>
      <td class="text-center font-bold text-slate-800 border border-slate-300 px-1 py-1 text-sm tabular-nums" title="${currentLang === "zh" ? "点击设置每日目标" : "Klik untuk Set Target Harian (QTY/DAY)"}"><span class="${qtyDayClass}" ${qtyDayAction}>${formatNum(row.qty_day)}</span></td>
      <td class="text-center font-bold text-slate-800 border border-slate-300 px-1 py-1 text-sm tabular-nums" title="${currentLang === "zh" ? "点击更新发货" : "Klik untuk Update Pengiriman (QTY OUT)"}"><span class="${qtyOutClass}" ${qtyOutAction}>${formatNum(row.qty_out)}</span></td>
      <td class="text-center font-bold text-red-600 border border-slate-300 px-1 py-1 text-sm tabular-nums" title="${currentLang === "zh" ? "点击调整剩余交货" : "Klik untuk Atur Sisa Delivery (SISA DEL)"}"><span class="${sisaDelClass}" ${sisaDelAction}>${formatNum(row.sisa_del)}</span></td>
      <td class="text-center font-bold text-purple-700 border border-slate-300 px-1 py-1 text-sm tabular-nums" title="${currentLang === "zh" ? "点击更新组装库存" : "Klik untuk Update Stok Assy FSG"}"><span class="${assyClass}" ${assyAction}>${formatNum(row.assy_fsg)}</span></td>
      <td class="text-center border border-slate-300 px-1 py-1">${varBadge}</td>
    </tr>`;
  }
  return html;
}

function renderSeatAssyControlBoard(filterKeyword = "") {
  const tbodyLeft = document.getElementById("tblSeatAssyControlBodyLeft");
  const tbodyRight = document.getElementById("tblSeatAssyControlBodyRight");
  const tbodySingle = document.getElementById("tblSeatAssyControlBody");

  if (!tbodyLeft && !tbodySingle) return;

  let dataset = appData.seatAssyControl || [];
  if (filterKeyword) {
    const kw = filterKeyword.toLowerCase();
    dataset = dataset.filter(
      (d) =>
        d.Part_Number.toLowerCase().includes(kw) ||
        d.No_Rel.toLowerCase().includes(kw) ||
        d.Customer.toLowerCase().includes(kw),
    );
  }
  const cntEl = document.getElementById("cntTotalSeatAssy");
  if (cntEl) cntEl.innerText = dataset.length;

  const custOrder = ["YIMM", "SIM", "KMI", "TVS", "ALL CUSTOMER"];
  dataset.sort((a, b) => {
    const idxA = custOrder.indexOf(a.Customer);
    const idxB = custOrder.indexOf(b.Customer);
    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
    if (idxA !== -1 && idxB === -1) return -1;
    if (idxA === -1 && idxB !== -1) return 1;
    if (a.Customer !== b.Customer) return a.Customer.localeCompare(b.Customer);
    return 0;
  });

  if (tbodyLeft && tbodyRight) {
    if (dataset.length === 0) {
      const msg = `<tr><td colspan="9" class="py-8 text-center text-gray-400">${currentLang === "zh" ? "无匹配数据..." : "Tidak ada data..."}</td></tr>`;
      tbodyLeft.innerHTML = msg;
      tbodyRight.innerHTML = msg;
      return;
    }
    const half = Math.ceil(dataset.length / 2);
    const leftData = dataset.slice(0, half);
    const rightData = dataset.slice(half);

    tbodyLeft.innerHTML = generateTableRowsHtml(leftData);
    tbodyRight.innerHTML = generateTableRowsHtml(rightData);
  } else if (tbodySingle) {
    tbodySingle.innerHTML = generateTableRowsHtml(dataset);
  }
}

function handleGlobalSearch(kw) {
  renderSeatAssyControlBoard(kw);
}

function triggerManualGunButton() {
  handleScannerGun({ key: "Enter", preventDefault: () => {} });
}
function handleScannerGun(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const inputField = document.getElementById("manualSmartInput"),
      code = inputField.value.trim();
    if (!code) return;
    const parsed = parseYimmBarcode(code);
    const matchingRows = appData.seatAssyControl.filter(
      (item) =>
        item.Part_Number.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ===
          parsed.partNumberClean ||
        item.Part_Number.toLowerCase() === code.toLowerCase(),
    );
    if (matchingRows.length === 0) {
      showToast("error", "Tidak Dikenali", `Part ${code} tidak ada.`);
      inputField.value = "";
      return;
    }
    const foundData =
      matchingRows.find((r) => r.sisa_del > 0) || matchingRows[0];
    foundData._tempScanQty = parsed.qty;
    addToBatchTrolley(foundData);
    inputField.value = "";
    inputField.focus();
  }
}
function addToBatchTrolley(item) {
  const selectedBatchCust = document.getElementById(
    "batchSelectCustomer",
  )?.value;
  const custToUse =
    selectedBatchCust && selectedBatchCust !== "-"
      ? selectedBatchCust
      : item.Customer;
  const existing = batchTrolley.find(
    (b) => b.Part_Number === item.Part_Number && b.Customer === custToUse,
  );
  const addQty = item._tempScanQty || 1;
  if (existing) {
    existing.trolleyCount += 1;
    existing.qtyInput += addQty;
  } else {
    batchTrolley.push({
      Part_Number: item.Part_Number,
      nama_barang: item.nama_barang,
      No_Rel: item.No_Rel,
      Customer: custToUse,
      stock: item.stock,
      assy_fsg: item.assy_fsg,
      trolleyCount: 1,
      qtyInput: addQty,
    });
  }
  item._tempScanQty = null;
  updateBatchTrolleyUI();
  new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3")
    .play()
    .catch(() => {});
}
function clearBatchTrolley() {
  batchTrolley = [];
  updateBatchTrolleyUI();
}
function updateBatchTrolleyUI() {
  const container = document.getElementById("batchTrolleyInlineList");
  if (!container) return;
  if (batchTrolley.length === 0) {
    container.innerHTML = `<div class="py-12 text-center text-gray-400 font-medium text-sm bg-white/40 rounded-2xl border border-white border-dashed" id="txtTroliKosong">${currentLang === "zh" ? "手推车是空的。" : "Troli masih kosong."}</div>`;
    return;
  }

  container.innerHTML = batchTrolley
    .map(
      (b, idx) => `
    <div class="flex items-center justify-between p-4 bg-white/60 border border-white rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div class="text-left pr-2"><div class="flex items-center gap-2 mb-1"><span class="px-2 py-0.5 bg-gray-200 text-gray-700 font-bold text-[10px] rounded-full shadow-sm">${b.No_Rel}</span><span class="font-bold text-sm text-gray-900">${b.Part_Number}</span></div><div class="text-[10px] font-medium text-gray-500 uppercase">${b.nama_barang}</div><div class="text-[10px] font-medium text-blue-600 mt-1"><i class="fa-solid fa-boxes-stacked mr-1"></i> ${b.trolleyCount}x Troli &nbsp;|&nbsp; <span class="text-gray-600">Cust: ${b.Customer}</span></div></div>
      <div class="flex items-center gap-3"><div class="text-center"><label class="block text-[9px] font-medium uppercase text-gray-400 mb-0.5">Total Qty</label><input type="number" min="1" value="${b.qtyInput}" oninput="batchTrolley[${idx}].qtyInput = Number(this.value)" class="glass-input w-16 px-2 py-1 text-center font-bold text-sm rounded-xl outline-none text-gray-800" /></div><button onclick="batchTrolley.splice(${idx}, 1); updateBatchTrolleyUI();" class="w-8 h-8 rounded-full glass-btn text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"><i class="fa-solid fa-xmark"></i></button></div>
    </div>`,
    )
    .join("");
}

async function submitBatchTrolley(tipeAction) {
  if (!currentUser) return openLoginModal();
  if (batchTrolley.length === 0)
    return showToast(
      "warning",
      "Troli Kosong!",
      "Silakan scan barang terlebih dahulu.",
    );
  if (isProcessing) return;
  const invalidQty = batchTrolley.find(
    (b) => !b.qtyInput || Number(b.qtyInput) <= 0,
  );
  if (invalidQty)
    return showToast(
      "error",
      "Qty Tidak Valid",
      `Cek jumlah Qty untuk ${invalidQty.Part_Number}`,
    );
  const overrideCust =
    document.getElementById("batchSelectCustomer")?.value || "-";
  if (tipeAction === "OUT") {
    for (const item of batchTrolley) {
      const targetCust =
        overrideCust && overrideCust !== "-" ? overrideCust : item.Customer;
      if (!targetCust || targetCust === "-")
        return showToast(
          "warning",
          "Pilih Customer!",
          "Pilih Tujuan pada dropdown atas!",
        );
    }
  }
  isProcessing = true;
  swalUI.fire({
    title: "Memproses Troli...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    for (const item of batchTrolley) {
      const qty = Number(item.qtyInput);
      if (tipeAction === "IN") {
        await sendToBackend("apiSaveTransaksiMasuk", {
          partNumber: item.Part_Number,
          qty: qty,
          petugas: currentUser.username,
          catatan: `Batch Gun Masuk (${item.trolleyCount} Troli)`,
        });
      } else if (tipeAction === "OUT") {
        const targetCust =
          overrideCust && overrideCust !== "-" ? overrideCust : item.Customer;
        await sendToBackend("apiSaveTransaksiKeluar", {
          partNumber: item.Part_Number,
          qty: qty,
          petugas: currentUser.username,
          customer: targetCust,
          catatan: `Kirim ke: ${targetCust}`,
        });
      } else if (tipeAction === "ASSY_ADD") {
        await sendToBackend("apiUpdateAssyFsg", {
          partNumber: item.Part_Number,
          qty: qty,
          mode: "ADD",
          petugas: currentUser.username,
        });
      }
    }
    batchTrolley = [];
    updateBatchTrolleyUI();
    Swal.close();
    showToast(
      "success",
      "Troli Tersimpan!",
      "Semua transaksi berhasil dicatat.",
    );
    refreshAllData();
  } catch (err) {
    Swal.close();
    showToast("error", "Gagal Memproses", err.message);
  }
  isProcessing = false;
}

function startSmartScanner() {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  document.getElementById("smartReaderWrapper").classList.remove("hidden");
  document.getElementById("btnStartScan").classList.add("hidden");
  document.getElementById("btnStopScan").classList.remove("hidden");
  if (!codeReader) codeReader = new ZXing.BrowserMultiFormatReader();
  isCameraPaused = false;
  codeReader
    .decodeFromVideoDevice(null, "smartReaderVideo", (result, err) => {
      if (result && !isCameraPaused) {
        new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3")
          .play()
          .catch(() => {});
        processSmartScanCamera(result.getText());
      }
    })
    .catch((err) => {
      console.error(err);
    });
}
function stopSmartScanner() {
  if (codeReader) {
    codeReader.reset();
    codeReader = null;
  }
  document.getElementById("smartReaderWrapper").classList.add("hidden");
  document.getElementById("btnStartScan").classList.remove("hidden");
  document.getElementById("btnStopScan").classList.add("hidden");
}

function populateCustomerDropdown(selectEl, selectedVal = "-") {
  if (!selectEl) return;
  const isBatch = selectEl.id === "batchSelectCustomer";
  let html = `<option value="-">${isBatch ? "-- Sesuai Default Barang --" : "-- Pilih Customer --"}</option>`;
  (appData.customer || []).forEach((c) => {
    const val = c.nama_customer || c.id_customer;
    const label = c.nama_customer
      ? `${c.nama_customer} (${c.id_customer})`
      : c.id_customer;
    const isSel =
      String(val).toLowerCase() === String(selectedVal).toLowerCase() ||
      String(c.id_customer).toLowerCase() === String(selectedVal).toLowerCase()
        ? "selected"
        : "";
    html += `<option value="${val}" ${isSel}>${label}</option>`;
  });
  selectEl.innerHTML = html;
}

function handleChangeScannerCustomer(val) {
  const badge = document.getElementById("smInfoCustomer");
  if (badge) badge.innerText = "TUJUAN: " + (val && val !== "-" ? val : "-");
  if (activeScannedPart) {
    const matchingRow = appData.seatAssyControl.find(
      (item) =>
        item.Part_Number.toLowerCase() ===
          activeScannedPart.Part_Number.toLowerCase() &&
        item.Customer.toLowerCase() === String(val).toLowerCase(),
    );
    if (matchingRow) {
      activeScannedPart = matchingRow;
      document.getElementById("smInfoTarget").innerText = matchingRow.sisa_del;
    } else {
      document.getElementById("smInfoTarget").innerText = 0;
    }
  }
}

function processSmartScanCamera(scannedCode) {
  if (isCameraPaused) return;
  const code = scannedCode.trim(),
    parsed = parseYimmBarcode(code);
  const matchingRows = appData.seatAssyControl.filter(
    (item) =>
      item.Part_Number.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ===
        parsed.partNumberClean ||
      item.Part_Number.toLowerCase() === code.toLowerCase(),
  );
  if (matchingRows.length === 0) {
    showToast("error", "Tidak Dikenali", `Part tidak terdaftar.`);
    isCameraPaused = true;
    setTimeout(() => {
      isCameraPaused = false;
    }, 2000);
    return;
  }

  isCameraPaused = true;
  const foundData = matchingRows.find((r) => r.sisa_del > 0) || matchingRows[0];
  activeScannedPart = foundData;
  const custDisplay =
    foundData.Customer &&
    foundData.Customer !== "-" &&
    foundData.Customer !== "undefined"
      ? foundData.Customer
      : "-";
  populateCustomerDropdown(
    document.getElementById("smSelectCustomer"),
    custDisplay,
  );

  document.getElementById("smInfoCustomer").innerText =
    "TUJUAN: " + custDisplay;
  document.getElementById("smInfoRell").innerText = foundData.No_Rel;
  document.getElementById("smInfoPart").innerText = foundData.Part_Number;
  document.getElementById("smInfoNama").innerText = foundData.nama_barang;
  document.getElementById("smInfoStok").innerText = foundData.stock;
  document.getElementById("smInfoTarget").innerText = foundData.sisa_del;
  document.getElementById("smInfoAssy").innerText = foundData.assy_fsg;
  document.getElementById("smInputQty").value = parsed.qty;

  const btnWH = document.getElementById("btnGroupWH"),
    btnAssy = document.getElementById("btnGroupAssy"),
    wrapCust = document.getElementById("wrapperSelectCustomer");
  if (currentUser.role === "Admin") {
    btnWH.classList.remove("hidden");
    btnAssy.classList.remove("hidden");
    wrapCust.classList.remove("hidden");
  } else if (currentUser.role === "Produksi") {
    btnWH.classList.add("hidden");
    btnAssy.classList.remove("hidden");
    wrapCust.classList.add("hidden");
  } else {
    btnWH.classList.remove("hidden");
    btnAssy.classList.add("hidden");
    wrapCust.classList.remove("hidden");
  }
  document.getElementById("modalSmartAction").classList.remove("hidden");
}

function closeSmartAction() {
  document.getElementById("modalSmartAction").classList.add("hidden");
  activeScannedPart = null;
  setTimeout(() => {
    isCameraPaused = false;
  }, 1000);
}
function adjSmartQty(amt) {
  const input = document.getElementById("smInputQty");
  input.value = Math.max(1, (parseInt(input.value) || 0) + amt);
}

function submitSmartAction(tipeAction) {
  if (!activeScannedPart || !currentUser) return;
  const qty = parseInt(document.getElementById("smInputQty").value) || 0;
  if (qty <= 0) return showToast("error", "Error", "Jumlah harus > 0");
  isProcessing = true;
  if (tipeAction === "OUT") {
    const selectedCustomer =
      document.getElementById("smSelectCustomer")?.value ||
      activeScannedPart.Customer;
    if (!selectedCustomer || selectedCustomer === "-") {
      isProcessing = false;
      return showToast(
        "warning",
        "Pilih Customer!",
        "Pilih tujuan pengiriman terlebih dahulu.",
      );
    }
    swalUI.fire({
      title: "Menyimpan...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    sendToBackend("apiSaveTransaksiKeluar", {
      partNumber: activeScannedPart.Part_Number,
      qty,
      petugas: currentUser.username,
      customer: selectedCustomer,
      catatan: `Kirim ke: ${selectedCustomer}`,
    }).then((res) => {
      isProcessing = false;
      Swal.close();
      if (res.success) {
        closeSmartAction();
        refreshAllData();
        showToast("success", "Berhasil Keluar!");
      } else showToast("error", "Gagal", res.message);
    });
  } else if (tipeAction === "IN") {
    swalUI.fire({
      title: "Menyimpan...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    sendToBackend("apiSaveTransaksiMasuk", {
      partNumber: activeScannedPart.Part_Number,
      qty,
      petugas: currentUser.username,
      catatan: "Scan Kamera Masuk",
    }).then((res) => {
      isProcessing = false;
      Swal.close();
      if (res.success) {
        closeSmartAction();
        refreshAllData();
        showToast("success", "Berhasil Masuk!");
      } else showToast("error", "Gagal", res.message);
    });
  } else if (tipeAction === "ASSY_ADD") {
    swalUI.fire({
      title: "Menyimpan...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    sendToBackend("apiUpdateAssyFsg", {
      partNumber: activeScannedPart.Part_Number,
      qty: qty,
      mode: "ADD",
      petugas: currentUser.username,
    }).then((res) => {
      isProcessing = false;
      Swal.close();
      if (res.success) {
        closeSmartAction();
        refreshAllData();
        showToast("success", "Assy Ditambahkan!");
      } else showToast("error", "Gagal", res.message);
    });
  } else if (tipeAction === "ASSY_SET") {
    swalUI.fire({
      title: "Menyimpan...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    sendToBackend("apiUpdateAssyFsg", {
      partNumber: activeScannedPart.Part_Number,
      qty: qty,
      mode: "SET",
      petugas: currentUser.username,
    }).then((res) => {
      isProcessing = false;
      Swal.close();
      if (res.success) {
        closeSmartAction();
        refreshAllData();
        showToast("success", "Total Assy Disetel!");
      } else showToast("error", "Gagal", res.message);
    });
  }
}

function renderMasterBarangTable(keyword = "") {
  const tbody = document.getElementById("tblMasterBarangBody");
  if (!tbody) return;
  let dataset = appData.barang || [];
  if (keyword) {
    const kw = keyword.toLowerCase();
    dataset = dataset.filter(
      (b) =>
        String(b.Part_Number).toLowerCase().includes(kw) ||
        String(b.nama_barang).toLowerCase().includes(kw),
    );
  }
  if (dataset.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-gray-400" id="txtMemuatMaster">${currentLang === "zh" ? "找不到任何物品。" : "Tidak ada barang ditemukan."}</td></tr>`;
    return;
  }

  tbody.innerHTML = dataset
    .map((b) => {
      const isChecked = selectedForDelete.includes(String(b.Part_Number))
        ? "checked"
        : "";
      const namaBarang =
        b.nama_barang === null ||
        b.nama_barang === undefined ||
        String(b.nama_barang).toUpperCase() === "NULL"
          ? "-"
          : b.nama_barang;
      const stokValue =
        b.stok === null ||
        b.stok === undefined ||
        String(b.stok).toLowerCase() === "null"
          ? 0
          : b.stok;
      const noRel =
        b.No_Rel === null ||
        b.No_Rel === undefined ||
        String(b.No_Rel).toLowerCase() === "null"
          ? "-"
          : b.No_Rel;
      const satuan =
        b.satuan === null ||
        b.satuan === undefined ||
        String(b.satuan).toLowerCase() === "null"
          ? "Pcs"
          : b.satuan;
      return `<tr class="hover:bg-black/5 transition-colors bg-white/40"><td class="text-center"><input type="checkbox" class="chk-barang w-4 h-4 rounded text-blue-500 border-gray-300 focus:ring-blue-500 cursor-pointer" value="${b.Part_Number}" ${isChecked} onchange="toggleSingleBarang(this)"></td><td class="font-bold text-gray-900">${b.Part_Number}</td><td class="text-left font-medium text-gray-600 uppercase">${namaBarang}</td><td class="font-bold text-blue-600">${stokValue} <span class="text-[10px] text-gray-400 font-medium">${satuan}</span></td><td><span class="px-2.5 py-1 rounded-full bg-black/5 text-gray-700 font-medium text-xs">${noRel}</span></td><td class="text-right"><div class="flex items-center justify-end gap-1.5"><button onclick="editBarang('${b.Part_Number}')" class="w-8 h-8 rounded-full glass-btn text-gray-500 hover:text-blue-500 flex items-center justify-center" title="Edit Barang"><i class="fa-solid fa-pen text-xs"></i></button><button onclick="printBarcode('${b.Part_Number}', '${b.nama_barang}')" class="w-8 h-8 rounded-full glass-btn text-gray-500 hover:text-gray-900 flex items-center justify-center" title="Cetak Barcode"><i class="fa-solid fa-print text-xs"></i></button><button onclick="deleteBarang('${b.Part_Number}', '${b.nama_barang}')" class="w-8 h-8 rounded-full glass-btn text-gray-500 hover:text-red-500 flex items-center justify-center" title="Hapus Barang"><i class="fa-solid fa-trash-can text-xs"></i></button></div></td></tr>`;
    })
    .join("");
  const chkAll = document.getElementById("chkAllBarang");
  if (chkAll) {
    const allDisplayedParts = dataset.map((b) => String(b.Part_Number));
    const allChecked =
      allDisplayedParts.length > 0 &&
      allDisplayedParts.every((p) => selectedForDelete.includes(p));
    chkAll.checked = allChecked;
  }
  updateBulkDeleteUI();
}

function toggleSingleBarang(el) {
  const val = String(el.value);
  if (el.checked) {
    if (!selectedForDelete.includes(val)) selectedForDelete.push(val);
  } else {
    selectedForDelete = selectedForDelete.filter((p) => p !== val);
  }
  updateBulkDeleteUI();
}
function toggleAllBarang(el) {
  document.querySelectorAll(".chk-barang").forEach((chk) => {
    chk.checked = el.checked;
    const val = String(chk.value);
    if (el.checked) {
      if (!selectedForDelete.includes(val)) selectedForDelete.push(val);
    } else {
      selectedForDelete = selectedForDelete.filter((p) => p !== val);
    }
  });
  updateBulkDeleteUI();
}
function updateBulkDeleteUI() {
  const btnBulk = document.getElementById("btnBulkDeleteBarang"),
    lblCount = document.getElementById("lblCountDelete");
  if (selectedForDelete.length > 0) {
    btnBulk.classList.remove("hidden");
    btnBulk.classList.add("flex");
    lblCount.innerText = selectedForDelete.length;
  } else {
    btnBulk.classList.add("hidden");
    btnBulk.classList.remove("flex");
    lblCount.innerText = "0";
  }
}
function bulkDeleteBarang() {
  if (selectedForDelete.length === 0) return;
  swalUI
    .fire({
      title: currentLang === "zh" ? "批量删除？" : "Hapus Massal?",
      html:
        currentLang === "zh"
          ? `永久删除选定的 <b class="text-red-600">${selectedForDelete.length}</b> 个零件。`
          : `Menghapus permanen <b class="text-red-600">${selectedForDelete.length}</b> part terpilih dari database.`,
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "是的，删除" : "Ya, Hapus",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((result) => {
      if (result.isConfirmed) {
        isProcessing = true;
        swalUI.fire({
          title: currentLang === "zh" ? "删除中..." : "Menghapus...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        sendToBackend("apiBulkDeleteBarang", {
          partNumbers: selectedForDelete,
        }).then((res) => {
          isProcessing = false;
          Swal.close();
          if (res.success) {
            showToast("success", "Berhasil Dihapus!");
            selectedForDelete = [];
            document.getElementById("searchMasterBarang").value = "";
            refreshAllData();
          } else {
            showToast("error", "Gagal", res.message);
          }
        });
      }
    });
}

function printBarcode(partNumber, namaBarang) {
  const canvas = document.getElementById("hiddenBarcodeCanvas");
  JsBarcode(canvas, String(partNumber).trim(), {
    format: "CODE128",
    width: 2,
    height: 60,
    displayValue: true,
  });
  const printWindow = window.open("", "_blank", "width=400,height=400");
  printWindow.document.write(
    `<html><body style="text-align:center;font-family:sans-serif;padding-top:10px;"><b>${namaBarang}</b><br><img src="${canvas.toDataURL()}"></body></html>`,
  );
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}

function renderCustomerTable(keyword = "") {
  const tbody = document.getElementById("tblCustomerBody");
  if (!tbody) return;
  let dataset = appData.customer || [];
  if (keyword) {
    const kw = keyword.toLowerCase();
    dataset = dataset.filter(
      (c) =>
        String(c.id_customer).toLowerCase().includes(kw) ||
        String(c.nama_customer).toLowerCase().includes(kw),
    );
  }
  if (dataset.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-12 text-center text-gray-400">${currentLang === "zh" ? "找不到任何客户。" : "Tidak ada customer."}</td></tr>`;
    return;
  }
  tbody.innerHTML = dataset
    .map(
      (c) =>
        `<tr class="hover:bg-black/5 transition-colors bg-white/40"><td class="font-bold text-gray-900">${c.id_customer}</td><td class="text-left font-medium text-gray-700">${c.nama_customer}</td><td class="text-left text-gray-500">${c.alamat || "-"}</td><td class="text-right"><div class="flex items-center justify-end gap-1.5"><button onclick="editCustomer('${c.id_customer}')" class="w-8 h-8 rounded-full glass-btn text-gray-500 hover:text-blue-500 flex items-center justify-center"><i class="fa-solid fa-pen text-xs"></i></button><button onclick="deleteCustomer('${c.id_customer}', '${c.nama_customer}')" class="w-8 h-8 rounded-full glass-btn text-gray-500 hover:text-red-500 flex items-center justify-center"><i class="fa-solid fa-trash-can text-xs"></i></button></div></td></tr>`,
    )
    .join("");
}

function renderUsersTable(keyword = "") {
  const tbody = document.getElementById("tblUsersBody");
  if (!tbody) return;
  let usersList = (appData.users || []).filter(
    (u) => u.username !== "__SYSTEM_ROLLOVER__",
  );
  if (keyword) {
    const kw = keyword.toLowerCase();
    usersList = usersList.filter(
      (u) =>
        String(u.username).toLowerCase().includes(kw) ||
        String(u.role).toLowerCase().includes(kw),
    );
  }
  if (usersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="py-12 text-center text-gray-400">${currentLang === "zh" ? "找不到任何用户。" : "Tidak ada pengguna."}</td></tr>`;
    return;
  }
  tbody.innerHTML = usersList
    .map((u) => {
      let roleBadge = `<span class="px-3 py-1 rounded-full bg-black/5 text-gray-700 font-medium text-[10px] uppercase tracking-widest">${u.role}</span>`;
      if (u.role === "Admin")
        roleBadge = `<span class="px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 font-medium text-[10px] uppercase tracking-widest">${u.role}</span>`;
      if (u.role === "Produksi")
        roleBadge = `<span class="px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 font-medium text-[10px] uppercase tracking-widest">${u.role}</span>`;
      return `<tr class="hover:bg-black/5 transition-colors bg-white/40"><td class="font-bold text-gray-900">${u.username}</td><td>${roleBadge}</td><td class="text-right"><div class="flex items-center justify-end gap-1.5"><button onclick="editUser('${u.username}')" class="w-8 h-8 rounded-full glass-btn text-gray-500 hover:text-blue-500 flex items-center justify-center"><i class="fa-solid fa-pen text-xs"></i></button><button onclick="deleteUser('${u.username}')" class="w-8 h-8 rounded-full glass-btn text-gray-500 hover:text-red-500 flex items-center justify-center"><i class="fa-solid fa-trash-can text-xs"></i></button></div></td></tr>`;
    })
    .join("");
}

function renderRiwayatTable() {
  const tbody = document.getElementById("tblRiwayatBody");
  if (!tbody) return;
  const fTipe = document.getElementById("filterRiwayat")?.value || "ALL";
  const fBulan = document.getElementById("filterBulanRiwayat")?.value || "";
  let logs = [];
  const isMatchMonth = (dateStr) => {
    if (!fBulan) return true;
    const d = new Date(dateStr);
    return (
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") ===
      fBulan
    );
  };

  if (fTipe === "ALL" || fTipe === "IN") {
    appData.masuk.forEach((m) => {
      if (isMatchMonth(m.tanggal || m.created_at)) {
        logs.push({
          waktu: new Date(m.tanggal || m.created_at),
          tipe: "IN",
          part: m.Part_Number,
          qty: m.qty,
          petugas: m.petugas,
          catatan: m.catatan,
        });
      }
    });
  }
  if (fTipe === "ALL" || fTipe === "OUT") {
    appData.keluar.forEach((k) => {
      if (isMatchMonth(k.tanggal || k.created_at)) {
        logs.push({
          waktu: new Date(k.tanggal || k.created_at),
          tipe: "OUT",
          part: k.Part_Number,
          qty: k.qty,
          petugas: k.petugas,
          catatan: k.catatan,
        });
      }
    });
  }
  logs.sort((a, b) => b.waktu - a.waktu);

  tbody.innerHTML =
    logs.length === 0
      ? `<tr><td colspan="6" class="py-12 text-center text-gray-400" id="txtMemuatRiwayat">${currentLang === "zh" ? "找不到任何交易记录。" : "Belum ada riwayat transaksi."}</td></tr>`
      : logs
          .map((r) => {
            let isTarget = r.catatan && String(r.catatan).includes("QTY/DAY");
            let displayQty = r.qty,
              color = "text-gray-900",
              bgTipe = "bg-black/5 text-gray-600";
            if (isTarget) {
              displayQty = r.qty > 0 ? `+${r.qty}` : `${r.qty}`;
              color =
                r.qty > 0
                  ? "text-blue-500 font-bold text-base"
                  : "text-amber-500 font-bold text-base";
              bgTipe = "bg-blue-500/10 text-blue-700 border border-blue-500/20";
            } else if (r.tipe === "IN") {
              displayQty = r.qty > 0 ? `+${r.qty}` : `${r.qty}`;
              color = r.qty > 0 ? "text-green-500" : "text-red-500";
              bgTipe =
                "bg-green-500/10 text-green-700 border border-green-500/20";
            } else {
              displayQty = r.qty > 0 ? `-${r.qty}` : `+${Math.abs(r.qty)}`;
              color = r.qty > 0 ? "text-red-500" : "text-green-500";
              bgTipe = "bg-red-500/10 text-red-700 border border-red-500/20";
            }

            return `<tr class="hover:bg-black/5 transition-colors bg-white/40">
      <td class="text-xs font-medium text-gray-500">${r.waktu.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
      <td class="text-center"><span class="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase ${bgTipe}">${isTarget ? "TARGET" : r.tipe}</span></td>
      <td class="font-bold text-gray-900">${r.part}</td>
      <td class="text-center font-bold text-base ${color}">${displayQty}</td>
      <td class="text-xs font-medium uppercase text-gray-600">${r.petugas || "-"}</td>
      <td class="text-xs font-medium text-gray-500">${r.catatan || "-"}</td>
    </tr>`;
          })
          .join("");
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      document.body.classList.toggle("is-fullscreen-fallback");
      handleFullscreenUI(
        document.body.classList.contains("is-fullscreen-fallback"),
      );
    });
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

function handleFullscreenUI(isFull) {
  const btn = document.getElementById("btnFullscreen"),
    sb = document.getElementById("mainSidebar"),
    main = document.querySelector("main");

  if (isFull) {
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-compress text-sm"></i>';
      btn.title = "Keluar Layar Penuh";
    }
    // Sembunyikan sidebar saat mode full tabel
    if (sb) sb.classList.add("hidden");
    if (main) {
      main.classList.remove("pl-[68px]", "pl-[260px]");
      main.classList.add("!pl-0");
    }
  } else {
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-expand text-sm"></i>';
      btn.title = "Layar Penuh";
    }
    // Munculkan kembali sidebar saat keluar mode full
    if (sb) sb.classList.remove("hidden");
    if (main) {
      const isPinned = sb && sb.classList.contains("sidebar-pinned");
      main.classList.remove("!pl-0");
      main.classList.add(isPinned ? "pl-[260px]" : "pl-[68px]");
    }
  }
}

document.addEventListener("fullscreenchange", () => {
  handleFullscreenUI(Boolean(document.fullscreenElement));
});

function exportToExcel(tipe) {
  if (typeof XLSX === "undefined")
    return showToast(
      "error",
      "Library Excel Belum Siap",
      "Silakan tunggu sebentar lalu coba lagi.",
    );
  let dataToExport = [],
    filename = "";
  const dateStr = new Date().toISOString().split("T")[0];
  if (tipe === "PapanKontrol") {
    const keyword =
      document.getElementById("globalSearchInput")?.value.toLowerCase() || "";
    let dataset = appData.seatAssyControl || [];
    if (keyword)
      dataset = dataset.filter(
        (d) =>
          String(d.Part_Number).toLowerCase().includes(keyword) ||
          String(d.No_Rel).toLowerCase().includes(keyword) ||
          String(d.Customer).toLowerCase().includes(keyword),
      );
    dataset.sort((a, b) => {
      if (a.Customer < b.Customer) return -1;
      if (a.Customer > b.Customer) return 1;
      if (a.No_Rel < b.No_Rel) return -1;
      if (a.No_Rel > b.No_Rel) return 1;
      return 0;
    });
    dataToExport = dataset.map((item) => ({
      Customer: item.Customer,
      "No Rel Rak": item.No_Rel,
      "Part Number": item.Part_Number,
      "Nama Barang": item.nama_barang,
      "Stock Master (Pcs)": item.stock,
      "Target Qty/Day (Pcs)": item.qty_day,
      "Terkirim Qty/Out (Pcs)": item.qty_out,
      "Sisa Delivery (Pcs)": item.sisa_del,
      "Stok Assy / FSG (Pcs)": item.assy_fsg,
      "Varians Status": item.variance,
    }));
    filename = "Laporan_Papan_Kontrol_" + dateStr + ".xlsx";
  } else if (tipe === "Riwayat") {
    const filterTipe = document.getElementById("filterRiwayat")?.value || "ALL",
      filterBulan = document.getElementById("filterBulanRiwayat")?.value || "";
    const isMatchMonth = (dateString) => {
      if (!filterBulan) return true;
      const d = new Date(dateString);
      return (
        d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") ===
        filterBulan
      );
    };
    let logs = [];
    if (filterTipe === "ALL" || filterTipe === "IN")
      appData.masuk.forEach((m) => {
        if (isMatchMonth(m.tanggal || m.created_at))
          logs.push({
            Waktu: new Date(m.tanggal || m.created_at),
            Tipe: "MASUK (IN)",
            Part_Number: m.Part_Number,
            Qty: m.qty,
            Petugas: m.petugas,
            Catatan: m.catatan,
          });
      });
    if (filterTipe === "ALL" || filterTipe === "OUT")
      appData.keluar.forEach((k) => {
        if (isMatchMonth(k.tanggal || k.created_at))
          logs.push({
            Waktu: new Date(k.tanggal || k.created_at),
            Tipe: "KELUAR (OUT)",
            Part_Number: k.Part_Number,
            Qty: k.qty,
            Petugas: k.petugas,
            Catatan: k.catatan,
          });
      });
    logs.sort((a, b) => b.Waktu - a.Waktu);
    dataToExport = logs.map((r) => ({
      "Waktu Transaksi": r.Waktu.toLocaleString("id-ID"),
      "Tipe Transaksi": r.Tipe,
      "Part Number": r.Part_Number,
      "Qty (Pcs)": r.Qty,
      Petugas: r.Petugas,
      "Keterangan / Tujuan": r.Catatan || "-",
    }));
    filename =
      "Laporan_Riwayat_Transaksi_" +
      (filterBulan ? filterBulan : dateStr) +
      ".xlsx";
  }
  if (dataToExport.length === 0)
    return showToast(
      "warning",
      "Data Kosong",
      "Tidak ada data untuk diekspor.",
    );
  const worksheet = XLSX.utils.json_to_sheet(dataToExport),
    workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, filename);
  showToast("success", "Diunduh", filename);
}

function openModalBarang() {
  currentEditPart = null;
  populateCustomerDropdown(document.getElementById("mbCustomer"), "-");
  document.getElementById("mbPartNumber").readOnly = false;
  document.getElementById("modalMasterBarangTitle").innerText =
    currentLang === "zh" ? "新增零件" : "Part Baru";
  document.getElementById("formMasterBarang").reset();
  document.getElementById("modalMasterBarang").classList.remove("hidden");
}
function closeModalBarang() {
  document.getElementById("modalMasterBarang").classList.add("hidden");
  document.getElementById("formMasterBarang").reset();
  currentEditPart = null;
}
function editBarang(partNum) {
  const barang = appData.barang.find(
    (b) => String(b.Part_Number) === String(partNum),
  );
  if (!barang) return showToast("error", "Data tidak ditemukan");
  currentEditPart = partNum;
  document.getElementById("modalMasterBarangTitle").innerText =
    currentLang === "zh" ? "编辑零件" : "Edit Part";
  document.getElementById("mbPartNumber").value = barang.Part_Number;
  document.getElementById("mbNamaBarang").value = barang.nama_barang || "";
  document.getElementById("mbKategori").value = barang.kategori || "";
  document.getElementById("mbSatuan").value = barang.satuan || "Pcs";
  document.getElementById("mbStdPack").value = barang.standar_packing || 1;
  document.getElementById("mbStok").value = barang.stok || 0;
  document.getElementById("mbStokMin").value = barang.stok_minimum || 10;
  document.getElementById("mbNoRel").value = barang.No_Rel || "";
  const relatedOrders = appData.orders.filter(
    (o) => String(o.Part_Number).trim() === String(partNum),
  );
  let custRaw = "-";
  if (
    relatedOrders.length > 0 &&
    relatedOrders[0].id_customer &&
    String(relatedOrders[0].id_customer) !== "undefined"
  )
    custRaw = relatedOrders[0].id_customer;
  else if (barang.id_customer) custRaw = barang.id_customer;
  else if (localStorage.getItem("cust_map_" + partNum))
    custRaw = localStorage.getItem("cust_map_" + partNum);
  populateCustomerDropdown(
    document.getElementById("mbCustomer"),
    resolveCustomerDisplay(custRaw),
  );
  document.getElementById("modalMasterBarang").classList.remove("hidden");
}
function handleSaveBarang(e) {
  e.preventDefault();
  if (isProcessing) return;
  isProcessing = true;
  const payload = {
    isEdit: currentEditPart !== null,
    oldPartNumber: currentEditPart,
    customer: document.getElementById("mbCustomer")?.value || "-",
    item: {
      Part_Number: document.getElementById("mbPartNumber").value.trim(),
      nama_barang: document.getElementById("mbNamaBarang").value.trim(),
      kategori: document.getElementById("mbKategori").value.trim(),
      satuan: document.getElementById("mbSatuan").value.trim(),
      standar_packing: document.getElementById("mbStdPack").value,
      stok: document.getElementById("mbStok").value,
      stok_minimum: document.getElementById("mbStokMin").value,
      No_Rel: document.getElementById("mbNoRel").value.trim(),
    },
  };
  swalUI.fire({
    title: "Menyimpan...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  sendToBackend("apiSaveBarang", payload).then((res) => {
    isProcessing = false;
    Swal.close();
    if (res.success) {
      closeModalBarang();
      refreshAllData();
      showToast("success", res.message);
    } else showToast("error", "Gagal Menyimpan", res.message);
  });
}

function openModalCustomer() {
  currentEditCustomer = null;
  document.getElementById("mcId").readOnly = false;
  document.getElementById("modalMasterCustomerTitle").innerText =
    currentLang === "zh" ? "新增客户" : "Customer Baru";
  document.getElementById("formMasterCustomer").reset();
  document.getElementById("modalMasterCustomer").classList.remove("hidden");
}
function closeModalCustomer() {
  document.getElementById("modalMasterCustomer").classList.add("hidden");
  document.getElementById("formMasterCustomer").reset();
  currentEditCustomer = null;
}
function editCustomer(idCust) {
  const cust = appData.customer.find(
    (c) => String(c.id_customer) === String(idCust),
  );
  if (!cust) return showToast("error", "Data tidak ditemukan");
  currentEditCustomer = idCust;
  document.getElementById("modalMasterCustomerTitle").innerText =
    currentLang === "zh" ? "编辑客户" : "Edit Customer";
  document.getElementById("mcId").value = cust.id_customer;
  document.getElementById("mcId").readOnly = true;
  document.getElementById("mcNama").value = cust.nama_customer || "";
  document.getElementById("mcKontak").value = cust.kontak || "";
  document.getElementById("mcAlamat").value = cust.alamat || "";
  document.getElementById("modalMasterCustomer").classList.remove("hidden");
}
function handleSaveCustomer(e) {
  e.preventDefault();
  if (isProcessing) return;
  isProcessing = true;
  const payload = {
    isEdit: currentEditCustomer !== null,
    oldIdCustomer: currentEditCustomer,
    cust: {
      id_customer: document.getElementById("mcId").value.trim(),
      nama_customer: document.getElementById("mcNama").value.trim(),
      kontak: document.getElementById("mcKontak").value.trim(),
      alamat: document.getElementById("mcAlamat").value.trim(),
    },
  };
  swalUI.fire({
    title: "Menyimpan...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  sendToBackend("apiSaveCustomer", payload).then((res) => {
    isProcessing = false;
    Swal.close();
    if (res.success) {
      closeModalCustomer();
      refreshAllData();
      showToast("success", res.message);
    } else showToast("error", "Gagal Menyimpan", res.message);
  });
}

function openModalUser() {
  currentEditUser = null;
  document.getElementById("muUsername").readOnly = false;
  document.getElementById("modalMasterUserTitle").innerText =
    currentLang === "zh" ? "新增账号" : "Akun Baru";
  document.getElementById("formMasterUser").reset();
  document.getElementById("modalMasterUser").classList.remove("hidden");
}
function closeModalUser() {
  document.getElementById("modalMasterUser").classList.add("hidden");
  document.getElementById("formMasterUser").reset();
  currentEditUser = null;
}
function editUser(username) {
  const usr = appData.users.find(
    (u) => String(u.username) === String(username),
  );
  if (!usr) return showToast("error", "User tidak ditemukan");
  currentEditUser = username;
  document.getElementById("modalMasterUserTitle").innerText =
    currentLang === "zh" ? "编辑账号" : "Edit Akun";
  document.getElementById("muUsername").value = usr.username;
  document.getElementById("muUsername").readOnly = true;
  document.getElementById("muPassword").value = usr.password || "";
  document.getElementById("muRole").value = usr.role || "Warehouse";
  document.getElementById("modalMasterUser").classList.remove("hidden");
}
function handleSaveUser(e) {
  e.preventDefault();
  if (isProcessing) return;
  isProcessing = true;
  const payload = {
    isEdit: currentEditUser !== null,
    oldUsername: currentEditUser,
    userData: {
      username: document.getElementById("muUsername").value.trim(),
      password: document.getElementById("muPassword").value.trim(),
      role: document.getElementById("muRole").value,
    },
  };
  swalUI.fire({
    title: "Menyimpan...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  sendToBackend("apiSaveUser", payload).then((res) => {
    isProcessing = false;
    Swal.close();
    if (res.success) {
      closeModalUser();
      refreshAllData();
      showToast("success", res.message);
    } else showToast("error", "Gagal Menyimpan", res.message);
  });
}

function openLoginModal() {
  document.getElementById("modalLogin").classList.remove("hidden");
}
function closeLoginModal() {
  document.getElementById("modalLogin").classList.add("hidden");
}
function logoutAction() {
  swalUI
    .fire({
      title: currentLang === "zh" ? "退出工作区？" : "Keluar Workspace?",
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "退出" : "Keluar",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((res) => {
      if (res.isConfirmed) {
        currentUser = null;
        sessionStorage.removeItem("sim_inventory_user");
        localStorage.removeItem("sim_inventory_user");
        applyRbacUI();
        switchTab("overview");
        showToast("info", "Sesi Berakhir");
      }
    });
}

function handleLoginSubmit(e) {
  e.preventDefault();
  swalUI.fire({
    title: currentLang === "zh" ? "验证中..." : "Otentikasi...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  sendToBackend("apiLogin", {
    username: document.getElementById("loginUsername").value.trim(),
    password: document.getElementById("loginPassword").value.trim(),
  })
    .then((res) => {
      Swal.close();
      if (res.success) {
        currentUser = res.user;
        sessionStorage.setItem(
          "sim_inventory_user",
          JSON.stringify(currentUser),
        );
        localStorage.setItem("sim_inventory_user", JSON.stringify(currentUser));
        applyRbacUI();
        closeLoginModal();
        switchTab("scanner");
        showToast(
          "success",
          currentLang === "zh"
            ? `工作愉快, ${currentUser.username}`
            : `Selamat bekerja, ${currentUser.username}`,
        );
      } else
        showToast(
          "error",
          currentLang === "zh" ? "拒绝访问" : "Gagal Login",
          res.message,
        );
    })
    .catch((err) => {
      Swal.close();
      showToast("error", "Sistem Error", err.message);
    });
}

function deleteBarang(partNumber, namaBarang) {
  swalUI
    .fire({
      title: currentLang === "zh" ? "确认删除？" : "Hapus Barang?",
      html:
        currentLang === "zh"
          ? `永久删除零件 <b>${partNumber}</b>。`
          : `Menghapus permanen part <b>${partNumber}</b> dari database.`,
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "是的，删除" : "Ya, Hapus",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((result) => {
      if (result.isConfirmed) {
        isProcessing = true;
        swalUI.fire({
          title: currentLang === "zh" ? "删除中..." : "Menghapus...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        sendToBackend("apiDeleteBarang", { partNumber: partNumber }).then(
          (res) => {
            isProcessing = false;
            Swal.close();
            if (res.success) {
              showToast("success", "Berhasil Dihapus!");
              refreshAllData();
            } else {
              showToast("error", "Gagal", res.message);
            }
          },
        );
      }
    });
}

function deleteCustomer(idCust, namaCust) {
  swalUI
    .fire({
      title: currentLang === "zh" ? "确认删除？" : "Hapus Customer?",
      html:
        currentLang === "zh"
          ? `永久删除客户 <b>${idCust}</b>。`
          : `Menghapus permanen customer <b>${idCust}</b> dari database.`,
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "是的，删除" : "Ya, Hapus",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((result) => {
      if (result.isConfirmed) {
        isProcessing = true;
        swalUI.fire({
          title: currentLang === "zh" ? "删除中..." : "Menghapus...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        sendToBackend("apiDeleteCustomer", { id_customer: idCust }).then(
          (res) => {
            isProcessing = false;
            Swal.close();
            if (res.success) {
              showToast("success", "Berhasil Dihapus!");
              refreshAllData();
            } else {
              showToast("error", "Gagal", res.message);
            }
          },
        );
      }
    });
}

function deleteUser(username) {
  if (currentUser && currentUser.username === username)
    return showToast(
      "warning",
      "Ditolak",
      currentLang === "zh"
        ? "无法删除当前登录的账号。"
        : "Tidak bisa menghapus akun yang sedang digunakan.",
    );
  swalUI
    .fire({
      title: currentLang === "zh" ? "确认删除？" : "Hapus Akun?",
      html:
        currentLang === "zh"
          ? `永久删除账号 <b>${username}</b>。`
          : `Menghapus permanen akun <b>${username}</b> dari database.`,
      showCancelButton: true,
      confirmButtonText: currentLang === "zh" ? "是的，删除" : "Ya, Hapus",
      cancelButtonText: currentLang === "zh" ? "取消" : "Batal",
    })
    .then((result) => {
      if (result.isConfirmed) {
        isProcessing = true;
        swalUI.fire({
          title: currentLang === "zh" ? "删除中..." : "Menghapus...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        sendToBackend("apiDeleteUser", { usernameTarget: username }).then(
          (res) => {
            isProcessing = false;
            Swal.close();
            if (res.success) {
              showToast("success", "Berhasil Dihapus!");
              refreshAllData();
            } else {
              showToast("error", "Gagal", res.message);
            }
          },
        );
      }
    });
}
