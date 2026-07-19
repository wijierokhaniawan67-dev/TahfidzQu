import React, { useState } from "react";
import { syncSpreadsheetSchema } from "../lib/sheetsService";
import { Database, Link, Check, RefreshCw, AlertTriangle, FileCode, Copy, Terminal, ExternalLink } from "lucide-react";

interface DatabaseConfigProps {
  accessToken: string;
  adminEmail: string;
  adminName: string;
  currentSpreadsheetId: string;
  currentAppsScriptUrl: string;
  onConfigSaved: (spreadsheetId: string, appsScriptUrl: string) => void;
  isAdmin: boolean;
  onAuthorizeGoogle?: () => void;
}

export default function DatabaseConfig({
  accessToken,
  adminEmail,
  adminName,
  currentSpreadsheetId,
  currentAppsScriptUrl,
  onConfigSaved,
  isAdmin,
  onAuthorizeGoogle,
}: DatabaseConfigProps) {
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(currentSpreadsheetId);
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState(currentAppsScriptUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const appsScriptCode = `/**
 * Apps Script untuk Database Hapalan Al-Quran Siswa (TahfidzQu)
 * Paste kode ini di: Ekstensi > Apps Script di Spreadsheet Anda.
 * 
 * Untuk menghubungkan tanpa akun Google:
 * 1. Klik Terapkan (Deploy) > Penerapan Baru (New Deployment).
 * 2. Pilih jenis "Aplikasi Web" (Web App).
 * 3. Atur "Terapkan sebagai" ke "Saya" (Me).
 * 4. Atur "Siapa yang memiliki akses" ke "Siapa saja" (Anyone).
 * 5. Klik Terapkan (Deploy), berikan izin akses, lalu salin URL yang diberikan!
 */

function doGet(e) {
  var action = e.parameter.action;
  try {
    var result = handleAction(action, e.parameter);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var action = e.parameter.action;
  var payload = {};
  if (e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (err) {
      // fallback
    }
  }
  
  try {
    var result = handleAction(action, payload);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleAction(action, payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "syncSchema") {
    return setupDatabaseSheetsInternal(ss);
  }
  
  if (action === "getSiswa") {
    var sheet = ss.getSheetByName("Siswa");
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    return data.slice(1);
  }
  
  if (action === "addSiswa") {
    var sheet = ss.getSheetByName("Siswa");
    if (!sheet) throw new Error("Sheet Siswa tidak ditemukan");
    sheet.appendRow([payload.ID_Siswa, payload.Nama, payload.Kelas, payload.Nomor_HP_Ortu, payload.Tanggal_Daftar]);
    return { success: true };
  }
  
  if (action === "updateSiswa") {
    var sheet = ss.getSheetByName("Siswa");
    if (!sheet) throw new Error("Sheet Siswa tidak ditemukan");
    var data = sheet.getDataRange().getValues();
    var idToFind = payload.ID_Siswa;
    var foundIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == idToFind) {
        foundIndex = i + 1;
        break;
      }
    }
    if (foundIndex !== -1) {
      sheet.getRange(foundIndex, 1, 1, 5).setValues([[
        payload.ID_Siswa, payload.Nama, payload.Kelas, payload.Nomor_HP_Ortu, payload.Tanggal_Daftar
      ]]);
      return { success: true };
    }
    throw new Error("Siswa tidak ditemukan");
  }
  
  if (action === "deleteSiswa") {
    var sheet = ss.getSheetByName("Siswa");
    if (!sheet) throw new Error("Sheet Siswa tidak ditemukan");
    var data = sheet.getDataRange().getValues();
    var idToFind = payload.ID_Siswa;
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][0] == idToFind) {
        sheet.deleteRow(i + 1);
      }
    }
    return { success: true };
  }
  
  if (action === "getHapalan") {
    var sheet = ss.getSheetByName("Hapalan");
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    return data.slice(1);
  }
  
  if (action === "addHapalan") {
    var sheet = ss.getSheetByName("Hapalan");
    if (!sheet) throw new Error("Sheet Hapalan tidak ditemukan");
    sheet.appendRow([
      payload.ID_Hapalan,
      payload.ID_Siswa,
      payload.Tanggal,
      payload.Juz,
      payload.Surat,
      payload.Ayat_Mulai,
      payload.Ayat_Selesai,
      payload.Nilai_Kelancaran,
      payload.Status,
      payload.Keterangan,
      payload.Guru_Penilai
    ]);
    return { success: true };
  }
  
  if (action === "updateHapalan") {
    var sheet = ss.getSheetByName("Hapalan");
    if (!sheet) throw new Error("Sheet Hapalan tidak ditemukan");
    var data = sheet.getDataRange().getValues();
    var idToFind = payload.ID_Hapalan;
    var foundIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == idToFind) {
        foundIndex = i + 1;
        break;
      }
    }
    if (foundIndex !== -1) {
      sheet.getRange(foundIndex, 1, 1, 11).setValues([[
        payload.ID_Hapalan,
        payload.ID_Siswa,
        payload.Tanggal,
        payload.Juz,
        payload.Surat,
        payload.Ayat_Mulai,
        payload.Ayat_Selesai,
        payload.Nilai_Kelancaran,
        payload.Status,
        payload.Keterangan,
        payload.Guru_Penilai
      ]]);
      return { success: true };
    }
    throw new Error("Hapalan tidak ditemukan");
  }
  
  if (action === "deleteHapalan") {
    var sheet = ss.getSheetByName("Hapalan");
    if (!sheet) throw new Error("Sheet Hapalan tidak ditemukan");
    var data = sheet.getDataRange().getValues();
    var idToFind = payload.ID_Hapalan;
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][0] == idToFind) {
        sheet.deleteRow(i + 1);
      }
    }
    return { success: true };
  }
  
  if (action === "getUsers") {
    var sheet = ss.getSheetByName("Users");
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    return data.slice(1);
  }
  
  if (action === "addAppUser") {
    var sheet = ss.getSheetByName("Users");
    if (!sheet) throw new Error("Sheet Users tidak ditemukan");
    var data = sheet.getDataRange().getValues();
    var username = payload.Username.toLowerCase();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1].toString().toLowerCase() === username) {
        throw new Error("Username sudah terdaftar");
      }
    }
    sheet.appendRow([payload.ID_User, payload.Username, payload.Password, payload.Nama, payload.Role]);
    return { success: true };
  }
  
  if (action === "removeAppUser") {
    var sheet = ss.getSheetByName("Users");
    if (!sheet) throw new Error("Sheet Users tidak ditemukan");
    var data = sheet.getDataRange().getValues();
    var username = payload.Username.toLowerCase();
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][1].toString().toLowerCase() === username) {
        sheet.deleteRow(i + 1);
      }
    }
    return { success: true };
  }
  
  throw new Error("Action tidak dikenali: " + action);
}

function setupDatabaseSheetsInternal(ss) {
  var sheetsToCreate = {
    "Siswa": ["ID_Siswa", "Nama", "Kelas", "Nomor_HP_Ortu", "Tanggal_Daftar"],
    "Hapalan": [
      "ID_Hapalan", 
      "ID_Siswa", 
      "Tanggal", 
      "Juz", 
      "Surat", 
      "Ayat_Mulai", 
      "Ayat_Selesai", 
      "Nilai_Kelancaran", 
      "Status", 
      "Keterangan", 
      "Guru_Penilai"
    ],
    "Users": ["ID_User", "Username", "Password", "Nama", "Role"]
  };
  
  var created = [];
  var updated = [];
  
  for (var sheetName in sheetsToCreate) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      created.push(sheetName);
    } else {
      updated.push(sheetName);
    }
    
    var headers = sheetsToCreate[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  
  var usersSheet = ss.getSheetByName("Users");
  if (usersSheet.getLastRow() === 1) {
    usersSheet.appendRow(["US-ADMIN", "admin", "admin123", "Administrator Utama", "Admin"]);
  }
  
  beautifySpreadsheet();
  
  return {
    created: created,
    updated: updated,
    message: "Skema berhasil diselaraskan lewat Google Apps Script."
  };
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🕌 Aplikasi Hafalan')
      .addItem('🔄 Inisialisasi / Perbaiki Struktur', 'setupDatabaseSheets')
      .addItem('✨ Atur Tampilan Cantik (Auto-Format)', 'beautifySpreadsheet')
      .addSeparator()
      .addItem('ℹ️ Petunjuk Integrasi Web', 'showIntegrationHelp')
      .addToUi();
}

function setupDatabaseSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupDatabaseSheetsInternal(ss);
  
  var ui = SpreadsheetApp.getUi();
  ui.alert("Sukses", "Inisialisasi & Penyelarasan kolom berhasil diselesaikan!", ui.ButtonSet.OK);
}

function beautifySpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var sheetSiswa = ss.getSheetByName("Siswa");
  if (sheetSiswa) {
    formatHeader(sheetSiswa, 5, "#065f46");
    sheetSiswa.getRange("A2:A").setHorizontalAlignment("center");
    sheetSiswa.getRange("C2:C").setHorizontalAlignment("center");
    sheetSiswa.getRange("D2:D").setHorizontalAlignment("center");
    sheetSiswa.setColumnWidths(1, 5, 120);
    sheetSiswa.setColumnWidth(3, 80);
  }
  
  var sheetHapalan = ss.getSheetByName("Hapalan");
  if (sheetHapalan) {
    formatHeader(sheetHapalan, 11, "#065f46");
    sheetHapalan.getRange("A2:A").setHorizontalAlignment("center");
    sheetHapalan.getRange("B2:B").setHorizontalAlignment("center");
    sheetHapalan.getRange("C2:C").setHorizontalAlignment("center");
    sheetHapalan.getRange("D2:D").setHorizontalAlignment("center");
    sheetHapalan.getRange("F2:H").setHorizontalAlignment("center");
    sheetHapalan.getRange("I2:I").setHorizontalAlignment("center");
    
    sheetHapalan.setColumnWidth(1, 100);
    sheetHapalan.setColumnWidth(2, 100);
    sheetHapalan.setColumnWidth(3, 100);
    sheetHapalan.setColumnWidth(4, 60);
    sheetHapalan.setColumnWidth(5, 120);
    sheetHapalan.setColumnWidth(6, 80);
    sheetHapalan.setColumnWidth(7, 80);
    sheetHapalan.setColumnWidth(8, 80);
    sheetHapalan.setColumnWidth(9, 90);
    sheetHapalan.setColumnWidth(10, 220);
    sheetHapalan.setColumnWidth(11, 120);
    
    applyConditionalFormatting(sheetHapalan);
  }
  
  var sheetUsers = ss.getSheetByName("Users");
  if (sheetUsers) {
    formatHeader(sheetUsers, 5, "#065f46");
    sheetUsers.getRange("E2:E").setHorizontalAlignment("center");
    sheetUsers.setColumnWidths(1, 5, 120);
  }
}

function formatHeader(sheet, numCols, colorHex) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground(colorHex);
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontSize(10);
  headerRange.setFontFamily("Arial");
  headerRange.setHorizontalAlignment("center");
  sheet.getRange(1, 1, sheet.getLastRow() || 1, numCols).setFontFamily("Arial").setFontSize(10);
}

function applyConditionalFormatting(sheet) {
  var range = sheet.getRange("I2:I1000");
  var rules = sheet.getConditionalFormatRules();
  var newRules = [];
  
  var ruleLanjut = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Lanjut")
    .setBackground("#D1FAE5")
    .setFontColor("#065F46")
    .setRanges([range])
    .build();
    
  var ruleUlang = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Ulang")
    .setBackground("#FEF3C7")
    .setFontColor("#92400E")
    .setRanges([range])
    .build();
    
  newRules.push(ruleLanjut);
  newRules.push(ruleUlang);
  sheet.setConditionalFormatRules(newRules);
}

function showIntegrationHelp() {
  var ui = SpreadsheetApp.getUi();
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family: Arial, sans-serif; padding: 15px;">' +
    '<h3>Aplikasi Hafalan Al-Quran Terhubung!</h3>' +
    '<p>Google Spreadsheet ini bertindak sebagai database real-time Anda.</p>' +
    '<ul>' +
    '<li>Jangan merubah nama sheet atau nama kolom baris pertama agar aplikasi web tetap berjalan lancar.</li>' +
    '<li>Anda dapat memantau data yang diinput oleh guru-guru langsung dari sini secara real-time.</li>' +
    '<li>Gunakan menu <b>Aplikasi Hafalan</b> di atas untuk menyinkronkan kolom jika tidak sengaja terhapus.</li>' +
    '</ul>' +
    '</div>'
  ).setWidth(400).setHeight(250);
  ui.showModalDialog(html, "Informasi Integrasi");
}`;

  const handleConnectAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetIdInput.trim()) {
      setError("ID Spreadsheet tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          spreadsheetId: spreadsheetIdInput.trim(),
          appsScriptUrl: appsScriptUrlInput.trim(),
          googleAccessToken: accessToken
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan konfigurasi di server.");
      }

      const result = await response.json();
      onConfigSaved(spreadsheetIdInput.trim(), appsScriptUrlInput.trim());
      setSuccessMsg("Koneksi ke Google Spreadsheet berhasil disimpan!");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menghubungkan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInstallDatabase = async () => {
    if (!spreadsheetIdInput.trim()) {
      setError("Harap hubungkan atau masukkan ID Spreadsheet terlebih dahulu sebelum menginstal database.");
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await syncSpreadsheetSchema(
        spreadsheetIdInput.trim(), 
        accessToken, 
        adminEmail, 
        adminName,
        appsScriptUrlInput.trim()
      );
      setSuccessMsg(`Berhasil Menginstal Database Spreadsheet! ${result.message}`);
      
      // Save it to config automatically on success
      await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          spreadsheetId: spreadsheetIdInput.trim(),
          appsScriptUrl: appsScriptUrlInput.trim(),
          googleAccessToken: accessToken
        }),
      });
      onConfigSaved(spreadsheetIdInput.trim(), appsScriptUrlInput.trim());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal menginstal database di Google Spreadsheet.");
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-3xl p-6 max-w-2xl mx-auto flex items-start gap-4 shadow-sm">
        <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
        <div>
          <h3 className="font-extrabold text-lg tracking-tight">Spreadsheet Belum Dihubungkan</h3>
          <p className="mt-2 text-sm text-amber-800 leading-relaxed">
            Aplikasi ini mendata langsung ke Google Spreadsheet. Namun, database belum dihubungkan oleh Administrator.
            Harap hubungi admin Anda untuk mengonfigurasikan ID Spreadsheet terlebih dahulu agar aplikasi dapat digunakan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl">
            <Database className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Sistem Integrasi Database Al-Quran</h2>
            <p className="text-sm text-slate-500 max-w-2xl">
              Gunakan panel ini untuk mengonfigurasikan database Google Spreadsheet Anda. Data hafalan siswa, 
              informasi siswa, dan hak akses guru akan disimpan langsung secara aman di cloud Spreadsheet Anda.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm flex items-start gap-2 max-w-5xl">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-2xl p-4 text-sm flex items-start gap-2 max-w-5xl">
          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Connection Form Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <Link className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-lg tracking-tight">Koneksi Spreadsheet</h3>
            </div>

             <div className="p-4 mb-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-550 block">Status Akun Google:</span>
              {accessToken ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-750 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Google Sheets Terhubung</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Google Sheets Belum Terhubung</span>
                </div>
              )}
              {onAuthorizeGoogle && (
                <button
                  type="button"
                  onClick={onAuthorizeGoogle}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{accessToken ? "Perbarui Otorisasi Google" : "Hubungkan Akun Google"}</span>
                </button>
              )}
            </div>

            <form onSubmit={handleConnectAndSave} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">ID Spreadsheet</label>
                <input
                  type="text"
                  value={spreadsheetIdInput}
                  onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                  placeholder="Contoh: 1abcDeFgH-iJkLmNoP..."
                  className="w-full mt-1.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                  Dapatkan ID ini dari URL Google Spreadsheet Anda.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">URL Google Apps Script</label>
                <input
                  type="url"
                  value={appsScriptUrlInput}
                  onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                  placeholder="Contoh: https://script.google.com/macros/s/.../exec"
                  className="w-full mt-1.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                  Url dari Apps Script yang telah Anda publikasikan (Opsional).
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-100 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Menghubungkan...
                    </>
                  ) : (
                    <>Hubungkan Koneksi</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Setup Sheets / Installer Card */}
          <div className="bg-emerald-950 text-emerald-100 rounded-3xl p-6 border border-emerald-900 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <Terminal className="w-5 h-5" />
              <h4 className="font-extrabold text-xs uppercase tracking-wider">Instal Database Otomatis</h4>
            </div>
            
            <p className="text-xs text-emerald-200 leading-relaxed">
              Tekan tombol di bawah untuk membuat lembar kerja (Sheets) bernama <strong className="text-white">Siswa</strong>, <strong className="text-white">Hapalan</strong>, dan <strong className="text-white">Users</strong> beserta struktur kolomnya secara langsung di Spreadsheet terhubung Anda.
            </p>

            <button
              onClick={handleInstallDatabase}
              disabled={isSyncing}
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Menginstal Tabel...
                </>
              ) : (
                <>Instal Database Spreadsheet</>
              )}
            </button>
          </div>
        </div>

        {/* Instructions / Copy Script Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-850 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileCode className="w-8 h-8 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base text-white">Google Apps Script Integration</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Membuat menu pintasan dan mewarnai status kelancaran otomatis di Spreadsheet.
                  </p>
                </div>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shrink-0 shadow-md shadow-emerald-950/50"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Salin Kode
                  </>
                )}
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-5 space-y-4 text-xs text-slate-300 leading-relaxed">
                <h4 className="font-bold text-white text-sm">Cara Pemasangan Script:</h4>
                <ol className="list-decimal pl-4 space-y-2.5">
                  <li>
                    Buka file <strong className="text-emerald-300">Google Spreadsheet</strong> Anda. 
                    {spreadsheetIdInput && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetIdInput}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 hover:underline font-bold ml-1"
                      >
                        (Buka <ExternalLink className="w-2.5 h-2.5" />)
                      </a>
                    )}
                  </li>
                  <li>
                    Pilih menu <strong className="text-emerald-300">Ekstensi (Extensions)</strong> &gt; <strong className="text-emerald-300">Apps Script</strong>.
                  </li>
                  <li>
                    Hapus semua kode bawaan di editor, lalu <strong className="text-white bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">Paste</strong> kode yang sudah Anda salin.
                  </li>
                  <li>
                    Klik tombol <strong className="text-emerald-300">Simpan (ikon Disket)</strong>.
                  </li>
                  <li>
                    Lakukan <strong className="text-emerald-300">Refresh</strong> halaman Google Spreadsheet Anda.
                  </li>
                  <li>
                    Menu baru bernama <strong className="text-emerald-300">🕌 Aplikasi Hafalan</strong> akan muncul di baris menu atas!
                  </li>
                </ol>

                <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-[10px]">
                  <span className="font-bold block text-emerald-300 mb-0.5">💡 Catatan Keamanan:</span>
                  Apps Script ini opsional namun sangat direkomendasikan agar Guru & Admin bisa memformat tampilan tabel di Sheets dalam satu klik.
                </div>
              </div>

              <div className="md:col-span-7 flex flex-col h-full">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Source Code Script:</span>
                <pre className="flex-1 bg-slate-950 p-4 rounded-2xl font-mono text-[10px] text-emerald-400 overflow-y-auto max-h-[300px] border border-slate-850 scrollbar-thin scrollbar-thumb-slate-800">
                  {appsScriptCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
