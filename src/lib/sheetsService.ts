import { Siswa, Hapalan, AppUser } from "../types";

// Base Google API URL routed through server proxy to bypass CORS
const GOOGLE_API_BASE = "/api/sheets-proxy";

// Helper to make calls to Google Apps Script via Server Proxy
async function callAppsScript(appsScriptUrl: string, action: string, payload: any = {}): Promise<any> {
  const response = await fetch("/api/apps-script", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      appsScriptUrl,
      action,
      payload,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Apps Script Proxy Error: ${errorText || response.statusText}`);
  }

  const result = await response.json();
  if (result.status === "error") {
    throw new Error(result.message || "Terjadi kesalahan di Google Apps Script.");
  }

  return result.data;
}

// Read values from a specific sheet range
export async function getSheetValues(spreadsheetId: string, range: string, accessToken: string): Promise<any[][]> {
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API Error (GET ${range}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return data.values || [];
}

// Append rows to a specific sheet range
export async function appendSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][],
  accessToken: string
): Promise<any> {
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API Error (APPEND ${range}): ${errorText || response.statusText}`);
  }

  return response.json();
}

// Update (overwrite) a specific sheet range
export async function updateSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][],
  accessToken: string
): Promise<any> {
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API Error (PUT ${range}): ${errorText || response.statusText}`);
  }

  return response.json();
}

// Clear values from a specific sheet range
export async function clearSheetValues(spreadsheetId: string, range: string, accessToken: string): Promise<any> {
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API Error (CLEAR ${range}): ${errorText || response.statusText}`);
  }

  return response.json();
}

// Create a new spreadsheet with the correct schema
export async function createSpreadsheet(
  accessToken: string,
  adminEmail: string,
  adminName: string
): Promise<string> {
  const response = await fetch(GOOGLE_API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: "Database Hapalan Al-Quran Siswa",
      },
      sheets: [
        { properties: { title: "Siswa" } },
        { properties: { title: "Hapalan" } },
        { properties: { title: "Users" } },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Initialize headers
  await updateSheetValues(
    spreadsheetId,
    "Siswa!A1:E1",
    [["ID_Siswa", "Nama", "Kelas", "Nomor_HP_Ortu", "Tanggal_Daftar"]],
    accessToken
  );

  await updateSheetValues(
    spreadsheetId,
    "Hapalan!A1:K1",
    [[
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
      "Guru_Penilai",
    ]],
    accessToken
  );

  // Initialize users with custom username and password
  await updateSheetValues(
    spreadsheetId,
    "Users!A1:E2",
    [
      ["ID_User", "Username", "Password", "Nama", "Role"],
      ["US-ADMIN", "admin", "admin123", adminName || "Administrator Utama", "Admin"],
    ],
    accessToken
  );

  return spreadsheetId;
}

// Get lists
export async function getSiswaList(spreadsheetId: string, accessToken: string, appsScriptUrl?: string): Promise<Siswa[]> {
  try {
    if (appsScriptUrl) {
      const values = await callAppsScript(appsScriptUrl, "getSiswa");
      if (!Array.isArray(values)) {
        throw new Error(
          typeof values === "string" && values.includes("<!DOCTYPE html>")
            ? "Menerima respons HTML dari Google Apps Script. Pastikan Web App Anda sudah dideploy sebagai 'Anyone' (Siapa saja) dan Anda telah memberikan izin akses."
            : "Data yang diterima dari Google Apps Script tidak valid (bukan array)."
        );
      }
      return values.map((row: any) => ({
        ID_Siswa: row[0] || "",
        Nama: row[1] || "",
        Kelas: row[2] || "",
        Nomor_HP_Ortu: row[3] || "",
        Tanggal_Daftar: row[4] || "",
      })).filter((s: any) => s.ID_Siswa);
    }

    const values = await getSheetValues(spreadsheetId, "Siswa!A2:E2000", accessToken);
    if (!Array.isArray(values)) {
      throw new Error("Data yang diterima dari Google Sheets tidak valid.");
    }
    return values.map((row) => ({
      ID_Siswa: row[0] || "",
      Nama: row[1] || "",
      Kelas: row[2] || "",
      Nomor_HP_Ortu: row[3] || "",
      Tanggal_Daftar: row[4] || "",
    })).filter((s) => s.ID_Siswa);
  } catch (err) {
    console.error("Error listing students:", err);
    throw err;
  }
}

export async function addSiswa(spreadsheetId: string, siswa: Siswa, accessToken: string, appsScriptUrl?: string): Promise<void> {
  if (appsScriptUrl) {
    await callAppsScript(appsScriptUrl, "addSiswa", siswa);
    return;
  }

  await appendSheetValues(
    spreadsheetId,
    "Siswa!A2:E2",
    [[siswa.ID_Siswa, siswa.Nama, siswa.Kelas, siswa.Nomor_HP_Ortu, siswa.Tanggal_Daftar]],
    accessToken
  );
}

export async function getHapalanList(spreadsheetId: string, accessToken: string, appsScriptUrl?: string): Promise<Hapalan[]> {
  try {
    if (appsScriptUrl) {
      const values = await callAppsScript(appsScriptUrl, "getHapalan");
      if (!Array.isArray(values)) {
        throw new Error(
          typeof values === "string" && values.includes("<!DOCTYPE html>")
            ? "Menerima respons HTML dari Google Apps Script. Pastikan Web App Anda sudah dideploy sebagai 'Anyone' (Siapa saja) dan Anda telah memberikan izin akses."
            : "Data yang diterima dari Google Apps Script tidak valid (bukan array)."
        );
      }
      return values.map((row: any) => ({
        ID_Hapalan: row[0] || "",
        ID_Siswa: row[1] || "",
        Tanggal: row[2] || "",
        Juz: Number(row[3]) || 1,
        Surat: row[4] || "",
        Ayat_Mulai: Number(row[5]) || 1,
        Ayat_Selesai: Number(row[6]) || 1,
        Nilai_Kelancaran: row[7] || "",
        Status: (row[8] === "Lanjut" ? "Lanjut" : "Ulang") as "Lanjut" | "Ulang",
        Keterangan: row[9] || "",
        Guru_Penilai: row[10] || "",
      })).filter((h: any) => h.ID_Hapalan);
    }

    const values = await getSheetValues(spreadsheetId, "Hapalan!A2:K5000", accessToken);
    if (!Array.isArray(values)) {
      throw new Error("Data yang diterima dari Google Sheets tidak valid.");
    }
    return values.map((row) => ({
      ID_Hapalan: row[0] || "",
      ID_Siswa: row[1] || "",
      Tanggal: row[2] || "",
      Juz: Number(row[3]) || 1,
      Surat: row[4] || "",
      Ayat_Mulai: Number(row[5]) || 1,
      Ayat_Selesai: Number(row[6]) || 1,
      Nilai_Kelancaran: row[7] || "",
      Status: (row[8] === "Lanjut" ? "Lanjut" : "Ulang") as "Lanjut" | "Ulang",
      Keterangan: row[9] || "",
      Guru_Penilai: row[10] || "",
    })).filter((h) => h.ID_Hapalan);
  } catch (err) {
    console.error("Error listing memorizations:", err);
    throw err;
  }
}

export async function addHapalan(spreadsheetId: string, hapalan: Hapalan, accessToken: string, appsScriptUrl?: string): Promise<void> {
  if (appsScriptUrl) {
    await callAppsScript(appsScriptUrl, "addHapalan", hapalan);
    return;
  }

  await appendSheetValues(
    spreadsheetId,
    "Hapalan!A2:K2",
    [[
      hapalan.ID_Hapalan,
      hapalan.ID_Siswa,
      hapalan.Tanggal,
      hapalan.Juz,
      hapalan.Surat,
      hapalan.Ayat_Mulai,
      hapalan.Ayat_Selesai,
      hapalan.Nilai_Kelancaran,
      hapalan.Status,
      hapalan.Keterangan,
      hapalan.Guru_Penilai,
    ]],
    accessToken
  );
}

export async function getUsersList(spreadsheetId: string, accessToken: string, appsScriptUrl?: string): Promise<AppUser[]> {
  try {
    if (appsScriptUrl) {
      const values = await callAppsScript(appsScriptUrl, "getUsers");
      if (!Array.isArray(values)) {
        throw new Error(
          typeof values === "string" && values.includes("<!DOCTYPE html>")
            ? "Menerima respons HTML dari Google Apps Script. Pastikan Web App Anda sudah dideploy sebagai 'Anyone' (Siapa saja) dan Anda telah memberikan izin akses."
            : "Data yang diterima dari Google Apps Script tidak valid (bukan array)."
        );
      }
      return values.map((row: any) => ({
        ID_User: row[0] || "",
        Username: row[1] || "",
        Password: row[2] || "",
        Nama: row[3] || "",
        Role: (row[4] === "Admin" ? "Admin" : "Guru") as "Admin" | "Guru",
      })).filter((u: any) => u.Username);
    }

    const values = await getSheetValues(spreadsheetId, "Users!A2:E500", accessToken);
    if (!Array.isArray(values)) {
      throw new Error("Data yang diterima dari Google Sheets tidak valid.");
    }
    return values.map((row) => ({
      ID_User: row[0] || "",
      Username: row[1] || "",
      Password: row[2] || "",
      Nama: row[3] || "",
      Role: (row[4] === "Admin" ? "Admin" : "Guru") as "Admin" | "Guru",
    })).filter((u) => u.Username);
  } catch (err) {
    console.error("Error listing users:", err);
    throw err;
  }
}

export async function addAppUser(spreadsheetId: string, user: AppUser, accessToken: string, appsScriptUrl?: string): Promise<void> {
  if (appsScriptUrl) {
    // Check if already exists
    const existing = await getUsersList(spreadsheetId, accessToken, appsScriptUrl);
    if (existing.some((u) => u.Username.toLowerCase() === user.Username.toLowerCase())) {
      throw new Error(`Pengguna dengan username "${user.Username}" sudah terdaftar.`);
    }
    await callAppsScript(appsScriptUrl, "addAppUser", user);
    return;
  }

  // Check if already exists
  const existing = await getUsersList(spreadsheetId, accessToken);
  if (existing.some((u) => u.Username.toLowerCase() === user.Username.toLowerCase())) {
    throw new Error(`Pengguna dengan username "${user.Username}" sudah terdaftar.`);
  }

  await appendSheetValues(
    spreadsheetId,
    "Users!A2:E2",
    [[user.ID_User, user.Username, user.Password || "", user.Nama, user.Role]],
    accessToken
  );
}

export async function removeAppUser(spreadsheetId: string, username: string, accessToken: string, appsScriptUrl?: string): Promise<void> {
  if (appsScriptUrl) {
    await callAppsScript(appsScriptUrl, "removeAppUser", { Username: username });
    return;
  }

  const users = await getUsersList(spreadsheetId, accessToken);
  const remaining = users.filter((u) => u.Username.toLowerCase() !== username.toLowerCase());

  // Clear Users values and rewrite
  await clearSheetValues(spreadsheetId, "Users!A2:E500", accessToken);

  if (remaining.length > 0) {
    const rows = remaining.map((u) => [u.ID_User, u.Username, u.Password || "", u.Nama, u.Role]);
    await updateSheetValues(spreadsheetId, `Users!A2:E${remaining.length + 1}`, rows, accessToken);
  }
}

// Batch update for spreadsheets
export async function batchUpdateSpreadsheet(
  spreadsheetId: string,
  requests: any[],
  accessToken: string
): Promise<any> {
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}:batchUpdate`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API Error (batchUpdate): ${errorText || response.statusText}`);
  }

  return response.json();
}

// Auto-sync spreadsheet sheets and columns
export async function syncSpreadsheetSchema(
  spreadsheetId: string,
  accessToken: string,
  adminEmail?: string,
  adminName?: string,
  appsScriptUrl?: string
): Promise<{ addedSheets: string[]; message: string }> {
  if (appsScriptUrl) {
    const res = await callAppsScript(appsScriptUrl, "syncSchema");
    return {
      addedSheets: res.created || [],
      message: res.message || "Struktur database berhasil disinkronkan via Apps Script!"
    };
  }

  // 1. Get spreadsheet details
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}?fields=sheets.properties`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal membaca informasi spreadsheet: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const existingSheets: string[] = (data.sheets || []).map(
    (s: any) => s.properties?.title || ""
  );

  const requiredSheets = ["Siswa", "Hapalan", "Users"];
  const missingSheets = requiredSheets.filter((title) => !existingSheets.includes(title));
  const addedSheets: string[] = [];

  // 2. Create missing sheets
  if (missingSheets.length > 0) {
    const requests = missingSheets.map((title) => ({
      addSheet: {
        properties: { title },
      },
    }));

    await batchUpdateSpreadsheet(spreadsheetId, requests, accessToken);
    addedSheets.push(...missingSheets);
  }

  // 3. Write/overwrite headers
  await updateSheetValues(
    spreadsheetId,
    "Siswa!A1:E1",
    [["ID_Siswa", "Nama", "Kelas", "Nomor_HP_Ortu", "Tanggal_Daftar"]],
    accessToken
  );

  await updateSheetValues(
    spreadsheetId,
    "Hapalan!A1:K1",
    [[
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
      "Guru_Penilai",
    ]],
    accessToken
  );

  // For Users, check if it has data
  let usersList: any[][] = [];
  try {
    usersList = await getSheetValues(spreadsheetId, "Users!A1:E2", accessToken);
  } catch (e) {
    // ignore
  }

  if (usersList.length <= 1) {
    await updateSheetValues(
      spreadsheetId,
      "Users!A1:E2",
      [
        ["ID_User", "Username", "Password", "Nama", "Role"],
        ["US-ADMIN", "admin", "admin123", adminName || "Administrator Utama", "Admin"],
      ],
      accessToken
    );
  } else {
    await updateSheetValues(
      spreadsheetId,
      "Users!A1:E1",
      [["ID_User", "Username", "Password", "Nama", "Role"]],
      accessToken
    );
  }

  return {
    addedSheets,
    message: missingSheets.length > 0
      ? `Berhasil membuat sheet baru: ${missingSheets.join(", ")} dan menyinkronkan seluruh kolom.`
      : "Struktur database sudah lengkap. Seluruh kolom berhasil diselaraskan!",
  };
}

// Update an existing Siswa record
export async function updateSiswa(
  spreadsheetId: string,
  updatedSiswa: Siswa,
  accessToken: string,
  appsScriptUrl?: string
): Promise<void> {
  if (appsScriptUrl) {
    await callAppsScript(appsScriptUrl, "updateSiswa", updatedSiswa);
    return;
  }

  const list = await getSiswaList(spreadsheetId, accessToken);
  const index = list.findIndex(s => s.ID_Siswa === updatedSiswa.ID_Siswa);
  if (index !== -1) {
    list[index] = updatedSiswa;
    await clearSheetValues(spreadsheetId, "Siswa!A2:E2000", accessToken);
    const rows = list.map(s => [s.ID_Siswa, s.Nama, s.Kelas, s.Nomor_HP_Ortu, s.Tanggal_Daftar]);
    await updateSheetValues(spreadsheetId, `Siswa!A2:E${list.length + 1}`, rows, accessToken);
  }
}

// Delete an existing Siswa record
export async function deleteSiswa(
  spreadsheetId: string,
  idSiswa: string,
  accessToken: string,
  appsScriptUrl?: string
): Promise<void> {
  if (appsScriptUrl) {
    await callAppsScript(appsScriptUrl, "deleteSiswa", { ID_Siswa: idSiswa });
    return;
  }

  const list = await getSiswaList(spreadsheetId, accessToken);
  const remaining = list.filter(s => s.ID_Siswa !== idSiswa);
  await clearSheetValues(spreadsheetId, "Siswa!A2:E2000", accessToken);
  if (remaining.length > 0) {
    const rows = remaining.map(s => [s.ID_Siswa, s.Nama, s.Kelas, s.Nomor_HP_Ortu, s.Tanggal_Daftar]);
    await updateSheetValues(spreadsheetId, `Siswa!A2:E${remaining.length + 1}`, rows, accessToken);
  }
}

// Update an existing Hapalan record
export async function updateHapalan(
  spreadsheetId: string,
  updatedHapalan: Hapalan,
  accessToken: string,
  appsScriptUrl?: string
): Promise<void> {
  if (appsScriptUrl) {
    await callAppsScript(appsScriptUrl, "updateHapalan", updatedHapalan);
    return;
  }

  const list = await getHapalanList(spreadsheetId, accessToken);
  const index = list.findIndex(h => h.ID_Hapalan === updatedHapalan.ID_Hapalan);
  if (index !== -1) {
    list[index] = updatedHapalan;
    await clearSheetValues(spreadsheetId, "Hapalan!A2:K5000", accessToken);
    const rows = list.map(h => [
      h.ID_Hapalan,
      h.ID_Siswa,
      h.Tanggal,
      h.Juz,
      h.Surat,
      h.Ayat_Mulai,
      h.Ayat_Selesai,
      h.Nilai_Kelancaran,
      h.Status,
      h.Keterangan,
      h.Guru_Penilai
    ]);
    await updateSheetValues(spreadsheetId, `Hapalan!A2:K${list.length + 1}`, rows, accessToken);
  }
}

// Delete an existing Hapalan record
export async function deleteHapalan(
  spreadsheetId: string,
  idHapalan: string,
  accessToken: string,
  appsScriptUrl?: string
): Promise<void> {
  if (appsScriptUrl) {
    await callAppsScript(appsScriptUrl, "deleteHapalan", { ID_Hapalan: idHapalan });
    return;
  }

  const list = await getHapalanList(spreadsheetId, accessToken);
  const remaining = list.filter(h => h.ID_Hapalan !== idHapalan);
  await clearSheetValues(spreadsheetId, "Hapalan!A2:K5000", accessToken);
  if (remaining.length > 0) {
    const rows = remaining.map(h => [
      h.ID_Hapalan,
      h.ID_Siswa,
      h.Tanggal,
      h.Juz,
      h.Surat,
      h.Ayat_Mulai,
      h.Ayat_Selesai,
      h.Nilai_Kelancaran,
      h.Status,
      h.Keterangan,
      h.Guru_Penilai
    ]);
    await updateSheetValues(spreadsheetId, `Hapalan!A2:K${remaining.length + 1}`, rows, accessToken);
  }
}
