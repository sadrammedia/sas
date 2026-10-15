// ==========================================
// 1. SISTEM AUTENTIKASI (LOGIN & LOGOUT)
// ==========================================

async function handleLogin() {
    const idInput = document.getElementById('login-id').value.trim();
    const passInput = document.getElementById('login-pass').value;
    const btn = document.getElementById('btn-login');
    const errText = document.getElementById('login-error');
    const currentDeviceId = getDeviceID();
    
    if (!idInput || !passInput) {
        errText.innerText = "ID dan Kata Sandi wajib diisi!";
        errText.classList.remove('hidden');
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengecek Cloud...';
    btn.disabled = true;
    errText.classList.add('hidden');

    try {
        // 1. Cek Siswa Terlebih Dahulu
        let { data: siswa, error: errSiswa } = await db
            .from('tabel_siswa')
            .select('*')
            .eq('nis', idInput)
            .maybeSingle();

        if (siswa) {
            const pwSiswa = siswa.password || '123456';
            if (passInput !== pwSiswa) {
                throw new Error("Kata Sandi Salah!");
            }

            // Validasi Kunci Perangkat (Device Binding)
            if (siswa.device_id && siswa.device_id !== currentDeviceId) {
                throw new Error("Akun ini terikat pada HP lain. Silakan hubungi admin untuk reset perangkat.");
            } else if (!siswa.device_id) {
                await db.from('tabel_siswa').update({ device_id: currentDeviceId }).eq('nis', idInput);
                siswa.device_id = currentDeviceId;
            }

            currentUser = { role: 'siswa', ...siswa };
            localStorage.setItem('app_session', JSON.stringify(currentUser));

            await showScreen('screen-mobile'); // Tarik HTML Siswa dulu!
            setupSiswaDashboard(currentUser);  // Baru isi datanya
            setTimeout(() => { cekUlangTahun(currentUser); }, 1500);
            return;
        }

        // 2. Cek Guru & Admin (Semua berbasis tabel_guru)
        let { data: guru, error: errGuru } = await db
            .from('tabel_guru')
            .select('*')
            .eq('nip', idInput)
            .maybeSingle();

        if (guru) {
            const pwGuru = guru.password || '123456';
            if (passInput !== pwGuru) {
                throw new Error("Kata Sandi Salah!");
            }

            // Deteksi Role Berdasarkan Jabatan
            const isRoleAdmin = guru.jabatan && (
                guru.jabatan.toLowerCase().includes('admin') || 
                guru.jabatan.toLowerCase().includes('master')
            );
            const userRole = isRoleAdmin ? 'admin' : 'guru';

            // Validasi Device Binding (Opsional untuk Admin jika tidak ingin terikat 1 HP)
            if (!isRoleAdmin) {
                if (guru.device_id && guru.device_id !== currentDeviceId) {
                    throw new Error("Akun ini aktif di perangkat lain. Minta admin untuk reset perangkat.");
                } else if (!guru.device_id) {
                    await db.from('tabel_guru').update({ device_id: currentDeviceId }).eq('nip', idInput);
                    guru.device_id = currentDeviceId;
                }
            }

            currentUser = { role: userRole, ...guru };
            localStorage.setItem('app_session', JSON.stringify(currentUser));

            await showScreen('screen-desktop'); // Tarik HTML Guru dulu!
            setupGuruDashboard(currentUser);    // Baru isi datanya
            setTimeout(() => { cekUlangTahun(currentUser); }, 1500);
            return;
        }

        throw new Error("ID Pengguna atau Kata Sandi tidak terdaftar!");

    } catch (err) {
        console.error(err);
        errText.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${err.message || "Gagal masuk."}`;
        errText.classList.remove('hidden');
    } finally {
        btn.innerHTML = '<span class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm"><i class="fas fa-arrow-right text-[10px]"></i></span><span class="text-sm tracking-wide">Masuk Sistem</span>';
        btn.disabled = false;
    }
}

function togglePasswordVisibility() {
    const passInput = document.getElementById('login-pass');
    const eyeIcon = document.getElementById('eye-icon');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

async function handleLogout() {
    if (currentUser) {
        try {
            if (currentUser.role === 'siswa') {
                await db.from('tabel_siswa').update({ device_id: null }).eq('nis', currentUser.nis);
            } else if (currentUser.role === 'guru') {
                await db.from('tabel_guru').update({ device_id: null }).eq('nip', currentUser.nip);
            }
        } catch (e) {
            console.error("Gagal melepas ikatan perangkat:", e);
        }
    }

    currentUser = null;
    localStorage.removeItem('app_session');

    document.getElementById('login-id').value = '';
    document.getElementById('login-pass').value = '';
    showScreen('screen-login');
    const container = document.getElementById('app-container');
    container.classList.remove('desktop-mode');
    container.classList.add('device-frame');
}

async function resetDeviceBinding(tabel, kolomId, nilaiId) {
    if (!confirm(`Yakin ingin me-reset (menghapus) ikatan perangkat untuk ID ${nilaiId}?\n\nPengguna akan bisa login kembali di perangkat mana pun.`)) {
        return;
    }
    
    showToast('Memproses pelepasan perangkat...');
    
    try {
        const { error } = await db.from(tabel)
            .update({ device_id: null })
            .eq(kolomId, nilaiId);
            
        if (error) throw error;
        
        showToast(`Perangkat untuk ${nilaiId} berhasil dibebaskan!`);
        
        if (tabel === 'tabel_siswa' && typeof loadDataSiswa === 'function') loadDataSiswa(true);
        if (tabel === 'tabel_guru' && typeof loadDataGuru === 'function') loadDataGuru(true);
        
    } catch (error) {
        console.error(error);
        showToast('Gagal me-reset ikatan perangkat (Cek RLS/Koneksi).', true);
    }
}

// Fungsi untuk Reset Password Siswa oleh Admin
async function resetPasswordSiswa(nis, nama) {
    if (!confirm(`Yakin ingin me-reset kata sandi untuk siswa:\nNama: ${nama}\nNIS: ${nis} ?\n\nKata sandi akan dikembalikan ke bawaan sistem (123456).`)) {
        return;
    }
    
    showToast('Memproses reset kata sandi...');
    
    try {
        const { error } = await db.from('tabel_siswa')
            .update({ password: '123456' })
            .eq('nis', nis);
            
        if (error) throw error;
        
        showToast(`Sandi ${nama} berhasil di-reset ke 123456!`);
        
    } catch (error) {
        console.error("Detail Error Reset Pass:", error);
        let errMsg = "Gagal me-reset kata sandi.";
        if (error.message && (error.message.includes("row-level security") || error.code === '42501')) {
             errMsg = "Akses ditolak database (Cek RLS tabel_siswa untuk Update).";
        }
        showToast(errMsg, true);
    }
}

// ==========================================
// FITUR UCAPAN ULANG TAHUN
// ==========================================
async function cekUlangTahun(user) {
    // 1. Cek apakah fitur diaktifkan oleh Admin
    if (typeof cachedPengaturan !== 'undefined' && cachedPengaturan && cachedPengaturan.fitur_ultah_aktif === false) {
        return; 
    }

    // 2. Validasi Tanggal Lahir Siswa
    if (!user || !user.tgl_lahir) return; 
    const tglLahirDB = user.tgl_lahir;
    if (tglLahirDB.length < 10) return;

    const bulanLahir = tglLahirDB.substring(5, 7);
    const tanggalLahir = tglLahirDB.substring(8, 10);
    const hariIni = new Date();
    const bulanIni = String(hariIni.getMonth() + 1).padStart(2, '0');
    const tanggalIni = String(hariIni.getDate()).padStart(2, '0');

    // 3. Jika hari ini Ulang Tahun
    if (bulanLahir === bulanIni && tanggalLahir === tanggalIni) {
        // Tampilkan nama pendek siswa
        document.getElementById('ultah-nama').innerText = user.nama.split(',')[0]; 
        
        const isPerempuan = (user.jk === 'P' || user.jk === 'Perempuan');
        
        if (typeof cachedPengaturan !== 'undefined' && cachedPengaturan) {
            try {
                // Tentukan ID Template mana yang harus ditarik (L atau P)
                const templateAktifId = isPerempuan ? cachedPengaturan.template_p : cachedPengaturan.template_l;

                if (templateAktifId) {
                    // Tarik data template spesifik dari tabel_template_ultah berdasarkan ID
                    const { data: tplData, error } = await db.from('tabel_template_ultah').select('*').eq('id', templateAktifId).single();
                    
                    if (tplData && !error) {
                        // Terapkan data dari Bank Template ke UI Modal
                        document.getElementById('ultah-pesan').innerHTML = tplData.pesan_utama || '';
                        
                        if (tplData.pesan_kutipan) {
                            document.getElementById('ultah-kutipan').innerHTML = `"${tplData.pesan_kutipan}"`;
                            document.getElementById('ultah-kutipan').style.display = 'block';
                        } else {
                            document.getElementById('ultah-kutipan').style.display = 'none';
                        }
                        
                        if (tplData.bg_url) {
                            document.getElementById('ultah-gambar').src = tplData.bg_url;
                        }

                        // JIKA BERHASIL MEMUAT TEMPLATE, TAMPILKAN MODAL LALU HENTIKAN FUNGSI DI SINI.
                        tampilkanModalUI();
                        return; 
                    }
                }
            } catch (err) {
                console.error("Gagal menarik template ulang tahun dari database:", err);
            }
            
            // ==========================================
            // KODE CADANGAN (FALLBACK) - HANYA BERJALAN JIKA:
            // 1. Admin belum memilih template sama sekali di pengaturan. ATAU
            // 2. Koneksi ke tabel_template_ultah gagal/error.
            // ==========================================
            console.log("Menggunakan template cadangan...");
            
            if (isPerempuan) {
                document.getElementById('ultah-pesan').innerHTML = "Semoga di hari yang istimewa ini, langkahmu selalu diberkahi, dan kebahagiaan menyertaimu.";
                document.getElementById('ultah-kutipan').innerHTML = `"Jadi versi terbaik dari dirimu" 🤍`;
                document.getElementById('ultah-gambar').src = "https://placehold.co/600x800/ffecf2/ff6b9d.png?text=Selamat+Ulang+Tahun"; 
            } else {
                document.getElementById('ultah-pesan').innerHTML = "Selamat ulang tahun! Jadikan usia barumu ini sebagai momentum untuk terus berkembang, lebih tangguh, dan meraih semua target hebatmu ke depan. Semangat terus belajarnya!";
                document.getElementById('ultah-kutipan').innerHTML = `"Keep moving forward!" 🚀`;
                document.getElementById('ultah-gambar').src = "https://placehold.co/600x800/e0f2fe/0ea5e9.png?text=Selamat+Ulang+Tahun";
            }
            
            // Tampilkan Modal dengan data cadangan
            tampilkanModalUI();
        }
    }
}

// Fungsi pembantu untuk animasi modal
function tampilkanModalUI() {
    const modal = document.getElementById('modal-ultah');
    const content = document.getElementById('modal-ultah-content');
    
    if(modal && content) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 50);
        
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    }
}


function tutupModalUltah() {
    const modal = document.getElementById('modal-ultah');
    const content = document.getElementById('modal-ultah-content');
    
    if(content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    
    if(modal) {
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 200);
    }
}