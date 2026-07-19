import React, { useState, useEffect } from "react";
import { getSiswaList, getHapalanList, updateHapalan, deleteHapalan } from "../lib/sheetsService";
import { Siswa, Hapalan } from "../types";
import { 
  Calendar, 
  RefreshCw, 
  Send, 
  TrendingUp, 
  Award, 
  Clock, 
  FileSpreadsheet, 
  CheckCircle, 
  HelpCircle,
  Pencil,
  Trash2,
  X
} from "lucide-react";

interface ProgressReportProps {
  spreadsheetId: string;
  accessToken: string;
  appsScriptUrl?: string;
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function ProgressReport({ spreadsheetId, accessToken, appsScriptUrl }: ProgressReportProps) {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [allHapalanList, setAllHapalanList] = useState<Hapalan[]>([]);

  // Selected filters
  const [selectedSiswaId, setSelectedSiswaId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(-1); // -1 means "All Months"

  // Loading / error flags
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit / Delete States
  const [hapalanToEdit, setHapalanToEdit] = useState<Hapalan | null>(null);
  const [editJuz, setEditJuz] = useState<number>(30);
  const [editSurat, setEditSurat] = useState<string>("");
  const [editAyatMulai, setEditAyatMulai] = useState<number>(1);
  const [editAyatSelesai, setEditAyatSelesai] = useState<number>(1);
  const [editNilai, setEditNilai] = useState<number>(85);
  const [editStatus, setEditStatus] = useState<"Lanjut" | "Ulang">("Lanjut");
  const [editKeterangan, setEditKeterangan] = useState<string>("");

  const [deleteConfirmHapalanId, setDeleteConfirmHapalanId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [siswa, hapalan] = await Promise.all([
        getSiswaList(spreadsheetId, accessToken, appsScriptUrl),
        getHapalanList(spreadsheetId, accessToken, appsScriptUrl),
      ]);
      setSiswaList(siswa);
      setAllHapalanList(hapalan);

      if (siswa.length > 0 && !selectedSiswaId) {
        setSelectedSiswaId(siswa[0].ID_Siswa);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data laporan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (spreadsheetId && (accessToken || appsScriptUrl)) {
      loadData();
    }
  }, [spreadsheetId, accessToken, appsScriptUrl]);

  const activeSiswa = siswaList.find((s) => s.ID_Siswa === selectedSiswaId);

  // Filter student hapalan list
  const studentHapalan = allHapalanList.filter((h) => h.ID_Siswa === selectedSiswaId);

  // Parse tanggal (DD/MM/YYYY) to month index
  const getMonthIndexFromDate = (dateStr: string): number => {
    try {
      const parts = dateStr.split(/[-/]/);
      if (parts.length >= 3) {
        const month = parseInt(parts[1], 10);
        return month - 1; // 0-indexed
      }
    } catch (e) {
      console.error("Error parsing date", dateStr);
    }
    return -1;
  };

  const filteredHapalan = studentHapalan.filter((h) => {
    if (selectedMonth === -1) return true;
    return getMonthIndexFromDate(h.Tanggal) === selectedMonth;
  });

  // Calculate statistics
  const totalSetoran = filteredHapalan.length;
  const lanjutSetoran = filteredHapalan.filter((h) => h.Status === "Lanjut").length;
  const ulangSetoran = filteredHapalan.filter((h) => h.Status === "Ulang").length;
  const avgNilai = totalSetoran > 0
    ? Math.round(
        filteredHapalan.reduce((sum, h) => sum + (Number(h.Nilai_Kelancaran) || 0), 0) / totalSetoran
      )
    : 0;

  const lanjutPercentage = totalSetoran > 0 ? Math.round((lanjutSetoran / totalSetoran) * 100) : 0;

  // Generate WhatsApp report url for individual assessment
  const handleSendWA = (hapalan: Hapalan) => {
    if (!activeSiswa) return "";
    const text = `*LAPORAN SETORAN HAFALAN AL-QURAN DAILY* 🌸\n\n_Assalamu'alaikum Warahmatullahi Wabarakatuh._\n\nBapak/Ibu Orang Tua Wali dari Ananda *${activeSiswa.Nama}* (Kelas *${activeSiswa.Kelas}*), berikut kami laporkan pencapaian setoran hafalan ananda hari ini:\n\n📅 *Hari, Tanggal:* ${hapalan.Tanggal}\n📖 *Juz:* ${hapalan.Juz}\n🕌 *Surat:* ${hapalan.Surat}\n🔢 *Ayat:* ${hapalan.Ayat_Mulai} - ${hapalan.Ayat_Selesai}\n⭐ *Nilai Kelancaran:* ${hapalan.Nilai_Kelancaran}\n📝 *Hasil Penilaian:* *${hapalan.Status === "Lanjut" ? "✅ Lanjut" : "🔄 Perlu Diulang"}*\n🗣️ *Keterangan Guru:* "${hapalan.Keterangan}"\n\n_Syukron wa Jazaakumullahu Khairan._\n_-- Guru Tahfizh Al-Quran (${hapalan.Guru_Penilai}) --_`;

    return `https://api.whatsapp.com/send?phone=${activeSiswa.Nomor_HP_Ortu}&text=${encodeURIComponent(text)}`;
  };

  // Generate Monthly progress report text
  const generateMonthlyWAReport = () => {
    if (!activeSiswa || filteredHapalan.length === 0) return "";
    const monthName = selectedMonth === -1 ? "Keseluruhan" : MONTHS_ID[selectedMonth];

    let listText = "";
    filteredHapalan.forEach((h, index) => {
      listText += `${index + 1}. [${h.Tanggal}] - Surah ${h.Surat} (${h.Ayat_Mulai}-${h.Ayat_Selesai}) | Nilai: ${h.Nilai_Kelancaran} | Status: *${h.Status}*\n`;
    });

    const text = `*LAPORAN PERKEMBANGAN BULANAN TAHFIZH* 🌸\n\n_Assalamu'alaikum Warahmatullahi Wabarakatuh._\n\nBerikut adalah laporan rangkuman perkembangan hafalan Al-Quran Ananda *${activeSiswa.Nama}* (Kelas *${activeSiswa.Kelas}*) periode *${monthName}*:\n\n📊 *Rangkuman Statistik:* \n• Total Setoran: ${totalSetoran} Kali\n• Rata-rata Nilai Kelancaran: ⭐ ${avgNilai}\n• Persentase Lulus: ${lanjutPercentage}%\n\n📜 *Detail Riwayat Setoran:* \n${listText}\n📝 *Saran/Evaluasi:* Tetap semangat menjaga hafalan (muraja'ah) secara konsisten di rumah.\n\n_Syukron wa Jazaakumullahu Khairan._\n_-- Tim Pengajar Tahfizh Al-Quran --_`;

    return `https://api.whatsapp.com/send?phone=${activeSiswa.Nomor_HP_Ortu}&text=${encodeURIComponent(text)}`;
  };

  // Handle Init Edit Hapalan
  const handleEditInit = (hapalan: Hapalan) => {
    setHapalanToEdit(hapalan);
    setEditJuz(hapalan.Juz);
    setEditSurat(hapalan.Surat);
    setEditAyatMulai(hapalan.Ayat_Mulai);
    setEditAyatSelesai(hapalan.Ayat_Selesai);
    setEditNilai(Number(hapalan.Nilai_Kelancaran));
    setEditStatus(hapalan.Status);
    setEditKeterangan(hapalan.Keterangan);
    setError(null);
    setSuccess(null);
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hapalanToEdit) return;

    if (editAyatMulai < 1 || editAyatSelesai < 1) {
      setError("Ayat mulai dan selesai tidak boleh kurang dari 1.");
      return;
    }

    if (editAyatMulai > editAyatSelesai) {
      setError("Ayat selesai tidak boleh lebih kecil dari Ayat mulai.");
      return;
    }

    setIsSavingEdit(true);
    setError(null);
    setSuccess(null);

    const updated: Hapalan = {
      ...hapalanToEdit,
      Juz: Number(editJuz),
      Surat: editSurat.trim(),
      Ayat_Mulai: Number(editAyatMulai),
      Ayat_Selesai: Number(editAyatSelesai),
      Nilai_Kelancaran: Number(editNilai),
      Status: editStatus,
      Keterangan: editKeterangan.trim(),
    };

    try {
      await updateHapalan(spreadsheetId, updated, accessToken, appsScriptUrl);
      setSuccess("Penilaian hafalan berhasil diperbarui!");
      setHapalanToEdit(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Gagal memperbarui data penilaian.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete Hapalan
  const handleDeleteHapalan = async (idHapalan: string) => {
    if (deleteConfirmHapalanId !== idHapalan) {
      setDeleteConfirmHapalanId(idHapalan);
      setTimeout(() => setDeleteConfirmHapalanId(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteHapalan(spreadsheetId, idHapalan, accessToken, appsScriptUrl);
      setSuccess("Catatan penilaian hafalan berhasil dihapus dari database!");
      setDeleteConfirmHapalanId(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Gagal menghapus catatan penilaian.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Filters Card */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Filter Laporan Perkembangan</h3>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="text-xs flex items-center gap-1.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh Laporan
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Siswa Select */}
          <div>
            <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Siswa</label>
            <select
              value={selectedSiswaId}
              onChange={(e) => setSelectedSiswaId(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="" disabled>-- Pilih Siswa --</option>
              {siswaList.map((siswa) => (
                <option key={siswa.ID_Siswa} value={siswa.ID_Siswa}>
                  {siswa.Nama} (Kelas {siswa.Kelas})
                </option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div>
            <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Bulan Laporan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value={-1}>Semua Periode / Bulanan</option>
              {MONTHS_ID.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Send Monthly WA Report Button */}
          <div className="flex items-end">
            <a
              href={generateMonthlyWAReport()}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 ${
                !activeSiswa || filteredHapalan.length === 0 ? "opacity-45 pointer-events-none" : ""
              }`}
            >
              <Send className="w-4 h-4 shrink-0" /> Kirim Laporan Bulanan via WA
            </a>
          </div>
        </div>
      </div>

      {isLoading && allHapalanList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400 bg-white border border-slate-150 rounded-3xl">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-xs">Menganalisis dan menyusun data perkembangan...</p>
        </div>
      ) : !activeSiswa ? (
        <div className="text-center py-12 bg-white border border-slate-150 rounded-3xl">
          <p className="text-slate-550 font-bold text-sm">Silakan hubungkan database dan daftarkan siswa terlebih dahulu.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* STATS OVERVIEW BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stat 1 */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Setoran</span>
                <span className="text-2xl font-black text-slate-800">{totalSetoran}</span>
                <span className="text-xs text-slate-400 ml-1">Kali</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-700">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Kelancaran</span>
                <span className="text-2xl font-black text-slate-800">
                  {avgNilai > 0 ? `⭐ ${avgNilai}` : "0"}
                </span>
                <span className="text-xs text-slate-400 ml-1">/100</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Lanjut</span>
                <span className="text-2xl font-black text-emerald-700">{lanjutPercentage}%</span>
                <span className="text-[10px] text-slate-450 font-bold block mt-0.5">{lanjutSetoran} Lanjut / {ulangSetoran} Ulang</span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-700">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wali WhatsApp</span>
                <span className="text-xs font-bold font-mono text-slate-700 block mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  +{activeSiswa.Nomor_HP_Ortu}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Terhubung</span>
              </div>
            </div>
          </div>

          {/* Bento Monthly Sparklines Card */}
          {filteredHapalan.length > 0 && (
            <div className="bg-amber-50/70 rounded-3xl border border-amber-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-sm font-black text-amber-950 uppercase tracking-wider">Visualisasi Kelancaran Setoran</h2>
                <span className="bg-amber-200/80 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider">
                  {selectedMonth === -1 ? "Semua Periode" : MONTHS_ID[selectedMonth]}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl shadow-xs border border-amber-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nilai Tertinggi</p>
                  <p className="text-2xl font-black text-emerald-600">
                    {filteredHapalan.length > 0 ? Math.max(...filteredHapalan.map(h => Number(h.Nilai_Kelancaran) || 0)) : 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-xs border border-amber-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nilai Terendah</p>
                  <p className="text-2xl font-black text-amber-600">
                    {filteredHapalan.length > 0 ? Math.min(...filteredHapalan.map(h => Number(h.Nilai_Kelancaran) || 0)) : 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-xs border border-amber-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Tingkat Ketuntasan</p>
                  <p className="text-2xl font-black text-emerald-600">{lanjutPercentage}%</p>
                </div>
              </div>
              <div className="h-20 flex items-end gap-1.5 px-2">
                {filteredHapalan.slice(-12).map((h, i) => {
                  const val = Number(h.Nilai_Kelancaran) || 50;
                  const heightPercent = Math.max(20, Math.round(((val - 50) / 50) * 80 + 20));
                  return (
                    <div
                      key={i}
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        val >= 85 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-400 hover:bg-amber-500"
                      }`}
                      title={`${h.Surat} (${h.Ayat_Mulai}-${h.Ayat_Selesai}) - Nilai: ${val}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-amber-800/80 mt-2 font-bold uppercase tracking-widest">
                <span>← Setoran Terdahulu</span>
                <span>Setoran Terakhir →</span>
              </div>
            </div>
          )}

          {/* TABLE RIWAYAT SETORAN */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
            <h4 className="font-extrabold text-slate-800 text-sm mb-4 tracking-tight uppercase">Riwayat Setoran Hafalan Siswa</h4>
 
            {filteredHapalan.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-3">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <p className="text-slate-500 font-bold text-xs">Tidak ditemukan data setoran pada periode ini.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Siswa belum menyetorkan hafalan atau pilih bulan lain.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest bg-slate-50/50">
                      <th className="py-3 px-4 rounded-l-xl">Tanggal</th>
                      <th className="py-3 px-4">Surat / Juz</th>
                      <th className="py-3 px-4">Ayat</th>
                      <th className="py-3 px-4">Nilai</th>
                      <th className="py-3 px-4">Keputusan</th>
                      <th className="py-3 px-4">Catatan Evaluasi</th>
                      <th className="py-3 px-4 rounded-r-xl text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredHapalan.map((item) => (
                      <tr key={item.ID_Hapalan} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-500 whitespace-nowrap">
                          {item.Tanggal}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-850 block">{item.Surat}</span>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Juz {item.Juz}</span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold font-mono whitespace-nowrap">
                          Ayat {item.Ayat_Mulai} - {item.Ayat_Selesai}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full font-mono">
                            ⭐ {item.Nilai_Kelancaran}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            item.Status === "Lanjut"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {item.Status === "Lanjut" ? "Lanjut" : "Ulang"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs italic text-slate-500 max-w-xs overflow-hidden text-ellipsis">
                          "{item.Keterangan}"
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex gap-1.5 justify-end">
                            <a
                              href={handleSendWA(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-slate-50 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all"
                              title="Kirim Laporan WA"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleEditInit(item)}
                              className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-xl transition-all"
                              title="Edit Penilaian"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHapalan(item.ID_Hapalan)}
                              className={`px-2 py-1 rounded-xl text-[9px] font-black transition-all flex items-center gap-1 border ${
                                deleteConfirmHapalanId === item.ID_Hapalan
                                  ? "bg-red-500 hover:bg-red-600 text-white border-red-500 animate-pulse"
                                  : "bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border-slate-200 hover:border-red-200"
                              }`}
                              title="Hapus Penilaian"
                            >
                              {deleteConfirmHapalanId === item.ID_Hapalan ? (
                                <span>Yakin Hapus?</span>
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL FOR HAPALAN */}
      {hapalanToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setHapalanToEdit(null)} />
          <div className="relative bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Edit Penilaian Hafalan</h3>
              <button 
                onClick={() => setHapalanToEdit(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Surat</label>
                <input
                  type="text"
                  value={editSurat}
                  onChange={(e) => setEditSurat(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Juz</label>
                  <input
                    type="number"
                    value={editJuz}
                    onChange={(e) => setEditJuz(Number(e.target.value))}
                    min={1}
                    max={30}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ayat Mulai</label>
                  <input
                    type="number"
                    value={editAyatMulai}
                    onChange={(e) => setEditAyatMulai(Number(e.target.value))}
                    min={1}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ayat Selesai</label>
                  <input
                    type="number"
                    value={editAyatSelesai}
                    onChange={(e) => setEditAyatSelesai(Number(e.target.value))}
                    min={1}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nilai Kelancaran</label>
                  <input
                    type="number"
                    value={editNilai}
                    onChange={(e) => setEditNilai(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "Lanjut" | "Ulang")}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-bold"
                  >
                    <option value="Lanjut">Lanjut</option>
                    <option value="Ulang">Ulang</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Catatan Evaluasi / Keterangan</label>
                <textarea
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all leading-normal"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHapalanToEdit(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold py-2.5 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>Simpan</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
