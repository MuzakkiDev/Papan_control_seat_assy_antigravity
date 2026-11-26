/**
 * =========================================================================
 * SIM-INVENTORY BACKEND - GOOGLE APPS SCRIPT (GAS)
 * Database Engine: Google Sheets
 * =========================================================================
 * 
 * PANDUAN DEPLOY SEBAGAI WEB APP:
 * 1. Buka Google Spreadsheet baru (atau gunakan spreadsheet yang ada).
 * 2. Klik menu 'Ekstensi' > 'Apps Script'.
 * 3. Hapus kode bawaan dan salin (paste) SELURUH isi file ini ke 'Code.gs'.
 * 4. (Opsional) Jalankan fungsi 'setupDatabase()' di editor Apps Script satu kali
 *    untuk membuat tab tabel dan data default secara otomatis.
 * 5. Klik tombol 'Deploy' (Terapkan) di kanan atas > 'Deploy baru' (New deployment).
 * 6. Pilih jenis: 'Aplikasi Web' (Web app).
 * 7. Konfigurasi:
 *    - Deskripsi: SIM-INVENTORY API
 *    - Jalankan sebagai: 'Saya' (Me / akun Google Anda)
 *    - Yang memiliki akses: 'Siapa saja' (Anyone)  <-- PENTING!
 * 8. Klik 'Deploy', izinkan akses (Authorize Access).
 * 9. Salin "URL Aplikasi Web" (akhiran /exec) dan masukkan ke 'script.js'
 *    pada variabel 'GAS_WEBAPP_URL'.
 * =========================================================================
 */

// KOSONGKAN jika script ini terpasang langsung di dalam Google Spreadsheet (menu Ekstensi > Apps Script).
// ISI HANYA JIKA script dibuat terpisah (standalone) di script.google.com.
const SPREADSHEET_ID = "";

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Handle GET Requests (Health check atau load data dasar)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "apiGetMasterData";
  var payload = (e && e.parameter) ? e.parameter : {};
  var result = handleAction(action, payload);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST Requests dari Frontend
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Kunci proses hingga 30 detik untuk mencegah race condition (bentrok input bersamaan)
    lock.waitLock(30000);

    var req = {};
    if (e && e.postData && e.postData.contents) {
      req = JSON.parse(e.postData.contents);
    }
    var action = req.action || "";
    var payload = req.payload || {};

    var result = handleAction(action, payload);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Router Aksi Backend
 */
function handleAction(action, payload) {
  initSheetsIfMissing();

  switch (action) {
    case "apiGetMasterData":
      return apiGetMasterData();

    case "apiLogin":
      return apiLogin(payload);

    case "apiDailyRollover":
      return apiDailyRollover(payload);

    case "apiSaveTransaksiKeluar":
      return apiSaveTransaksiKeluar(payload);

    case "apiSaveTransaksiMasuk":
      return apiSaveTransaksiMasuk(payload);

    case "apiUpdateStokUtama":
      return apiUpdateStokUtama(payload);

    case "apiUpdateAssyFsg":
      return apiUpdateAssyFsg(payload);

    case "apiUpdateQtyDay":
      return apiUpdateQtyDay(payload);

    case "apiUpdateCustomerPart":
      return apiUpdateCustomerPart(payload);

    case "apiSaveBarang":
      return apiSaveBarang(payload);

    case "apiSaveCustomer":
      return apiSaveCustomer(payload);

    case "apiSaveUser":
      return apiSaveUser(payload);

    case "apiDeleteBarang":
      return apiDeleteBarang(payload);

    case "apiBulkDeleteBarang":
      return apiBulkDeleteBarang(payload);

    case "apiDeleteCustomer":
      return apiDeleteCustomer(payload);

    case "apiDeleteUser":
      return apiDeleteUser(payload);

    default:
      return { success: false, message: "Aksi tidak dikenal: " + action };
  }
}

// =========================================================================
// IMPLEMENTASI SETIAP AKSI BACKEND
// =========================================================================

function apiGetMasterData() {
  checkAndRunDailyRollover(false);

  var barang = getTableRows("Master_Barang");
  var customer = getTableRows("Master_Customer");
  var orders = getTableRows("List_Order");
  var masuk = getTableRows("Transaksi_Masuk");
  var keluar = getTableRows("Transaksi_Keluar");
  var users = getTableRows("Users");

  return {
    success: true,
    barang: barang,
    customer: customer,
    orders: orders,
    masuk: masuk,
    keluar: keluar,
    users: users
  };
}

function apiLogin(payload) {
  var username = String(payload.username || "").trim();
  var password = String(payload.password || "").trim();

  if (username === "superadmin" && password === "admin123") {
    return {
      success: true,
      user: { username: "SuperAdmin", role: "Admin" }
    };
  }

  var users = getTableRows("Users");
  var realUsers = users.filter(function(u) {
    return u.username !== "__SYSTEM_ROLLOVER__";
  });

  // Jika belum ada user terdaftar dan mencoba login 'admin', buat otomatis
  if (realUsers.length === 0 && username.toLowerCase() === "admin") {
    var defaultUser = { id: generateId(), username: "admin", password: "admin", role: "Admin" };
    appendTableRow("Users", defaultUser);
    return { success: true, user: { username: "admin", role: "Admin" } };
  }

  var foundUser = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).toLowerCase() === username.toLowerCase()) {
      foundUser = users[i];
      break;
    }
  }

  if (!foundUser) {
    return { success: false, message: "Akun '" + username + "' belum terdaftar di sistem!" };
  }

  if (String(foundUser.password) === password && foundUser.username !== "__SYSTEM_ROLLOVER__") {
    return { success: true, user: foundUser };
  } else {
    return { success: false, message: "Password salah!" };
  }
}

function apiDailyRollover(payload) {
  var isForce = payload.isForce === true;
  var opKey = payload.opKey || "";
  var res = checkAndRunDailyRollover(isForce, opKey);
  return { success: true, ...res };
}

function checkAndRunDailyRollover(isForce, opKey) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { rolloverPerformed: false, opKey: opKey || "" };
  }
  try {
    var ss = getSpreadsheet();
    var tz = ss.getSpreadsheetTimeZone() || "Asia/Jakarta";
    if (!opKey) {
      var now = new Date();
      var opDate = new Date(now.getTime());
      var hourNow = Number(Utilities.formatDate(now, tz, "HH"));
      if (hourNow < 8) {
        opDate.setDate(opDate.getDate() - 1);
      }
      opKey = Utilities.formatDate(opDate, tz, "yyyy-MM-dd");
    }

    var users = getTableRows("Users");
    var markerIndex = -1;
    var markerUser = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === "__SYSTEM_ROLLOVER__") {
        markerUser = users[i];
        markerIndex = i;
        break;
      }
    }

    if (!markerUser) {
      appendTableRow("Users", {
        id: "sys_rollover",
        username: "__SYSTEM_ROLLOVER__",
        password: "DAY_" + opKey,
        role: "SYSTEM"
      });
      return { rolloverPerformed: false, opKey: opKey };
    }

    var storedDate = "";
    if (markerUser.password) {
      var pwdStr = String(markerUser.password);
      if (pwdStr.indexOf("DAY_") === 0) {
        storedDate = pwdStr.split("|")[0].replace("DAY_", "").trim();
      } else {
        try {
          storedDate = Utilities.formatDate(new Date(pwdStr), tz, "yyyy-MM-dd");
        } catch (e) {
          storedDate = pwdStr.trim();
        }
      }
    }

    if (storedDate === opKey && !isForce) {
      return { rolloverPerformed: false, opKey: opKey };
    }

    if (isForce || storedDate !== opKey) {
      var barang = getTableRows("Master_Barang");
      var orders = getTableRows("List_Order");

      for (var b = 0; b < barang.length; b++) {
        var item = barang[b];
        var partNum = String(item.Part_Number || "").trim();
        var totalQtyDay = 0;

        for (var o = 0; o < orders.length; o++) {
          if (String(orders[o].Part_Number || "").trim() === partNum) {
            totalQtyDay += (Number(orders[o].qty_order) || 0);
          }
        }

        var currentStok = Number(item.stok) || 0;
        var currentAssy = Number(item.assy_fsg) || 0;
        var newOpeningStock = currentStok + currentAssy - totalQtyDay;

        item.stok = newOpeningStock;
        item.assy_fsg = 0;
      }
      saveTableRows("Master_Barang", barang);

      for (var o2 = 0; o2 < orders.length; o2++) {
        orders[o2].qty_order = 0;
      }
      saveTableRows("List_Order", orders);

      markerUser.password = isForce ? ("DAY_" + opKey + "|" + new Date().toISOString()) : ("DAY_" + opKey);
      saveTableRows("Users", users);

      return { rolloverPerformed: true, opKey: opKey };
    }

    return { rolloverPerformed: false, opKey: opKey };
  } finally {
    lock.releaseLock();
  }
}

function apiSaveTransaksiKeluar(payload) {
  var partNumber = String(payload.partNumber || "").trim();
  var qty = Number(payload.qty) || 0;
  var petugas = String(payload.petugas || "");
  var customer = String(payload.customer || "").trim();
  var catatan = String(payload.catatan || "");

  if (customer && customer !== "-") {
    var orders = getTableRows("List_Order");
    var existingSameCust = null;
    var emptySlotIndex = -1;

    for (var i = 0; i < orders.length; i++) {
      if (String(orders[i].Part_Number || "").trim() === partNumber) {
        if (String(orders[i].id_customer || "").toLowerCase() === customer.toLowerCase()) {
          existingSameCust = orders[i];
          break;
        }
        if ((!orders[i].id_customer || orders[i].id_customer === "-" || orders[i].id_customer === "undefined") && emptySlotIndex === -1) {
          emptySlotIndex = i;
        }
      }
    }

    if (!existingSameCust) {
      if (emptySlotIndex !== -1) {
        orders[emptySlotIndex].id_customer = customer;
      } else {
        orders.push({
          id: generateId(),
          Part_Number: partNumber,
          qty_order: 0,
          id_customer: customer
        });
      }
      saveTableRows("List_Order", orders);
    }
  }

  appendTableRow("Transaksi_Keluar", {
    id: generateId(),
    tanggal: new Date().toISOString(),
    Part_Number: partNumber,
    qty: qty,
    petugas: petugas,
    catatan: catatan
  });

  return { success: true };
}

function apiSaveTransaksiMasuk(payload) {
  var partNumber = String(payload.partNumber || "").trim();
  var qty = Number(payload.qty) || 0;
  var petugas = String(payload.petugas || "");
  var catatan = String(payload.catatan || "");

  var barang = getTableRows("Master_Barang");
  for (var i = 0; i < barang.length; i++) {
    if (String(barang[i].Part_Number || "").trim() === partNumber) {
      barang[i].stok = (Number(barang[i].stok) || 0) + qty;
      break;
    }
  }
  saveTableRows("Master_Barang", barang);

  appendTableRow("Transaksi_Masuk", {
    id: generateId(),
    tanggal: new Date().toISOString(),
    Part_Number: partNumber,
    qty: qty,
    petugas: petugas,
    catatan: catatan
  });

  return { success: true };
}

function apiUpdateStokUtama(payload) {
  var partNumber = String(payload.partNumber || "").trim();
  var newQty = Number(payload.qty) || 0;
  var petugas = String(payload.petugas || "");

  var barang = getTableRows("Master_Barang");
  var diffStok = 0;
  var found = false;

  for (var i = 0; i < barang.length; i++) {
    if (String(barang[i].Part_Number || "").trim() === partNumber) {
      var currentStok = Number(barang[i].stok) || 0;
      diffStok = newQty - currentStok;
      barang[i].stok = newQty;
      found = true;
      break;
    }
  }

  if (found) {
    saveTableRows("Master_Barang", barang);
    if (diffStok !== 0 && petugas) {
      appendTableRow("Transaksi_Masuk", {
        id: generateId(),
        tanggal: new Date().toISOString(),
        Part_Number: partNumber,
        qty: diffStok,
        petugas: petugas,
        catatan: diffStok > 0 ? "Koreksi Manual Stok Utama (Penambahan)" : "Koreksi Manual Stok Utama (Pengurangan)"
      });
    }
    return { success: true };
  }

  return { success: false, message: "Part Number tidak ditemukan" };
}

function apiUpdateAssyFsg(payload) {
  var partNumber = String(payload.partNumber || "").trim();
  var qtyInput = Number(payload.qty) || 0;
  var mode = payload.mode || "ADD";
  var petugas = String(payload.petugas || "");

  var barang = getTableRows("Master_Barang");
  var diffAssy = 0;
  var found = false;

  for (var i = 0; i < barang.length; i++) {
    if (String(barang[i].Part_Number || "").trim() === partNumber) {
      var currentAssy = Number(barang[i].assy_fsg) || 0;
      var finalAssy = currentAssy;

      if (mode === "ADD") {
        diffAssy = qtyInput;
        finalAssy = currentAssy + diffAssy;
      } else if (mode === "SET") {
        finalAssy = qtyInput;
        diffAssy = finalAssy - currentAssy;
      }

      barang[i].assy_fsg = finalAssy;
      found = true;
      break;
    }
  }

  if (found) {
    saveTableRows("Master_Barang", barang);
    if (diffAssy !== 0 && petugas) {
      appendTableRow("Transaksi_Masuk", {
        id: generateId(),
        tanggal: new Date().toISOString(),
        Part_Number: partNumber,
        qty: diffAssy,
        petugas: petugas,
        catatan: diffAssy > 0 ? "Masuk Gudang FSG (Hasil Assy)" : "Koreksi Pengurangan Stok Assy"
      });
    }
    return { success: true };
  }

  return { success: false, message: "Part Number tidak ditemukan" };
}

function apiUpdateQtyDay(payload) {
  var partNumber = String(payload.partNumber || "").trim();
  var custTarget = String(payload.customer || "").trim();
  var qty = Number(payload.qty) || 0;
  var diff = Number(payload.diff) || 0;
  var petugas = String(payload.petugas || "");

  var orders = getTableRows("List_Order");
  var matchedOrder = null;
  var partOrders = [];

  for (var i = 0; i < orders.length; i++) {
    if (String(orders[i].Part_Number || "").trim() === partNumber) {
      partOrders.push(orders[i]);
      if (String(orders[i].id_customer || "").toLowerCase() === custTarget.toLowerCase()) {
        matchedOrder = orders[i];
      }
    }
  }

  if (matchedOrder) {
    matchedOrder.qty_order = qty;
  } else if (partOrders.length === 1 && (!partOrders[0].id_customer || partOrders[0].id_customer === "-")) {
    partOrders[0].qty_order = qty;
    partOrders[0].id_customer = (custTarget !== "-" ? custTarget : "");
  } else {
    orders.push({
      id: generateId(),
      Part_Number: partNumber,
      qty_order: qty,
      id_customer: (custTarget !== "-" ? custTarget : "")
    });
  }

  saveTableRows("List_Order", orders);

  if (petugas && diff !== 0) {
    appendTableRow("Transaksi_Masuk", {
      id: generateId(),
      tanggal: new Date().toISOString(),
      Part_Number: partNumber,
      qty: diff,
      petugas: petugas,
      catatan: "Update Target QTY/DAY (" + custTarget + ")"
    });
  }

  return { success: true };
}

function apiUpdateCustomerPart(payload) {
  var partNumber = String(payload.partNumber || "").trim();
  var newCustClean = String(payload.customer || "").trim();
  var oldCustClean = String(payload.oldCustomer || "").trim();
  var mode = payload.mode || "UPDATE";
  var qtyOrder = Number(payload.qtyOrder) || 0;

  var orders = getTableRows("List_Order");

  if (mode === "ADD_NEW") {
    orders.push({
      id: generateId(),
      Part_Number: partNumber,
      qty_order: qtyOrder,
      id_customer: newCustClean
    });
    saveTableRows("List_Order", orders);
    return { success: true };
  }

  if (mode === "DELETE_ROW") {
    orders = orders.filter(function(o) {
      var isSamePart = String(o.Part_Number || "").trim() === partNumber;
      var isSameCust = String(o.id_customer || "").toLowerCase() === oldCustClean.toLowerCase();
      return !(isSamePart && isSameCust);
    });
    saveTableRows("List_Order", orders);
    return { success: true };
  }

  // mode === "UPDATE"
  var targetRow = null;
  for (var i = 0; i < orders.length; i++) {
    if (String(orders[i].Part_Number || "").trim() === partNumber) {
      if (String(orders[i].id_customer || "").toLowerCase() === oldCustClean.toLowerCase()) {
        targetRow = orders[i];
        break;
      }
      if (!targetRow) targetRow = orders[i];
    }
  }

  if (targetRow) {
    targetRow.id_customer = newCustClean;
  } else {
    orders.push({
      id: generateId(),
      Part_Number: partNumber,
      qty_order: 0,
      id_customer: newCustClean
    });
  }

  saveTableRows("List_Order", orders);
  return { success: true };
}

function apiSaveBarang(payload) {
  var isEdit = payload.isEdit === true;
  var item = payload.item || {};
  var oldPartNumber = String(payload.oldPartNumber || "").trim();
  var newPartNumber = String(item.Part_Number || "").trim();
  var customer = String(payload.customer || "").trim();

  var barang = getTableRows("Master_Barang");

  if (isEdit) {
    if (newPartNumber.toLowerCase() !== oldPartNumber.toLowerCase()) {
      var duplicate = barang.some(function(b) {
        return String(b.Part_Number || "").trim().toLowerCase() === newPartNumber.toLowerCase();
      });
      if (duplicate) return { success: false, message: "Part Number baru sudah dipakai barang lain!" };
    }

    var editIdx = -1;
    for (var i = 0; i < barang.length; i++) {
      if (String(barang[i].Part_Number || "").trim().toLowerCase() === oldPartNumber.toLowerCase()) {
        editIdx = i;
        break;
      }
    }

    if (editIdx !== -1) {
      barang[editIdx] = {
        Part_Number: newPartNumber,
        nama_barang: item.nama_barang || "",
        No_Rel: item.No_Rel || "",
        stok: Number(item.stok) || 0,
        assy_fsg: Number(item.assy_fsg) || 0
      };
      saveTableRows("Master_Barang", barang);

      // Cascade update jika Part Number berubah
      if (newPartNumber.toLowerCase() !== oldPartNumber.toLowerCase()) {
        cascadePartNumberChange(oldPartNumber, newPartNumber);
      }
    }
  } else {
    var exists = barang.some(function(b) {
      return String(b.Part_Number || "").trim().toLowerCase() === newPartNumber.toLowerCase();
    });
    if (exists) return { success: false, message: "Part Number sudah ada!" };

    barang.push({
      Part_Number: newPartNumber,
      nama_barang: item.nama_barang || "",
      No_Rel: item.No_Rel || "",
      stok: Number(item.stok) || 0,
      assy_fsg: Number(item.assy_fsg) || 0
    });
    saveTableRows("Master_Barang", barang);
  }

  // Handle Customer order
  if (customer && customer !== "-") {
    var orders = getTableRows("List_Order");
    var orderRows = orders.filter(function(o) {
      return String(o.Part_Number || "").trim().toLowerCase() === newPartNumber.toLowerCase();
    });

    if (orderRows.length === 0) {
      orders.push({
        id: generateId(),
        Part_Number: newPartNumber,
        qty_order: 0,
        id_customer: customer
      });
      saveTableRows("List_Order", orders);
    } else if (isEdit && orderRows.length > 0) {
      orderRows[0].id_customer = customer;
      saveTableRows("List_Order", orders);
    }
  }

  return { success: true, message: isEdit ? "Data diubah!" : "Ditambahkan!" };
}

function cascadePartNumberChange(oldPN, newPN) {
  var orders = getTableRows("List_Order");
  var masuk = getTableRows("Transaksi_Masuk");
  var keluar = getTableRows("Transaksi_Keluar");

  orders.forEach(function(o) {
    if (String(o.Part_Number || "").trim().toLowerCase() === oldPN.toLowerCase()) {
      o.Part_Number = newPN;
    }
  });
  masuk.forEach(function(m) {
    if (String(m.Part_Number || "").trim().toLowerCase() === oldPN.toLowerCase()) {
      m.Part_Number = newPN;
    }
  });
  keluar.forEach(function(k) {
    if (String(k.Part_Number || "").trim().toLowerCase() === oldPN.toLowerCase()) {
      k.Part_Number = newPN;
    }
  });

  saveTableRows("List_Order", orders);
  saveTableRows("Transaksi_Masuk", masuk);
  saveTableRows("Transaksi_Keluar", keluar);
}

function apiSaveCustomer(payload) {
  var isEdit = payload.isEdit === true;
  var cust = payload.cust || {};
  var oldId = String(payload.oldIdCustomer || "").trim();
  var newId = String(cust.id_customer || "").trim();

  var customers = getTableRows("Master_Customer");

  if (isEdit) {
    if (newId.toLowerCase() !== oldId.toLowerCase()) {
      var dup = customers.some(function(c) {
        return String(c.id_customer || "").trim().toLowerCase() === newId.toLowerCase();
      });
      if (dup) return { success: false, message: "ID Customer baru sudah terpakai!" };
    }

    for (var i = 0; i < customers.length; i++) {
      if (String(customers[i].id_customer || "").trim().toLowerCase() === oldId.toLowerCase()) {
        customers[i] = {
          id_customer: newId,
          nama_customer: cust.nama_customer || "",
          alamat: cust.alamat || ""
        };
        break;
      }
    }
    saveTableRows("Master_Customer", customers);

    if (newId.toLowerCase() !== oldId.toLowerCase()) {
      var orders = getTableRows("List_Order");
      orders.forEach(function(o) {
        if (String(o.id_customer || "").trim().toLowerCase() === oldId.toLowerCase()) {
          o.id_customer = newId;
        }
      });
      saveTableRows("List_Order", orders);
    }
  } else {
    var exists = customers.some(function(c) {
      return String(c.id_customer || "").trim().toLowerCase() === newId.toLowerCase();
    });
    if (exists) return { success: false, message: "ID Customer sudah ada!" };

    customers.push({
      id_customer: newId,
      nama_customer: cust.nama_customer || "",
      alamat: cust.alamat || ""
    });
    saveTableRows("Master_Customer", customers);
  }

  return { success: true, message: isEdit ? "Customer diperbarui!" : "Customer tersimpan!" };
}

function apiSaveUser(payload) {
  var isEdit = payload.isEdit === true;
  var userData = payload.userData || {};
  var oldUsername = String(payload.oldUsername || "").trim();
  var newUsername = String(userData.username || "").trim();

  var users = getTableRows("Users");

  if (isEdit) {
    if (newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
      var dup = users.some(function(u) {
        return String(u.username || "").trim().toLowerCase() === newUsername.toLowerCase();
      });
      if (dup) return { success: false, message: "Username baru sudah terpakai!" };
    }

    for (var i = 0; i < users.length; i++) {
      if (String(users[i].username || "").trim().toLowerCase() === oldUsername.toLowerCase()) {
        users[i] = {
          id: users[i].id || generateId(),
          username: newUsername,
          password: userData.password || "",
          role: userData.role || "Warehouse"
        };
        break;
      }
    }
    saveTableRows("Users", users);

    if (newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
      var masuk = getTableRows("Transaksi_Masuk");
      var keluar = getTableRows("Transaksi_Keluar");
      masuk.forEach(function(m) {
        if (String(m.petugas || "").trim().toLowerCase() === oldUsername.toLowerCase()) {
          m.petugas = newUsername;
        }
      });
      keluar.forEach(function(k) {
        if (String(k.petugas || "").trim().toLowerCase() === oldUsername.toLowerCase()) {
          k.petugas = newUsername;
        }
      });
      saveTableRows("Transaksi_Masuk", masuk);
      saveTableRows("Transaksi_Keluar", keluar);
    }
  } else {
    var exists = users.some(function(u) {
      return String(u.username || "").trim().toLowerCase() === newUsername.toLowerCase();
    });
    if (exists) return { success: false, message: "Username sudah terdaftar!" };

    users.push({
      id: generateId(),
      username: newUsername,
      password: userData.password || "",
      role: userData.role || "Warehouse"
    });
    saveTableRows("Users", users);
  }

  return { success: true, message: isEdit ? "User diperbarui!" : "User didaftarkan!" };
}

function apiDeleteBarang(payload) {
  var partNumber = String(payload.partNumber || "").trim().toLowerCase();

  var barang = getTableRows("Master_Barang").filter(function(b) {
    return String(b.Part_Number || "").trim().toLowerCase() !== partNumber;
  });
  saveTableRows("Master_Barang", barang);

  var orders = getTableRows("List_Order").filter(function(o) {
    return String(o.Part_Number || "").trim().toLowerCase() !== partNumber;
  });
  saveTableRows("List_Order", orders);

  return { success: true, message: "Terhapus!" };
}

function apiBulkDeleteBarang(payload) {
  var list = (payload.partNumbers || []).map(function(p) {
    return String(p).trim().toLowerCase();
  });

  var barang = getTableRows("Master_Barang").filter(function(b) {
    return list.indexOf(String(b.Part_Number || "").trim().toLowerCase()) === -1;
  });
  saveTableRows("Master_Barang", barang);

  var orders = getTableRows("List_Order").filter(function(o) {
    return list.indexOf(String(o.Part_Number || "").trim().toLowerCase()) === -1;
  });
  saveTableRows("List_Order", orders);

  return { success: true, message: "Terhapus massal!" };
}

function apiDeleteCustomer(payload) {
  var idCust = String(payload.id_customer || "").trim().toLowerCase();
  var customers = getTableRows("Master_Customer").filter(function(c) {
    return String(c.id_customer || "").trim().toLowerCase() !== idCust;
  });
  saveTableRows("Master_Customer", customers);
  return { success: true, message: "Customer terhapus!" };
}

function apiDeleteUser(payload) {
  var uName = String(payload.usernameTarget || "").trim().toLowerCase();
  var users = getTableRows("Users").filter(function(u) {
    return String(u.username || "").trim().toLowerCase() !== uName;
  });
  saveTableRows("Users", users);
  return { success: true, message: "User terhapus!" };
}

// =========================================================================
// HELPER OPERASI GOOGLE SPREADSHEET (CEPAT & AMAN)
// =========================================================================

const TABLE_SCHEMAS = {
  "Master_Barang": ["Part_Number", "nama_barang", "No_Rel", "stok", "assy_fsg"],
  "Master_Customer": ["id_customer", "nama_customer", "alamat"],
  "List_Order": ["id", "Part_Number", "id_customer", "qty_order"],
  "Transaksi_Masuk": ["id", "tanggal", "Part_Number", "qty", "petugas", "catatan"],
  "Transaksi_Keluar": ["id", "tanggal", "Part_Number", "qty", "petugas", "catatan"],
  "Users": ["id", "username", "password", "role"]
};

function initSheetsIfMissing() {
  var ss = getSpreadsheet();
  for (var sheetName in TABLE_SCHEMAS) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(TABLE_SCHEMAS[sheetName]);
      formatHeaderRow(sheet);
    }
  }
}

function setupDatabase() {
  initSheetsIfMissing();
  var users = getTableRows("Users");
  if (users.length === 0) {
    appendTableRow("Users", { id: "1", username: "admin", password: "admin", role: "Admin" });
    appendTableRow("Users", { id: "2", username: "superadmin", password: "admin123", role: "Admin" });
    appendTableRow("Users", { id: "3", username: "__SYSTEM_ROLLOVER__", password: "NEW", role: "SYSTEM" });
  }

  // Data Master Customer sesuai Papan Kontrol
  var customers = getTableRows("Master_Customer");
  if (customers.length === 0) {
    var defaultCust = [
      { id_customer: "YIMM", nama_customer: "YAMAHA (YIMM)", alamat: "Pulo Gadung / Karawang" },
      { id_customer: "SIM", nama_customer: "SUZUKI (SIM)", alamat: "Tambun, Bekasi" },
      { id_customer: "KMI", nama_customer: "KAWASAKI (KMI)", alamat: "Pulo Gadung / Cibitung" },
      { id_customer: "TVS", nama_customer: "TVS MOTOR (TVS)", alamat: "Karawang, Jawa Barat" },
      { id_customer: "ALL CUSTOMER", nama_customer: "ALL CUSTOMER", alamat: "Other Part All Item" }
    ];
    defaultCust.forEach(function(c) {
      appendTableRow("Master_Customer", c);
    });
  }

  // 51 Data Part Number sesuai Papan Kontrol Fisik
  // Nilai stok, target (qty_order), dan assy_fsg diisi 0 (kosong) untuk diisi manual
  var barang = getTableRows("Master_Barang");
  if (barang.length === 0) {
    var rawBoardData = [
      // YIMM
      { cust: "YIMM", rel: "A.01 - A.07", part: "BWP-F4730-00", nama: "SEAT ASSY BWP-00" },
      { cust: "YIMM", rel: "A.08 - A.13", part: "BJM-F4730-00", nama: "SEAT ASSY BJM-00" },
      { cust: "YIMM", rel: "A.14/16", part: "BWP-F4730-10", nama: "SEAT ASSY BWP-10" },
      { cust: "YIMM", rel: "A.15 - A.17", part: "BJM-F4730-10", nama: "SEAT ASSY BJM-10" },
      { cust: "YIMM", rel: "A.18 - A.21", part: "BEJ-F4730-20", nama: "SEAT ASSY BEJ-20" },
      { cust: "YIMM", rel: "A.22 - A.24", part: "BXY-F4730-00", nama: "SEAT ASSY BXY-00" },
      { cust: "YIMM", rel: "A.25", part: "BEJ-F4730-30", nama: "SEAT ASSY BEJ-30" },
      { cust: "YIMM", rel: "A.26", part: "B3W-F4730-01", nama: "SEAT ASSY B3W-01" },
      { cust: "YIMM", rel: "A.27 - A.28", part: "BXY-F4730-10", nama: "SEAT ASSY BXY-10" },
      { cust: "YIMM", rel: "A.29 - A.30", part: "BBP-F4730-00", nama: "SEAT ASSY BBP-00" },
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
      { cust: "SIM", rel: "A.39", part: "45100-45H30-PR7", nama: "SEAT ASSY 45H30-PR7" },
      { cust: "SIM", rel: "A.39", part: "45100-22J00-W3A", nama: "SEAT ASSY 22J00-W3A" },
      { cust: "SIM", rel: "A.40", part: "45100-25G20-HES", nama: "SEAT ASSY 25G20-HES" },

      // KMI
      { cust: "KMI", rel: "A.41", part: "53066-0896", nama: "SEAT ASSY 53066-0896" },
      { cust: "KMI", rel: "A.41", part: "53066-0898", nama: "SEAT ASSY 53066-0898" },
      { cust: "KMI", rel: "A.41", part: "53066-0860 MA", nama: "SEAT ASSY 53066-0860 MA" },
      { cust: "KMI", rel: "A.41", part: "53066-0861 12Y", nama: "SEAT ASSY 53066-0861 12Y" },
      { cust: "KMI", rel: "A.41", part: "53066-1088 MA", nama: "SEAT ASSY 53066-1088 MA" },
      { cust: "KMI", rel: "A.41", part: "53066-1090 MA", nama: "SEAT ASSY 53066-1090 MA" },
      { cust: "KMI", rel: "A.41", part: "53066-1091 MA", nama: "SEAT ASSY 53066-1091 MA" },
      { cust: "KMI", rel: "A.41", part: "53066-1089 12Y", nama: "SEAT ASSY 53066-1089 12Y" },
      { cust: "KMI", rel: "A.41", part: "53066-0904 336", nama: "SEAT ASSY 53066-0904 336" },
      { cust: "KMI", rel: "A.41", part: "53066-0904-61U", nama: "SEAT ASSY 53066-0904-61U" },
      { cust: "KMI", rel: "A.41", part: "53066-0904 0927", nama: "SEAT ASSY 53066-0904 0927" },
      { cust: "KMI", rel: "A.43", part: "53066-0905 336", nama: "SEAT ASSY 53066-0905 336" },
      { cust: "KMI", rel: "A.43", part: "53066-0905 61U", nama: "SEAT ASSY 53066-0905 61U" },
      { cust: "KMI", rel: "A.43", part: "53066-0905 MA", nama: "SEAT ASSY 53066-0905 MA" },
      { cust: "KMI", rel: "A.43", part: "53066-0905 0928", nama: "SEAT ASSY 53066-0905 0928" },

      // TVS
      { cust: "TVS", rel: "A.44", part: "R3130220 TVSN101.W", nama: "SEAT ASSY TVSN101.W" },
      { cust: "TVS", rel: "A.44", part: "R3130190-TVSN101.R", nama: "SEAT ASSY TVSN101.R" },
      { cust: "TVS", rel: "A.45", part: "R1130190 TVSU358", nama: "SEAT ASSY TVSU358" },
      { cust: "TVS", rel: "A.46", part: "NA130010 TVSMAX", nama: "SEAT ASSY TVSMAX" },
      { cust: "TVS", rel: "A.46", part: "R3130230 TVSU313", nama: "SEAT ASSY TVSU313" },
      { cust: "TVS", rel: "A.46", part: "R4130020 TVSN100", nama: "SEAT ASSY TVSN100" },
      { cust: "TVS", rel: "A.46", part: "R1322380 SEAT BASE", nama: "SEAT BASE TVS" },
      { cust: "TVS", rel: "A.46", part: "Y4D Grey", nama: "SEAT ASSY Y4D GREY" },

      // OTHER PART ALL ITEM
      { cust: "ALL CUSTOMER", rel: "-", part: "P.T", nama: "PART P.T" },
      { cust: "ALL CUSTOMER", rel: "-", part: "Seat Base N100", nama: "SEAT BASE N100" },
      { cust: "ALL CUSTOMER", rel: "-", part: "Assy PP 4313", nama: "ASSY PP 4313" },
      { cust: "ALL CUSTOMER", rel: "A.47", part: "XT 604", nama: "PART XT 604" },
      { cust: "ALL CUSTOMER", rel: "A.47", part: "N27", nama: "PART N27" }
    ];

    rawBoardData.forEach(function(item) {
      appendTableRow("Master_Barang", {
        Part_Number: item.part,
        nama_barang: item.nama,
        No_Rel: item.rel,
        stok: 0,
        assy_fsg: 0
      });

      appendTableRow("List_Order", {
        id: generateId(),
        Part_Number: item.part,
        id_customer: item.cust,
        qty_order: 0
      });
    });
  }

  Logger.log("Setup Database Berhasil! Semua 51 data part dan master customer telah dibuat.");
}

function formatHeaderRow(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#f3f4f6");
  sheet.setFrozenRows(1);
}

function getTableRows(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function(h) { return String(h).trim(); });
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = values[i][j];
      if (val instanceof Date) {
        val = val.toISOString();
      }
      obj[headers[j]] = val;
    }
    rows.push(obj);
  }
  return rows;
}

function saveTableRows(sheetName, rows) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  var headers = TABLE_SCHEMAS[sheetName];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  var output2D = [headers];
  for (var i = 0; i < rows.length; i++) {
    var rowArr = [];
    for (var j = 0; j < headers.length; j++) {
      var v = rows[i][headers[j]];
      rowArr.push(v === undefined || v === null ? "" : v);
    }
    output2D.push(rowArr);
  }

  sheet.clearContents();
  sheet.getRange(1, 1, output2D.length, output2D[0].length).setValues(output2D);
  formatHeaderRow(sheet);
}

function appendTableRow(sheetName, rowObj) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  var defaultHeaders = TABLE_SCHEMAS[sheetName];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(defaultHeaders);
    formatHeaderRow(sheet);
  }
  var lastCol = sheet.getLastColumn();
  var headers = [];
  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
  } else {
    headers = defaultHeaders;
  }
  var rowArr = [];
  for (var j = 0; j < headers.length; j++) {
    var v = rowObj[headers[j]];
    rowArr.push(v === undefined || v === null ? "" : v);
  }
  sheet.appendRow(rowArr);
}

function generateId() {
  return Utilities.getUuid ? Utilities.getUuid() : (new Date().getTime().toString() + "_" + Math.floor(Math.random() * 1000));
}
