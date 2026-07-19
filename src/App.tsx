import React, { useState, useEffect } from "react";
import { googleSignIn, logout as googleLogout } from "./lib/firebaseAuth";
import { getUsersList } from "./lib/sheetsService";
import { AppUser } from "./types";
import {
  BookOpen,
  Users,
  Database,
  BarChart2,
  UserCheck,
  LogOut,
  RefreshCw,
  Menu,
  X,
  ChevronRight,
  Shield,
  Key,
  User,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

// Import Components
import DatabaseConfig from "./components/DatabaseConfig";
import SiswaForm from "./components/SiswaForm";
import HapalanForm from "./components/HapalanForm";
import ProgressReport from "./components/ProgressReport";
import UserManagement from "./components/UserManagement";

export default function App() {
  // Session State
  const [sessionUser, setSessionUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App specific state
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [appsScriptUrl, setAppsScriptUrl] = useState("");
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<"Admin" | "Guru" | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Login inputs
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Mobile Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Active Menu / Tab
  const [activeTab, setActiveTab] = useState<"setoran" | "laporan" | "siswa" | "users" | "config">("setoran");

  // Load config and session on mount
  useEffect(() => {
    const initApp = async () => {
      // 1. Load config from server
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data.spreadsheetId) {
            setSpreadsheetId(data.spreadsheetId);
          }
          if (data.appsScriptUrl) {
            setAppsScriptUrl(data.appsScriptUrl);
          }
          if (data.googleAccessToken) {
            setToken(data.googleAccessToken);
          }
        }
      } catch (e) {
        console.error("Gagal memuat konfigurasi dari server:", e);
      } finally {
        setIsConfigLoaded(true);
      }

      // 2. Load session user if exists
      const savedSession = sessionStorage.getItem("tahfidz_session_user");
      if (savedSession) {
        try {
          const parsed: AppUser = JSON.parse(savedSession);
          setSessionUser(parsed);
          setCurrentUserRole(parsed.Role);
          setCurrentUserName(parsed.Nama);
        } catch (e) {
          console.error("Gagal memulihkan sesi:", e);
        }
      }
    };

    initApp();
  }, []);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanUsername || !cleanPassword) {
      setAuthError("Username dan Password wajib diisi.");
      setIsLoggingIn(false);
      return;
    }

    // 1. Fallback / Emergency Admin Login
    if (cleanUsername === "admin" && cleanPassword === "admin123") {
      const adminSession: AppUser = {
        ID_User: "US-ADMIN",
        Username: "admin",
        Password: "admin123",
        Nama: "Administrator Utama",
        Role: "Admin",
      };
      setSessionUser(adminSession);
      setCurrentUserRole("Admin");
      setCurrentUserName("Administrator Utama");
      sessionStorage.setItem("tahfidz_session_user", JSON.stringify(adminSession));
      setIsLoggingIn(false);
      
      // Force database connection view if not configured
      if (!spreadsheetId) {
        setActiveTab("config");
      }
      return;
    }

    // 2. Normal database-backed login
    if (!spreadsheetId) {
      setAuthError(
        "Aplikasi belum dikonfigurasi dengan Spreadsheet. Gunakan username 'admin' & password 'admin123' untuk mengonfigurasi database terlebih dahulu."
      );
      setIsLoggingIn(false);
      return;
    }

    if (!token && !appsScriptUrl) {
      setAuthError(
        "Koneksi Google Sheets kosong. Silakan login sebagai 'admin' lalu hubungkan akun Google atau gunakan URL Google Apps Script di menu Kelola Database."
      );
      setIsLoggingIn(false);
      return;
    }

    try {
      const usersList = await getUsersList(spreadsheetId, token || "", appsScriptUrl || undefined);
      const matched = usersList.find(
        (u) => u.Username.toLowerCase() === cleanUsername && u.Password === cleanPassword
      );

      if (matched) {
        setSessionUser(matched);
        setCurrentUserRole(matched.Role);
        setCurrentUserName(matched.Nama);
        sessionStorage.setItem("tahfidz_session_user", JSON.stringify(matched));
      } else {
        setAuthError("Username atau Password salah. Silakan coba lagi.");
      }
    } catch (err: any) {
      console.error("Gagal melakukan login:", err);
      setAuthError(
        `Gagal memvalidasi kredensial ke database Google Sheets: ${err.message || "Pastikan URL Google Apps Script atau Token sudah benar."}`
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAuthorizeGoogle = async () => {
    setIsAuthorizing(true);
    try {
      const result = await googleSignIn();
      if (result && result.accessToken) {
        setToken(result.accessToken);
        
        // Save token directly to backend config so it's globally available
        const response = await fetch("/api/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            spreadsheetId,
            appsScriptUrl,
            googleAccessToken: result.accessToken,
          }),
        });
        
        if (response.ok) {
          alert("Otorisasi Google Sheets berhasil diperbarui dan disimpan ke server!");
        } else {
          alert("Otorisasi Google Sheets diperbarui di browser, tetapi gagal disimpan di server.");
        }
      }
    } catch (err: any) {
      console.error("Gagal memperbarui otorisasi Google:", err);
      alert("Gagal memperbarui otorisasi Google: " + err.message);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar dari aplikasi?");
    if (!confirmLogout) return;

    setSessionUser(null);
    setCurrentUserRole(null);
    setCurrentUserName("");
    sessionStorage.removeItem("tahfidz_session_user");
    setUsernameInput("");
    setPasswordInput("");
  };

  // Render Login state
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full p-8 space-y-6 animate-in fade-in duration-300">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-emerald-850 tracking-tight">TahfidzQu</h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Sistem pencatatan setoran hafalan harian dan laporan perkembangan siswa, terintegrasi langsung dengan database Google Sheets & Apps Script.
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs flex items-start gap-2">
              <Shield className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{authError}</span>
            </div>
          )}

          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Username</label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Password</label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password Anda"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span>Masuk Aplikasi</span>
              )}
            </button>
          </form>

          <div className="border-t border-slate-100 pt-4 text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">
              Gunakan username <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800">admin</code> & password <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800">admin123</code> untuk login darurat / inisialisasi pertama kali.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Render Loading state while config loads
  if (!isConfigLoaded || isAuthorizing) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Menghubungkan & Memvalidasi Aplikasi...</p>
        </div>
      </div>
    );
  }

  const isDbConfigured = !!spreadsheetId;

  const sidebarItems = [
    {
      id: "setoran",
      label: "Catat Setoran",
      icon: BookOpen,
      role: ["Admin", "Guru"],
      disabled: !isDbConfigured,
    },
    {
      id: "laporan",
      label: "Laporan Perkembangan",
      icon: BarChart2,
      role: ["Admin", "Guru"],
      disabled: !isDbConfigured,
    },
    {
      id: "siswa",
      label: "Data Siswa (CRUD)",
      icon: Users,
      role: ["Admin", "Guru"],
      disabled: !isDbConfigured,
    },
    {
      id: "users",
      label: "Kelola User",
      icon: UserCheck,
      role: ["Admin"],
      disabled: !isDbConfigured,
    },
    {
      id: "config",
      label: "Kelola Database",
      icon: Database,
      role: ["Admin"],
      disabled: false,
    },
  ];

  const handleTabSelect = (tabId: any, disabled: boolean) => {
    if (disabled) {
      alert("Database belum dikonfigurasi. Selesaikan langkah koneksi database terlebih dahulu.");
      return;
    }
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      
      {/* DESKTOP SIDEBAR (Laravel-Style) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-emerald-950/50">
            🕌
          </div>
          <div>
            <h1 className="font-extrabold text-white tracking-tight leading-tight text-base">TahfidzQu</h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Laravel Edition</p>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-7">
          <div className="space-y-1.5">
            <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3">Menu Utama</span>
            {sidebarItems
              .filter((item) => item.role.includes(currentUserRole || "Guru") && ["setoran", "laporan", "siswa"].includes(item.id))
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id, item.disabled)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20"
                        : "hover:bg-slate-800/60 hover:text-slate-100 text-slate-400"
                    } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {!item.disabled && <ChevronRight className="w-3 h-3 opacity-60" />}
                  </button>
                );
              })}
          </div>

          {currentUserRole === "Admin" && (
            <div className="space-y-1.5">
              <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3">Sistem Administrasi</span>
              {sidebarItems
                .filter((item) => item.role.includes(currentUserRole || "Guru") && ["users", "config"].includes(item.id))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id, item.disabled)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20"
                          : "hover:bg-slate-800/60 hover:text-slate-100 text-slate-400"
                      } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {!item.disabled && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </button>
                  );
                })}
            </div>
          )}
        </nav>

        {/* User Badge bottom */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
              {currentUserName ? currentUserName.slice(0, 2) : "AD"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate leading-tight">{currentUserName}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">{currentUserRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Aplikasi</span>
          </button>
        </div>
      </aside>

      {/* MOBILE SIDEBAR PANEL */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-slate-900 text-slate-300 h-full p-0">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg">
                  🕌
                </div>
                <div>
                  <h1 className="font-extrabold text-white tracking-tight leading-tight text-base">TahfidzQu</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Laravel Style</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto">
              <div className="space-y-1.5">
                <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Menu Utama</span>
                {sidebarItems
                  .filter((item) => item.role.includes(currentUserRole || "Guru") && ["setoran", "laporan", "siswa"].includes(item.id))
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabSelect(item.id, item.disabled)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive ? "bg-emerald-600 text-white" : "hover:bg-slate-800 text-slate-400"
                        } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {currentUserRole === "Admin" && (
                <div className="space-y-1.5">
                  <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Sistem Administrasi</span>
                  {sidebarItems
                    .filter((item) => item.role.includes(currentUserRole || "Guru") && ["users", "config"].includes(item.id))
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleTabSelect(item.id, item.disabled)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive ? "bg-emerald-600 text-white" : "hover:bg-slate-800 text-slate-400"
                          } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center justify-center font-bold text-xs">
                  {currentUserName ? currentUserName.slice(0, 2) : "AD"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white truncate leading-tight">{currentUserName}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{currentUserRole}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP PANEL HEADER */}
        <header className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 text-slate-500 hover:text-slate-850 md:hidden cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="hover:text-slate-600 transition-colors uppercase">Aplikasi</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-700 uppercase font-black tracking-tight">
                {sidebarItems.find((s) => s.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-800 leading-tight">{currentUserName}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">{currentUserRole}</p>
            </div>
            <div className="w-px h-6 bg-slate-150 hidden sm:block" />
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* Lock message if database not configured and role is Guru */}
          {!isDbConfigured && currentUserRole === "Guru" ? (
            <div className="max-w-md mx-auto text-center py-20 space-y-6">
              <div className="w-20 h-20 bg-amber-50 border border-amber-200 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
                <Database className="w-10 h-10 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-850">Koneksi Database Belum Diatur</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Sebelum memulai pencatatan dan penilaian hafalan Al-Quran siswa, database aplikasi harus dikonfigurasikan dan dihubungkan terlebih dahulu oleh Administrator Utama.
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-xs text-amber-800 font-semibold leading-relaxed">
                Mohon hubungi Administrator Utama untuk segera mengonfigurasikan ID Spreadsheet dan menginstal tabel di menu Kelola Database.
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              {activeTab === "setoran" && (
                <HapalanForm
                  spreadsheetId={spreadsheetId}
                  accessToken={token || ""}
                  appsScriptUrl={appsScriptUrl}
                  currentUserEmail={sessionUser?.Username || "admin"}
                  currentUserName={currentUserName}
                  onHapalanAdded={() => {}}
                />
              )}

              {activeTab === "laporan" && (
                <ProgressReport
                  spreadsheetId={spreadsheetId}
                  accessToken={token || ""}
                  appsScriptUrl={appsScriptUrl}
                />
              )}

              {activeTab === "siswa" && (
                <SiswaForm
                  spreadsheetId={spreadsheetId}
                  accessToken={token || ""}
                  appsScriptUrl={appsScriptUrl}
                  onSiswaAdded={() => {}}
                />
              )}

              {activeTab === "users" && currentUserRole === "Admin" && (
                <UserManagement
                  spreadsheetId={spreadsheetId}
                  accessToken={token || ""}
                  appsScriptUrl={appsScriptUrl}
                  currentUserUsername={sessionUser?.Username || "admin"}
                />
              )}

              {activeTab === "config" && currentUserRole === "Admin" && (
                <DatabaseConfig
                  accessToken={token || ""}
                  adminEmail={sessionUser?.Username || "admin"}
                  adminName={currentUserName || "Administrator Utama"}
                  currentSpreadsheetId={spreadsheetId}
                  currentAppsScriptUrl={appsScriptUrl}
                  onConfigSaved={(id, scriptUrl) => {
                    setSpreadsheetId(id);
                    setAppsScriptUrl(scriptUrl);
                  }}
                  isAdmin={currentUserRole === "Admin"}
                  onAuthorizeGoogle={handleAuthorizeGoogle}
                />
              )}
            </div>
          )}
        </main>

        {/* FOOTER */}
        <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-[10px] text-slate-400 font-semibold shrink-0">
          <p>© 2026 TahfidzQu • Laravel-Aesthetic Panel. Powered by Google Sheets API.</p>
        </footer>
      </div>

    </div>
  );
}
