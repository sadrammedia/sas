// ==========================================
// 1. SISTEM AUTENTIKASI (LOGIN & LOGOUT GURU/ADMIN)
// ==========================================

async function handleLogin() {
    const idInput = document.getElementById('login-id').value.trim();
    const passInput = document.getElementById('login-pass').value;
    const btn = document.getElementById('btn-login');
    const errText = document.getElementById('login-error');
    const currentDeviceId = getDeviceID();
    
    if (!idInput || !passInput) {
        errText.innerText = "NIP dan Kata Sandi wajib diisi!";
        errText.classList.remove('hidden');
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengecek Autentikasi...';
    btn.disabled = true;
    errText.classList.add('hidden');

    try {
        // HANYA CEK TABEL GURU (Aplikasi B)
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

            // Validasi Device Binding (Opsional untuk Admin jika tidak ingin terikat)
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

            await showScreen('screen-desktop');
            setupGuruDashboard(currentUser);
            
            // Panggil kejutan ultah jika hari ini ultah guru tersebut
            setTimeout(() => { cekUlangTahun(currentUser); }, 1500);
            return;
        }

        throw new Error("NIP Guru atau Kata Sandi tidak terdaftar!");

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
    if (currentUser && (currentUser.role === 'guru' || currentUser.role === 'admin')) {
        try {
            await db.from('tabel_guru').update({ device_id: null }).eq('nip', currentUser.nip);
        } catch (e) {
            console.error("Gagal melepas ikatan perangkat:", e);
        }
    }

    currentUser = null;
    localStorage.removeItem('app_session');

    document.getElementById('login-id').value = '';
    document.getElementById('login-pass').value = '';
    showScreen('screen-login');
}

// ==========================================
// 2. FUNGSI ADMIN (RESET PASSWORD & DEVICE)
// ==========================================

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
// 3. FITUR UCAPAN ULANG TAHUN GURU/ADMIN
// ==========================================

async function cekUlangTahun(user) {
    if (typeof cachedPengaturan !== 'undefined' && cachedPengaturan && cachedPengaturan.fitur_ultah_aktif === false) {
        return; 
    }

    if (!user || !user.tgl_lahir) return; 
    const tglLahirDB = user.tgl_lahir;
    if (tglLahirDB.length < 10) return;

    const bulanLahir = tglLahirDB.substring(5, 7);
    const tanggalLahir = tglLahirDB.substring(8, 10);
    const hariIni = new Date();
    const bulanIni = String(hariIni.getMonth() + 1).padStart(2, '0');
    const tanggalIni = String(hariIni.getDate()).padStart(2, '0');

    if (bulanLahir === bulanIni && tanggalLahir === tanggalIni) {
        document.getElementById('ultah-nama').innerText = user.nama.split(',')[0]; 
        const isPerempuan = (user.jk === 'P' || user.jk === 'Perempuan');
        
        if (typeof cachedPengaturan !== 'undefined' && cachedPengaturan) {
            try {
                const templateAktifId = isPerempuan ? cachedPengaturan.template_p : cachedPengaturan.template_l;
                if (templateAktifId) {
                    const { data: tplData, error } = await db.from('tabel_template_ultah').select('*').eq('id', templateAktifId).single();
                    if (tplData && !error) {
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
                        tampilkanModalUI();
                        return; 
                    }
                }
            } catch (err) {
                console.error("Gagal menarik template ulang tahun dari database:", err);
            }
            
            // Fallback jika tidak ada template
            if (isPerempuan) {
                document.getElementById('ultah-pesan').innerHTML = "Semoga di hari yang istimewa ini, langkah Anda selalu diberkahi, dan kebahagiaan menyertai.";
                document.getElementById('ultah-kutipan').innerHTML = `"Tetaplah menginspirasi!" 🤍`;
                document.getElementById('ultah-gambar').src = "https://placehold.co/600x800/ffecf2/ff6b9d.png?text=Selamat+Ulang+Tahun"; 
            } else {
                document.getElementById('ultah-pesan').innerHTML = "Selamat ulang tahun! Terima kasih atas dedikasi luar biasa Anda untuk sekolah kita tercinta.";
                document.getElementById('ultah-kutipan').innerHTML = `"Sukses dan sehat selalu!" 🚀`;
                document.getElementById('ultah-gambar').src = "https://placehold.co/600x800/e0f2fe/0ea5e9.png?text=Selamat+Ulang+Tahun";
            }
            tampilkanModalUI();
        }
    }
}

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
