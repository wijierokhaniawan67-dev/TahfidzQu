import React, { useState, useEffect } from "react";
import { addSiswa, getSiswaList, updateSiswa, deleteSiswa } from "../lib/sheetsService";
import { Siswa } from "../types";
import { UserPlus, UserCheck, RefreshCw, AlertTriangle, ListFilter, Pencil, Trash2, X } from "lucide-react";

interface SiswaFormProps {
  spreadsheetId: string;
  accessToken: string;
  appsScriptUrl?: string;
  onSiswaAdded: () => void;
}

export default function SiswaForm({ spreadsheetId, accessToken, appsScriptUrl, onSiswaAdded }: SiswaFormProps) {
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  
  // Edit state
  const [siswaToEdit, setSiswaToEdit] = useState<Siswa | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [isLoadingSiswa, setIsLoadingSiswa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate simple short unique ID
  const generateSiswaId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SW-${result}`;
  };

  const loadSiswa = async () => {
    setIsLoadingSiswa(true);
    setError(null);
    try {
      const data = await getSiswaList(spreadsheetId, accessToken, appsScriptUrl);
      setSiswaList(data);
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

  const handleEditInit = (siswa: Siswa) => {
    setSiswaToEdit(siswa);
    setNama(siswa.Nama);
    setKelas(siswa.Kelas);
    setNomorHp(siswa.Nomor_HP_Ortu);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setSiswaToEdit(null);
    setNama("");
    setKelas("");
    setNomorHp("");
    setError(null);
  };

  const handleDelete = async (idSiswa: string) => {
    if (deleteConfirmId !== idSiswa) {
      setDeleteConfirmId(idSiswa);
      // Automatically reset confirmation after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000);
      return;
    }

    setIsLoadingSiswa(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteSiswa(spreadsheetId, idSiswa, accessToken, appsScriptUrl);
      setSuccess("Data siswa berhasil dihapus dari database!");
      setDeleteConfirmId(null);
      // If we are currently editing this student, cancel the edit mode
      if (siswaToEdit && siswaToEdit.ID_Siswa === idSiswa) {
        handleCancelEdit();
      }
      loadSiswa();
      onSiswaAdded();
    } catch (err: any) {
      setError(err.message || "Gagal menghapus data siswa.");
    } finally {
      setIsLoadingSiswa(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !kelas.trim() || !nomorHp.trim()) {
      setError("Semua kolom input wajib diisi.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    // Format phone number to WhatsApp format (replace leading 0 with 62, remove spaces/dashes)
    let formattedPhone = nomorHp.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("8")) {
      formattedPhone = "62" + formattedPhone;
    }

    if (!formattedPhone.startsWith("62")) {
      setError("Format nomor HP tidak valid. Masukkan nomor HP aktif seperti 08123456789.");
      setIsSaving(false);
      return;
    }

    try {
      if (siswaToEdit) {
        // Mode Update
        const updated: Siswa = {
          ...siswaToEdit,
          Nama: nama.trim(),
          Kelas: kelas.trim(),
          Nomor_HP_Ortu: formattedPhone,
        };

        await updateSiswa(spreadsheetId, updated, accessToken, appsScriptUrl);
        setSuccess(`Siswa "${updated.Nama}" berhasil diperbarui!`);
        setSiswaToEdit(null);
      } else {
        // Mode Insert
        const newSiswa: Siswa = {
          ID_Siswa: generateSiswaId(),
          Nama: nama.trim(),
          Kelas: kelas.trim(),
          Nomor_HP_Ortu: formattedPhone,
          Tanggal_Daftar: new Date().toLocaleDateString("id-ID"),
        };

        await addSiswa(spreadsheetId, newSiswa, accessToken, appsScriptUrl);
        setSuccess(`Siswa "${newSiswa.Nama}" berhasil didaftarkan!`);
      }

      setNama("");
      setKelas("");
      setNomorHp("");
      loadSiswa();
      onSiswaAdded();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data siswa.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Input Form Column */}
      <div className="lg:col-span-4 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-fit">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">
                {siswaToEdit ? "Perbarui Data Siswa" : "Input Data Siswa"}
              </h3>
            </div>
            {siswaToEdit && (
              <button 
                onClick={handleCancelEdit}
                className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                title="Batal Edit"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs mb-4 flex items-start gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Nama Lengkap Siswa</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Ahmad Fauzi"
                className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Kelas</label>
              <input
                type="text"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                placeholder="Contoh: 4-A"
                className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Nomor WhatsApp Ortu</label>
              <input
                type="tel"
                value={nomorHp}
                onChange={(e) => setNomorHp(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1.5 block leading-normal">Nomor ini digunakan untuk mengirimkan laporan otomatis via link WhatsApp ke Orang Tua.</span>
            </div>

            <div className="flex gap-2 pt-2">
              {siswaToEdit && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-100"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : siswaToEdit ? (
                  <>Perbarui Siswa</>
                ) : (
                  <>Simpan Data Siswa</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List Column */}
      <div className="lg:col-span-8 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Daftar Siswa Terdaftar</h3>
          </div>
          <button
            onClick={loadSiswa}
            disabled={isLoadingSiswa}
            className="text-xs flex items-center gap-1.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSiswa ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {isLoadingSiswa && siswaList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs">Memuat daftar siswa dari Google Sheets...</p>
          </div>
        ) : siswaList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8" />
            </div>
            <p className="text-slate-500 font-bold text-sm">Belum ada data siswa terdaftar.</p>
            <p className="text-xs text-slate-450 mt-1 max-w-sm leading-relaxed">
              Gunakan formulir di sebelah kiri untuk mendaftarkan siswa pertama Anda. Data akan tersimpan secara real-time di Google Sheets terhubung Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-slate-450 text-[10px] font-extrabold uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3.5 px-4 rounded-l-xl">ID</th>
                  <th className="py-3.5 px-4">Nama Lengkap</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-4">Nomor HP Ortu</th>
                  <th className="py-3.5 px-4 rounded-r-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {siswaList.map((siswa) => (
                  <tr key={siswa.ID_Siswa} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{siswa.ID_Siswa}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-800 text-sm">{siswa.Nama}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-amber-100/80 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                        Kelas {siswa.Kelas}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">+{siswa.Nomor_HP_Ortu}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex gap-1.5 justify-end">
                        <button
                          onClick={() => handleEditInit(siswa)}
                          className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all"
                          title="Edit Siswa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(siswa.ID_Siswa)}
                          className={`px-2.5 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 border ${
                            deleteConfirmId === siswa.ID_Siswa
                              ? "bg-red-500 hover:bg-red-600 text-white border-red-500 animate-pulse"
                              : "bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border-slate-200 hover:border-red-200"
                          }`}
                          title="Hapus Siswa"
                        >
                          {deleteConfirmId === siswa.ID_Siswa ? (
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
  );
}
