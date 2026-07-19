import React, { useState, useEffect } from "react";
import { getSiswaList, addHapalan } from "../lib/sheetsService";
import { SURAH_LIST, Surah, getSurahsByJuz } from "../lib/quranData";
import { Siswa, Hapalan } from "../types";
import { BookOpen, AlertTriangle, Check, RefreshCw, Send, Sparkles, Star } from "lucide-react";

interface HapalanFormProps {
  spreadsheetId: string;
  accessToken: string;
  appsScriptUrl?: string;
  currentUserEmail: string;
  currentUserName: string;
  onHapalanAdded: () => void;
}

export default function HapalanForm({
  spreadsheetId,
  accessToken,
  appsScriptUrl,
  currentUserEmail,
  currentUserName,
  onHapalanAdded,
}: HapalanFormProps) {
  // Lists
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [filteredSurahList, setFilteredSurahList] = useState<Surah[]>([]);

  // State flags
  const [isLoadingSiswa, setIsLoadingSiswa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [selectedSiswaId, setSelectedSiswaId] = useState("");
  const [selectedJuz, setSelectedJuz] = useState<number>(30); // Default to Juz 30 (common)
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(78); // Default An-Naba
  const [ayatMulai, setAyatMulai] = useState<number>(1);
  const [ayatSelesai, setAyatSelesai] = useState<number>(1);
  const [nilaiKelancaran, setNilaiKelancaran] = useState<number>(85); // Default score
  const [status, setStatus] = useState<"Lanjut" | "Ulang">("Lanjut");
  const [keterangan, setKeterangan] = useState("");

  // Saved assessment result for modal/report card
  const [lastSavedHapalan, setLastSavedHapalan] = useState<Hapalan | null>(null);
  const [lastSavedSiswa, setLastSavedSiswa] = useState<Siswa | null>(null);

  // Load students on mount
  const loadSiswa = async () => {
    setIsLoadingSiswa(true);
    setError(null);
    try {
      const list = await getSiswaList(spreadsheetId, accessToken, appsScriptUrl);
      setSiswaList(list);
      if (list.length > 0) {
        setSelectedSiswaId(list[0].ID_Siswa);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat daftar siswa.");
    } finally {
      setIsLoadingSiswa(false);
    }
  };

  useEffect(() => {
    if (spreadsheetId && (accessToken || appsScriptUrl)) {
      loadSiswa();
    }
  }, [spreadsheetId, accessToken, appsScriptUrl]);

  // Handle Juz change to update filtered Surahs
  useEffect(() => {
    const surahsInJuz = getSurahsByJuz(selectedJuz);
    setFilteredSurahList(surahsInJuz);
    if (surahsInJuz.length > 0) {
      // If current selected surah is not in the new Juz, pick the first surah of that Juz
      const alreadyInList = surahsInJuz.some((s) => s.number === selectedSurahNumber);
      if (!alreadyInList) {
        setSelectedSurahNumber(surahsInJuz[0].number);
        setAyatMulai(1);
        setAyatSelesai(1);
      }
    }
  }, [selectedJuz]);

  // Adjust max verses when Surah changes
  const activeSurah = SURAH_LIST.find((s) => s.number === selectedSurahNumber);
  const maxVerses = activeSurah ? activeSurah.totalVerses : 286;

  useEffect(() => {
    if (ayatMulai > maxVerses) setAyatMulai(maxVerses);
    if (ayatSelesai > maxVerses) setAyatSelesai(maxVerses);
    if (ayatMulai > ayatSelesai) setAyatSelesai(ayatMulai);
  }, [selectedSurahNumber, maxVerses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSiswaId) {
      setError("Harap pilih siswa terlebih dahulu.");
      return;
    }

    if (ayatMulai < 1 || ayatSelesai < 1) {
      setError("Ayat mulai dan selesai tidak boleh kurang dari 1.");
      return;
    }

    if (ayatMulai > ayatSelesai) {
      setError("Ayat selesai tidak boleh lebih kecil dari Ayat mulai.");
      return;
    }

    const selectedSiswa = siswaList.find((s) => s.ID_Siswa === selectedSiswaId);
    if (!selectedSiswa) {
      setError("Siswa tidak ditemukan.");
      return;
    }

    const surahName = activeSurah ? activeSurah.name : "Surat Tidak Diketahui";

    const uniqueId = `HAP-${Date.now().toString().slice(-6)}`;
    const newHapalan: Hapalan = {
      ID_Hapalan: uniqueId,
      ID_Siswa: selectedSiswaId,
      Tanggal: new Date().toLocaleDateString("id-ID"),
      Juz: selectedJuz,
      Surat: surahName,
      Ayat_Mulai: Number(ayatMulai),
      Ayat_Selesai: Number(ayatSelesai),
      Nilai_Kelancaran: Number(nilaiKelancaran),
      Status: status,
      Keterangan: keterangan.trim() || "Alhamdulillah lancar.",
      Guru_Penilai: currentUserName || currentUserEmail,
    };

    setIsSaving(true);
    try {
      await addHapalan(spreadsheetId, newHapalan, accessToken, appsScriptUrl);

      // Trigger success report view
      setLastSavedHapalan(newHapalan);
      setLastSavedSiswa(selectedSiswa);

      // Reset form fields slightly while keeping student selected
      setKeterangan("");
      onHapalanAdded();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data penilaian hafalan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Generate WhatsApp text and link
  const generateWhatsAppUrl = (siswa: Siswa, hapalan: Hapalan) => {
    const formattedDate = hapalan.Tanggal;
    const text = `*LAPORAN SETORAN HAFALAN AL-QURAN DAILY* 🌸\n\n_Assalamu'alaikum Warahmatullahi Wabarakatuh._\n\nBapak/Ibu Orang Tua Wali dari Ananda *${siswa.Nama}* (Kelas *${siswa.Kelas}*), berikut kami laporkan pencapaian setoran hafalan ananda hari ini:\n\n📅 *Hari, Tanggal:* ${formattedDate}\n📖 *Juz:* ${hapalan.Juz}\n🕌 *Surat:* ${hapalan.Surat}\n🔢 *Ayat:* ${hapalan.Ayat_Mulai} - ${hapalan.Ayat_Selesai}\n⭐ *Nilai Kelancaran:* ${hapalan.Nilai_Kelancaran}\n📝 *Hasil Penilaian:* *${hapalan.Status === "Lanjut" ? "✅ Lanjut" : "🔄 Perlu Diulang"}*\n🗣️ *Keterangan Guru:* "${hapalan.Keterangan}"\n\n_Syukron wa Jazaakumullahu Khairan._\n_-- Guru Tahfizh Al-Quran (${hapalan.Guru_Penilai}) --_`;

    return `https://api.whatsapp.com/send?phone=${siswa.Nomor_HP_Ortu}&text=${encodeURIComponent(text)}`;
  };

  if (lastSavedHapalan && lastSavedSiswa) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Laporan Penilaian Card */}
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-amber-300 fill-amber-300" />
              <div>
                <h2 className="text-xl font-bold tracking-tight">Laporan Penilaian Hafalan Siswa</h2>
                <p className="text-xs text-emerald-100 mt-0.5">Berhasil disimpan ke Google Sheets</p>
              </div>
            </div>
            <span className="text-xs bg-emerald-900/50 text-white border border-emerald-600 px-3.5 py-1.5 rounded-xl font-bold">
              ID: {lastSavedHapalan.ID_Hapalan}
            </span>
          </div>

          <div className="p-8 space-y-8">
            {/* Student & Score Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nama Siswa</span>
                  <span className="text-lg font-extrabold text-slate-800 block mt-0.5">{lastSavedSiswa.Nama}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Kelas</span>
                  <span className="text-sm font-bold text-slate-600 block mt-0.5">Kelas {lastSavedSiswa.Kelas}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tanggal Setor</span>
                  <span className="text-sm font-bold text-slate-600 block mt-0.5">{lastSavedHapalan.Tanggal}</span>
                </div>
              </div>

              <div className="space-y-4 md:border-l md:pl-6 border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Materi Setoran</span>
                  <span className="text-base font-extrabold text-emerald-800 block mt-0.5">
                    Surat {lastSavedHapalan.Surat} (Ayat {lastSavedHapalan.Ayat_Mulai} - {lastSavedHapalan.Ayat_Selesai})
                  </span>
                  <span className="text-xs text-slate-500 font-semibold block mt-0.5">Juz {lastSavedHapalan.Juz}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nilai Kelancaran</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-base font-black text-slate-850">{lastSavedHapalan.Nilai_Kelancaran} / 100</span>
                    <span className="text-amber-500">
                      {"★".repeat(Math.round(lastSavedHapalan.Nilai_Kelancaran / 20))}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Hasil Evaluasi</span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-1.5 ${
                    lastSavedHapalan.Status === "Lanjut"
                      ? "bg-emerald-100 text-emerald-850"
                      : "bg-amber-100 text-amber-850"
                  }`}>
                    {lastSavedHapalan.Status === "Lanjut" ? "✅ Lanjut Halaman" : "🔄 Perlu Diulang"}
                  </span>
                </div>
              </div>
            </div>

            {/* Note Section */}
            <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Catatan Evaluasi Guru</span>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                "{lastSavedHapalan.Keterangan}"
              </p>
              <div className="mt-4 pt-4 border-t border-slate-200/50 flex justify-between text-[11px] text-slate-400 font-semibold">
                <span>GURU PENILAI: {lastSavedHapalan.Guru_Penilai}</span>
                <span>DB: OK</span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="space-y-4">
              {/* WhatsApp Sender Widget */}
              <div className="bg-emerald-900 rounded-3xl p-6 text-white shadow-lg space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-800 text-emerald-300 rounded-xl">
                    <Send className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Kirim Laporan ke Orang Tua Siswa</h3>
                    <p className="text-xs text-emerald-200">Kirimkan rincian setoran hafalan langsung ke nomor HP Wali murid.</p>
                  </div>
                </div>

                <div className="bg-emerald-850/60 rounded-2xl p-4 border border-emerald-800/50 text-xs text-emerald-100 font-mono">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">Preview Pesan WhatsApp:</p>
                  <p className="leading-relaxed italic">
                    "Assalamu'alaikum Bpk/Ibu, Wali dari Ananda {lastSavedSiswa.Nama}... hari ini telah menyetorkan Surat {lastSavedHapalan.Surat} (Ayat {lastSavedHapalan.Ayat_Mulai} - {lastSavedHapalan.Ayat_Selesai}) dengan Nilai {lastSavedHapalan.Nilai_Kelancaran} ({lastSavedHapalan.Status === "Lanjut" ? "Lanjut" : "Ulang"})..."
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <a
                    href={generateWhatsAppUrl(lastSavedSiswa, lastSavedHapalan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-500 hover:bg-green-400 text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-950/30 text-sm"
                  >
                    Kirim Laporan via WhatsApp
                  </a>
                  <button
                    onClick={() => setLastSavedHapalan(null)}
                    className="px-6 py-3.5 border border-emerald-700 text-emerald-200 hover:bg-emerald-800/40 rounded-2xl text-xs font-bold transition-colors"
                  >
                    Kembali Ke Form
                  </button>
                </div>
              </div>

              {/* Back button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setLastSavedHapalan(null)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold px-6 py-3 rounded-2xl transition-all flex items-center gap-1.5"
                >
                  ← Catat Setoran Hafalan Baru
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Input Form Card */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-amber-300" />
            <div>
              <h2 className="text-xl font-bold tracking-tight">Input Hafalan Harian</h2>
              <p className="text-xs text-emerald-100 mt-0.5">Mendata setoran hafalan dan menerbitkan penilaian langsung.</p>
            </div>
          </div>
          <button
            onClick={loadSiswa}
            disabled={isLoadingSiswa}
            className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSiswa ? "animate-spin" : ""}`} /> Refresh Siswa
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm mb-6 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {siswaList.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-slate-600 font-medium text-sm">Belum ada siswa terdaftar di spreadsheet.</p>
              <p className="text-xs text-slate-400 mt-1">Harap daftarkan siswa terlebih dahulu di menu "Siswa" sebelum memasukkan setoran.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Siswa */}
                <div>
                  <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Pilih Siswa</label>
                  <select
                    value={selectedSiswaId}
                    onChange={(e) => setSelectedSiswaId(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                    required
                  >
                    {siswaList.map((siswa) => (
                      <option key={siswa.ID_Siswa} value={siswa.ID_Siswa}>
                        {siswa.Nama} (Kelas {siswa.Kelas})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Juz */}
                <div>
                  <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Juz Al-Quran</label>
                  <select
                    value={selectedJuz}
                    onChange={(e) => setSelectedJuz(Number(e.target.value))}
                    className="w-full mt-1.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                      <option key={juz} value={juz}>
                        Juz {juz}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Surat */}
                <div>
                  <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Nama Surat</label>
                  <select
                    value={selectedSurahNumber}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setSelectedSurahNumber(num);
                      setAyatMulai(1);
                      setAyatSelesai(1);
                    }}
                    className="w-full mt-1.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  >
                    {filteredSurahList.map((surah) => (
                      <option key={surah.number} value={surah.number}>
                        {surah.number}. {surah.name} ({surah.totalVerses} Ayat)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ayat Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Ayat Mulai</label>
                    <input
                      type="number"
                      min={1}
                      max={maxVerses}
                      value={ayatMulai}
                      onChange={(e) => setAyatMulai(Math.max(1, Math.min(maxVerses, Number(e.target.value))))}
                      className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Ayat Selesai</label>
                    <input
                      type="number"
                      min={ayatMulai}
                      max={maxVerses}
                      value={ayatSelesai}
                      onChange={(e) => setAyatSelesai(Math.max(ayatMulai, Math.min(maxVerses, Number(e.target.value))))}
                      className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Nilai Kelancaran */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Nilai Kelancaran (1 - 100)</label>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" /> {nilaiKelancaran}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={nilaiKelancaran}
                    onChange={(e) => setNilaiKelancaran(Number(e.target.value))}
                    className="w-full mt-3 h-2 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Cukup (50)</span>
                    <span>Baik (80)</span>
                    <span>Sangat Lancar (100)</span>
                  </div>
                </div>

                {/* Penilaian / Status */}
                <div>
                  <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Status Penilaian</label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <label className={`flex items-center justify-center gap-2 border-2 rounded-xl py-3 cursor-pointer text-sm font-bold transition-all ${
                      status === "Lanjut"
                        ? "bg-emerald-50 border-emerald-600 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                    }`}>
                      <input
                        type="radio"
                        name="status"
                        value="Lanjut"
                        checked={status === "Lanjut"}
                        onChange={() => setStatus("Lanjut")}
                        className="hidden"
                      />
                      Lanjut
                    </label>

                    <label className={`flex items-center justify-center gap-2 border-2 rounded-xl py-3 cursor-pointer text-sm font-bold transition-all ${
                      status === "Ulang"
                        ? "bg-amber-50 border-amber-500 text-amber-700"
                        : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                    }`}>
                      <input
                        type="radio"
                        name="status"
                        value="Ulang"
                        checked={status === "Ulang"}
                        onChange={() => setStatus("Ulang")}
                        className="hidden"
                      />
                      Ulang
                    </label>
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Keterangan / Catatan Evaluasi Guru</label>
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Tulis saran makhraj, tajwid, kelancaran di sini... (Contoh: Tajwid lancar, makhraj diperbaiki...)"
                  rows={3}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all resize-none"
                  required
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>Simpan Data Hafalan</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
