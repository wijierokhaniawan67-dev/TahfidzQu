import React, { useState, useEffect } from "react";
import { getUsersList, addAppUser, removeAppUser } from "../lib/sheetsService";
import { AppUser } from "../types";
import { Users, UserPlus, Trash2, AlertTriangle, Check, RefreshCw, Key, Eye, EyeOff } from "lucide-react";

interface UserManagementProps {
  spreadsheetId: string;
  accessToken: string;
  appsScriptUrl?: string;
  currentUserUsername: string;
}

export default function UserManagement({ spreadsheetId, accessToken, appsScriptUrl, currentUserUsername }: UserManagementProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [role, setRole] = useState<"Admin" | "Guru">("Guru");

  // Show/Hide password in form
  const [showPassword, setShowPassword] = useState(false);

  // Delete confirm state
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState<string | null>(null);

  const generateUserId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `US-${result}`;
  };

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await getUsersList(spreadsheetId, accessToken, appsScriptUrl);
      setUsers(list);
    } catch (err: any) {
      setError(err.message || "Gagal memuat daftar pengguna.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (spreadsheetId && (accessToken || appsScriptUrl)) {
      loadUsers();
    }
  }, [spreadsheetId, accessToken, appsScriptUrl]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !nama.trim() || !password.trim()) {
      setError("Semua kolom wajib diisi.");
      return;
    }

    if (cleanUsername.length < 3) {
      setError("Username minimal harus 3 karakter.");
      return;
    }

    setIsSaving(true);
    const newUser: AppUser = {
      ID_User: generateUserId(),
      Username: cleanUsername,
      Password: password,
      Nama: nama.trim(),
      Role: role,
    };

    try {
      await addAppUser(spreadsheetId, newUser, accessToken, appsScriptUrl);
      setUsername("");
      setPassword("");
      setNama("");
      setRole("Guru");
      setSuccess(`Pengguna "${newUser.Nama}" (@${newUser.Username}) berhasil ditambahkan.`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Gagal menambahkan pengguna.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveUser = async (targetUsername: string) => {
    const cleanTarget = targetUsername.toLowerCase();
    if (cleanTarget === currentUserUsername.toLowerCase()) {
      setError("Anda tidak bisa menghapus akun Anda sendiri.");
      return;
    }

    // Protect "admin" default user from deletion to prevent locking out
    if (cleanTarget === "admin") {
      setError("Akun admin utama tidak dapat dihapus demi keamanan.");
      return;
    }

    if (deleteConfirmUsername !== targetUsername) {
      setDeleteConfirmUsername(targetUsername);
      setTimeout(() => setDeleteConfirmUsername(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await removeAppUser(spreadsheetId, targetUsername, accessToken, appsScriptUrl);
      setSuccess(`Pengguna "${targetUsername}" berhasil dihapus.`);
      setDeleteConfirmUsername(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Gagal menghapus pengguna.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Column */}
      <div className="lg:col-span-1 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Tambah User Baru</h3>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-2xl p-4 text-xs mb-4 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: ahmad_fauzi"
                className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Digunakan guru untuk masuk ke aplikasi. Gunakan huruf kecil tanpa spasi.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Ustadz Ahmad Fauzi"
                className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all pr-10 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Hak Akses / Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "Admin" | "Guru")}
                className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-bold"
              >
                <option value="Guru">Guru (Tidak bisa kelola user)</option>
                <option value="Admin">Admin (Bisa kelola user & database)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Mendaftarkan...
                </>
              ) : (
                <>Tambahkan Pengguna</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* List Column */}
      <div className="lg:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Daftar Pengguna Aplikasi</h3>
          </div>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="text-xs flex items-center gap-1 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {isLoading && users.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs">Memuat daftar pengguna dari Google Sheets...</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-slate-450 text-[10px] font-extrabold uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl">ID User</th>
                  <th className="py-3 px-4">Nama Pengguna</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Password</th>
                  <th className="py-3 px-4">Hak Akses</th>
                  <th className="py-3 px-4 rounded-r-xl text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {users.map((user) => (
                  <tr key={user.Username} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">{user.ID_User || "US-TEMP"}</td>
                    <td className="py-3 px-4 font-bold text-slate-850">{user.Nama}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-550 font-bold">@{user.Username}</td>
                    <td className="py-3 px-4 font-mono text-slate-450">{user.Password || "••••••"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        user.Role === "Admin"
                          ? "bg-amber-100 text-amber-950 uppercase"
                          : "bg-emerald-100 text-emerald-950 uppercase"
                      }`}>
                        {user.Role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleRemoveUser(user.Username)}
                        disabled={user.Username.toLowerCase() === currentUserUsername.toLowerCase() || user.Username.toLowerCase() === "admin"}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                          deleteConfirmUsername === user.Username
                            ? "bg-red-500 hover:bg-red-600 text-white border-red-500 animate-pulse"
                            : "bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border-slate-200 hover:border-red-200"
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                        title="Hapus Pengguna"
                      >
                        {deleteConfirmUsername === user.Username ? (
                          <span>Yakin?</span>
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
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
