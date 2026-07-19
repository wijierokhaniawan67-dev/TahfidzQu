export interface Siswa {
  ID_Siswa: string;
  Nama: string;
  Kelas: string;
  Nomor_HP_Ortu: string; // WhatsApp format: e.g. "628123456789"
  Tanggal_Daftar: string;
}

export interface Hapalan {
  ID_Hapalan: string;
  ID_Siswa: string;
  Tanggal: string;
  Juz: number;
  Surat: string; // Name of surah
  Ayat_Mulai: number;
  Ayat_Selesai: number;
  Nilai_Kelancaran: number | string; // e.g. 1-100 or grade
  Status: "Lanjut" | "Ulang";
  Keterangan: string;
  Guru_Penilai: string;
}

export interface AppUser {
  ID_User: string;
  Username: string;
  Password?: string;
  Nama: string;
  Role: "Admin" | "Guru";
}
