// ==========================================
// 1. DASHBOARD & PANEL ADMIN/GURU
// ==========================================

let rawSiswaList = [];
let rawGuruList = [];

function getGuruAuthClasses(user) {
    if (!user || user.role === 'admin') return ['ALL'];
    
    let allowedClasses = new Set();
    
    if (user.wali_kelas && user.wali_kelas.trim() !== '') {
        allowedClasses.add(user.wali_kelas.trim().toUpperCase());
    }
    
    if (user.kelas_ajar && user.kelas_ajar.trim() !== '') {
        const kAjar = user.kelas_ajar.split(',');
        kAjar.forEach(k => {
            const cleanClass = k.trim().toUpperCase();
            if (cleanClass !== '') allowedClasses.add(cleanClass);
        });
    }
    
    return Array.from(allowedClasses);
}


// --- TAMBAHKAN FUNGSI ENGINE OTONOMI ---
async function terapkanOtonomiGuru() {
    try {
        const { data } = await db.from('tabel_pengaturan').select('akses_guru_jadwal, akses_guru_kelas').single();
        const isGuru = currentUser.role === 'guru';
        
        // Atur Sembunyi/Tampil Tombol Jadwal KBM (Sidebar & Grid Menu)
        const tombolJadwals = document.querySelectorAll('button[onclick*="jadwal-admin"]');
        tombolJadwals.forEach(btn => {
            if (isGuru && !data?.akses_guru_jadwal) {
                btn.classList.add('hidden'); // Sembunyikan jika akses ditutup
            } else {
                btn.classList.remove('hidden'); 
            }
        });

        // Atur Sembunyi/Tampil Fitur Centang Kelas di Profil
        const containerKelas = document.getElementById('container-edit-kelas-ajar');
        if (containerKelas) {
            if (isGuru && !data?.akses_guru_kelas) {
                containerKelas.classList.add('hidden');
            } else {
                containerKelas.classList.remove('hidden');
                muatPilihanKelasAjar(); // Tarik data kelas dari tabel_siswa
            }
        }
    } catch(e) { console.error("Gagal memuat aturan otonomi", e); }
}

async function muatPilihanKelasAjar() {
    const wrap = document.getElementById('wrap-checkbox-kelas-ajar');
    if(!wrap) return;
    try {
        const { data } = await db.from('tabel_siswa').select('kelas');
        if(!data || data.length === 0) {
            wrap.innerHTML = '<p class="text-[10px] text-gray-400 col-span-full">Belum ada kelas di database siswa.</p>';
            return;
        }
        
        // Ambil kelas unik dan urutkan
        const unikKelas = [...new Set(data.map(s => s.kelas).filter(Boolean))].sort();
        const currentAjar = (currentUser.kelas_ajar || '').split(',').map(k => k.trim());
        
        wrap.innerHTML = unikKelas.map(k => `
            <label class="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-teal-50 transition-colors shadow-sm">
                <input type="checkbox" value="${k}" class="cb-kelas-ajar text-teal-600 rounded focus:ring-teal-500 w-3.5 h-3.5" ${currentAjar.includes(k) ? 'checked' : ''}>
                <span class="text-[10px] font-bold text-gray-700 truncate">${k}</span>
            </label>
        `).join('');
    } catch(e) { wrap.innerHTML = '<p class="text-[10px] text-red-500 col-span-full">Gagal memuat kelas.</p>'; }
}


function setupGuruDashboard(user) {
    const elNameSide = document.getElementById('guru-name-side');
    if (elNameSide) elNameSide.innerText = user.nama;
    
    const elNipSide = document.getElementById('guru-nip-side');
    if (elNipSide) elNipSide.innerText = `NIP: ${user.nip}`;
    
    const badgeWali = document.getElementById('badge-wali-kelas');
    if (user.jabatan === 'Wali Kelas' || user.wali_kelas) {
        if (badgeWali) {
            badgeWali.innerText = `Wali ${user.wali_kelas || 'Kelas'}`;
            badgeWali.classList.remove('hidden');
        }
    } else {
        if (badgeWali) badgeWali.classList.add('hidden');
    }

    const adminOnlyElements = document.querySelectorAll('.admin-only');
    const bannerRole = document.getElementById('banner-role-guru');
    
    if (user.role === 'admin') {
        adminOnlyElements.forEach(el => el.style.display = '');
        if (bannerRole) bannerRole.classList.add('hidden');
    } else {
        adminOnlyElements.forEach(el => el.style.display = 'none');
        if (bannerRole) bannerRole.classList.remove('hidden');
    }

    updateFotoGuruUI(user.foto_profil);

    // Panggilan showScreen('screen-desktop') dihapus dari sini
    switchGuruMenu('dashboard');
    
    if (window.innerWidth >= 768) {
        const container = document.getElementById('app-container');
        if (container) {
            container.classList.remove('device-frame');
            container.classList.add('desktop-mode');
        }
    }

    loadDashboardGuruData();
    terapkanOtonomiGuru();
}

function updateFotoGuruUI(url) {
    const sideImg = document.getElementById('guru-foto-side');
    const sideIco = document.getElementById('guru-icon-side');
    const topMobImg = document.getElementById('guru-foto-topmob');
    const topMobIco = document.getElementById('guru-icon-topmob');
    const editImg = document.getElementById('edit-preview-foto-guru');
    const editIco = document.getElementById('edit-icon-guru');

    if (url && url.trim() !== '') {
        if (sideImg) { sideImg.style.display = 'block'; sideImg.src = url; sideImg.classList.remove('hidden'); }
        if (sideIco) { sideIco.style.display = 'none'; sideIco.classList.add('hidden'); }
        
        if (topMobImg) { topMobImg.style.display = 'block'; topMobImg.src = url; topMobImg.classList.remove('hidden'); }
        if (topMobIco) { topMobIco.style.display = 'none'; topMobIco.classList.add('hidden'); }
        
        if (editImg) { editImg.style.display = 'block'; editImg.src = url; editImg.classList.remove('hidden'); }
        if (editIco) { editIco.style.display = 'none'; editIco.classList.add('hidden'); }
    } else {
        if (sideImg) { sideImg.style.display = 'none'; sideImg.classList.add('hidden'); }
        if (sideIco) { sideIco.style.display = 'block'; sideIco.classList.remove('hidden'); }
        
        if (topMobImg) { topMobImg.style.display = 'none'; topMobImg.classList.add('hidden'); }
        if (topMobIco) { topMobIco.style.display = 'block'; topMobIco.classList.remove('hidden'); }
        
        if (editImg) { editImg.style.display = 'none'; editImg.classList.add('hidden'); }
        if (editIco) { editIco.style.display = 'block'; editIco.classList.remove('hidden'); }
    }
}

function switchGuruMenu(targetId) {
    document.querySelectorAll('.guru-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`guru-section-${targetId}`).classList.remove('hidden');

    document.querySelectorAll('.guru-nav-btn, .guru-mobnav-btn').forEach(b => {
        b.classList.remove('bg-teal-50', 'text-teal-700', 'text-teal-600');
        b.classList.add('text-gray-500');
        if (b.classList.contains('guru-mobnav-btn')) b.classList.replace('text-gray-500', 'text-gray-400');
    });
    
    document.querySelectorAll(`.guru-nav-btn[data-target="${targetId}"]`).forEach(b => {
        b.classList.remove('text-gray-500');
        b.classList.add('bg-teal-50', 'text-teal-700');
    });
    document.querySelectorAll(`.guru-mobnav-btn[data-target="${targetId}"]`).forEach(b => {
        b.classList.remove('text-gray-400');
        b.classList.add('text-teal-600');
    });

    if (targetId === 'siswa') loadDataSiswa();
    if (targetId === 'guru') loadDataGuru();
    if (targetId === 'rekap') loadDataRekap();
    if (targetId === 'izin-admin') loadIzinAdmin();
    if (targetId === 'pengumuman-admin') loadPengumumanAdmin();    
    if (targetId === 'jadwal-admin') { loadJadwalAdmin(); initDropdownJadwal(); }
    if (targetId === 'pengaturan') loadPengaturan();
    if (targetId === 'profil-guru') loadProfilGuru();

    // Update State Bottom Navigation Mobile Guru
    ['dashboard', 'siswa', 'rekap', 'izin-admin', 'menu'].forEach(id => {
        // Karena rekap tidak punya class nav-item (dia FAB), kita pisahkan penanganannya
        const navId = id === 'izin-admin' ? 'nav-guru-izin' : `nav-guru-${id}`;
        const el = document.getElementById(navId);
        if (el && navId !== 'nav-guru-rekap') {
            el.classList.remove('active-nav');
        }
    });

    // Nyalakan yang sedang diklik
    let activeNavId = `nav-guru-${targetId}`;
    if (targetId === 'izin-admin') activeNavId = 'nav-guru-izin';
    const activeNav = document.getElementById(activeNavId);
    if (activeNav && targetId !== 'rekap') {
        activeNav.classList.add('active-nav');
    }
}


async function loadDashboardGuruData() {
    if (!currentUser) return;
    const btnRefresh = document.getElementById('icon-spin-refresh');
    if(btnRefresh) btnRefresh.classList.add('fa-spin');

    const dateObj = new Date();
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const tglHariIni = `${yyyy}-${mm}-${dd}`;
    
    // Sapaan Berdasarkan Waktu
    const jam = dateObj.getHours();
    let sapaan = 'Selamat Pagi';
    if(jam >= 11 && jam < 15) sapaan = 'Selamat Siang';
    else if(jam >= 15 && jam < 18) sapaan = 'Selamat Sore';
    else if(jam >= 18) sapaan = 'Selamat Malam';
    
    // Kata Mutiara Acak
    const quotes = [
        "Pendidikan adalah paspor untuk masa depan.",
        "Guru yang baik itu seperti lilin, rela membakar dirinya untuk menerangi orang lain.",
        "Bukan tentang seberapa pintar mereka, tapi seberapa besar kita peduli.",
        "Satu buku, satu pena, dan satu guru dapat mengubah dunia.",
        "Mengajar adalah belajar dua kali."
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    document.getElementById('dash-guru-greeting').innerText = `${sapaan}, ${currentUser.nama.split(' ')[0]}!`;
    document.getElementById('dash-guru-quote').innerText = `"${randomQuote}"`;

    // Ambil Batas Jam Masuk untuk Deteksi Terlambat
    let batasJamMasuk = '07:15';
    if(cachedPengaturan && cachedPengaturan.jam_masuk_akhir) {
        batasJamMasuk = cachedPengaturan.jam_masuk_akhir;
    }

    try {
        const authClasses = getGuruAuthClasses(currentUser);
        const isFilter = authClasses[0] !== 'ALL';
        
        // 1. STATISTIK UTAMA
        let querySiswa = db.from('tabel_siswa').select('*', { count: 'exact', head: true });
        if (isFilter) querySiswa = querySiswa.in('kelas', authClasses);
        const { count: countSiswa } = await querySiswa;
        document.getElementById('stat-total-siswa').innerText = countSiswa || 0;

        const { count: countGuru } = await db.from('tabel_guru').select('*', { count: 'exact', head: true });
        document.getElementById('stat-total-guru').innerText = countGuru || 0;

        let queryAbsen = db.from('tabel_presensi').select('jam_masuk, jam_pulang, kelas').eq('tanggal', tglHariIni);
        if (isFilter) queryAbsen = queryAbsen.in('kelas', authClasses);
        const { data: absenToday } = await queryAbsen;
        
        let hadir = 0, pulang = 0;
        if (absenToday) {
            absenToday.forEach(r => {
                if (r.jam_masuk) hadir++;
                if (r.jam_pulang) pulang++;
            });
        }
        document.getElementById('stat-hadir').innerText = hadir;
        document.getElementById('stat-pulang').innerText = pulang;
        
        // Kalkulasi Persentase Kehadiran
        const persenEl = document.getElementById('stat-persen-hadir');
        if (countSiswa > 0) {
            const pct = Math.round((hadir / countSiswa) * 100);
            persenEl.innerText = `${pct}%`;
            if(pct >= 90) { persenEl.className = "text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100"; }
            else if(pct >= 70) { persenEl.className = "text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"; }
            else { persenEl.className = "text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100"; }
        } else {
            persenEl.innerText = "0%";
        }

        // 2. WIDGET JADWAL MENGAJAR HARI INI
        const listHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const hariIniIndo = listHari[dateObj.getDay()];
        document.getElementById('dash-badge-hari').innerText = hariIniIndo;
        
        const wrapJadwal = document.getElementById('widget-jadwal-guru');
        if(hariIniIndo === 'Minggu' || hariIniIndo === 'Sabtu') {
            wrapJadwal.innerHTML = `<p class="text-xs text-purple-200 py-1"><i class="fas fa-couch"></i> Yeay! Hari libur, tidak ada jadwal mengajar.</p>`;
        } else {
            // Tarik jadwal dimana 'guru' mengandung nama user (mengakomodasi gelar)
            const { data: jadwalKu } = await db.from('tabel_jadwal')
                .select('*')
                .eq('hari', hariIniIndo)
                .ilike('guru', `%${currentUser.nama.split(',')[0]}%`)
                .order('jam_mulai', { ascending: true });
                
            if(jadwalKu && jadwalKu.length > 0) {
                wrapJadwal.innerHTML = jadwalKu.map(j => `
                    <div class="bg-white/10 border border-white/20 rounded-xl p-2.5 flex items-center justify-between backdrop-blur-sm">
                        <div class="flex items-center gap-3">
                            <span class="bg-white text-purple-700 font-extrabold text-[10px] px-2 py-1 rounded-lg shadow-sm">${j.jam_mulai}</span>
                            <div>
                                <h4 class="font-bold text-xs text-white leading-tight">${j.kelas}</h4>
                                <p class="text-[9px] text-purple-200">${j.mapel} • ${j.ruang || 'Kelas'}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                wrapJadwal.innerHTML = `<p class="text-xs text-purple-200 py-1"><i class="fas fa-mug-hot"></i> Anda tidak memiliki jam mengajar hari ini.</p>`;
            }
        }

        // 3. SMART BADGE IZIN
        let queryIzin = db.from('tabel_izin').select('id').eq('status', 'Menunggu');
        // Jika bukan admin, hanya hitung yang kelasnya masuk hak akses
        if(currentUser.role !== 'admin' && isFilter) {
            const { data: siswaKu } = await db.from('tabel_siswa').select('nis').in('kelas', authClasses);
            if(siswaKu && siswaKu.length > 0) {
                queryIzin = queryIzin.in('nis', siswaKu.map(s => s.nis));
            } else {
                // Paksa return 0 jika tidak punya siswa
                queryIzin = queryIzin.eq('nis', 'xxx'); 
            }
        }
        const { data: pendingIzin } = await queryIzin;
        
        const badgeWrap = document.getElementById('badge-izin-pending-wrap');
        const badgeNum = document.getElementById('badge-izin-pending');
        const iconArr = document.getElementById('icon-izin-arrow');
        
        if(pendingIzin && pendingIzin.length > 0) {
            badgeNum.innerText = pendingIzin.length;
            badgeWrap.classList.remove('hidden');
            iconArr.classList.add('hidden');
        } else {
            badgeWrap.classList.add('hidden');
            iconArr.classList.remove('hidden');
        }

        // 4. LIVE LOG (DENGAN TAG KETERLAMBATAN & FOTO)
        const listContainer = document.getElementById('live-recent-absen-list');
        if (listContainer) {
            // Ambil data terbaru (termasuk join sederhana untuk cek foto, tapi kita pakai nama dulu)
            let queryRecent = db.from('tabel_presensi')
                .select('nama, kelas, jam_masuk, jam_pulang, foto_masuk')
                .eq('tanggal', tglHariIni)
                .order('id', { ascending: false })
                .limit(4);

            if (isFilter) queryRecent = queryRecent.in('kelas', authClasses);
            const { data: recentList } = await queryRecent;

            if (recentList && recentList.length > 0) {
                listContainer.innerHTML = recentList.map(r => {
                    // Penentuan Jam Tampil (Prioritas jam masuk, kalau ada pulang ya pulang)
                    const jamTampil = r.jam_pulang || r.jam_masuk;
                    const isPulang = !!r.jam_pulang;
                    
                    // Deteksi Terlambat (Jika jam masuk lebih besar dari batas dan BUKAN Klaim guru)
                    let statusTag = '';
                    if(!isPulang && r.jam_masuk) {
                        if(r.jam_masuk.includes('(Klaim)')) {
                            statusTag = `<span class="text-[8px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-bold">Klaim Guru</span>`;
                        } else if(r.jam_masuk > batasJamMasuk) {
                            statusTag = `<span class="text-[8px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-bold">Terlambat</span>`;
                        } else {
                            statusTag = `<span class="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">Tepat Waktu</span>`;
                        }
                    } else if (isPulang) {
                        statusTag = `<span class="text-[8px] bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded font-bold">Pulang</span>`;
                    }

                    // Thumbnail Foto
                    const thumb = r.foto_masuk 
                        ? `<img src="${r.foto_masuk}" class="w-9 h-9 rounded-xl object-cover border border-gray-200 shadow-sm" alt="Foto">`
                        : `<div class="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-sm border border-slate-200"><i class="fas fa-user"></i></div>`;

                    return `
                    <div class="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                        <div class="flex items-center gap-3 min-w-0">
                            ${thumb}
                            <div class="min-w-0">
                                <h5 class="font-bold text-[12px] text-gray-800 truncate">${r.nama}</h5>
                                <div class="flex items-center gap-1.5 mt-0.5">
                                    <span class="text-[9px] text-gray-500 font-semibold">${r.kelas}</span>
                                    ${statusTag}
                                </div>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <span class="font-mono font-bold text-[11px] text-slate-700 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-sm">${jamTampil.replace('(Klaim)','')}</span>
                        </div>
                    </div>`;
                }).join('');
            } else {
                listContainer.innerHTML = `
                    <div class="text-center py-6">
                        <div class="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-2 text-xl"><i class="fas fa-mug-hot"></i></div>
                        <p class="text-xs text-gray-400 font-medium">Belum ada siswa yang melakukan presensi hari ini.</p>
                    </div>`;
            }
        }

    } catch (e) {
        console.error(e);
        showToast('Gagal memuat data live dashboard.', true);
    } finally {
        if(btnRefresh) btnRefresh.classList.remove('fa-spin');
    }
}

// ==========================================
// 2. DATA SISWA (FILTER, SORT & BUFFER RENDER)
// ==========================================

async function loadDataSiswa(forceReload = false) {
    const tbody = document.getElementById('tabel-data-siswa');
    const counterEl = document.getElementById('counter-siswa');

    if (!forceReload && rawSiswaList && rawSiswaList.length > 0) {
        applyFilterSiswa();
        return;
    }

    tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8"><i class="fas fa-spinner fa-spin text-teal-600 text-2xl"></i><p class="text-sm mt-2 text-gray-500">Menarik data dari Cloud...</p></td></tr>';
    
    const authClasses = getGuruAuthClasses(currentUser);
    if (currentUser.role !== 'admin' && authClasses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8 text-gray-500">Anda belum ditugaskan untuk memantau kelas manapun.</td></tr>';
        if (counterEl) counterEl.innerText = "0 siswa ditemukan";
        rawSiswaList = [];
        return;
    }

    let query = db.from('tabel_siswa').select('*').order('nis', { ascending: true });
    if (authClasses[0] !== 'ALL') {
        query = query.in('kelas', authClasses);
    }
    
    const { data, error } = await query;
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8 text-gray-500">Belum ada data siswa.</td></tr>';
        if (counterEl) counterEl.innerText = "0 siswa ditemukan";
        rawSiswaList = [];
        return;
    }

    rawSiswaList = data;

    const filterKelasEl = document.getElementById('filter-siswa-kelas');
    if (filterKelasEl) {
        const selectedVal = filterKelasEl.value;
        const availableClasses = [...new Set(data.map(s => s.kelas ? s.kelas.trim() : null).filter(Boolean))].sort();
        filterKelasEl.innerHTML = '<option value="ALL">Semua Kelas</option>';
        availableClasses.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            if (k === selectedVal) opt.selected = true;
            filterKelasEl.appendChild(opt);
        });
    }

    applyFilterSiswa();
}

function applyFilterSiswa() {
    const tbody = document.getElementById('tabel-data-siswa');
    const counterEl = document.getElementById('counter-siswa');
    if (!rawSiswaList || rawSiswaList.length === 0) return;

    const keyword = (document.getElementById('filter-siswa-keyword')?.value || '').trim().toLowerCase();
    const filterKelas = document.getElementById('filter-siswa-kelas')?.value || 'ALL';
    const filterDevice = document.getElementById('filter-siswa-device')?.value || 'ALL';
    const sortBy = document.getElementById('sort-siswa-by')?.value || 'nis_asc';

    let filtered = rawSiswaList.filter(s => {
        const matchKeyword = !keyword || 
            (s.nama && s.nama.toLowerCase().includes(keyword)) ||
            (s.nis && String(s.nis).toLowerCase().includes(keyword)) ||
            (s.nisn && String(s.nisn).toLowerCase().includes(keyword));

        const matchKelas = filterKelas === 'ALL' || (s.kelas && s.kelas.trim() === filterKelas);

        const isBound = !!(s.device_id && s.device_id.trim() !== '');
        const matchDevice = filterDevice === 'ALL' || 
            (filterDevice === 'bound' && isBound) || 
            (filterDevice === 'free' && !isBound);

        return matchKeyword && matchKelas && matchDevice;
    });

    filtered.sort((a, b) => {
        if (keyword) {
            const getRelevanceScore = (nama, nis, nisn) => {
                const n = (nama || '').toLowerCase();
                const idNis = String(nis || '').toLowerCase();
                const idNisn = String(nisn || '').toLowerCase();

                if (n === keyword || idNis === keyword || idNisn === keyword) return 0;
                if (n.startsWith(keyword)) return 1;
                if (n.includes(' ' + keyword)) return 2;
                if (n.includes(keyword) || idNis.includes(keyword) || idNisn.includes(keyword)) return 3;
                return 4;
            };

            const scoreA = getRelevanceScore(a.nama, a.nis, a.nisn);
            const scoreB = getRelevanceScore(b.nama, b.nis, b.nisn);

            if (scoreA !== scoreB) {
                return scoreA - scoreB;
            }
        }

        if (sortBy === 'nis_asc') return String(a.nis || '').localeCompare(String(b.nis || ''), undefined, { numeric: true });
        if (sortBy === 'nis_desc') return String(b.nis || '').localeCompare(String(a.nis || ''), undefined, { numeric: true });
        if (sortBy === 'nama_asc') return (a.nama || '').localeCompare(b.nama || '');
        if (sortBy === 'nama_desc') return (b.nama || '').localeCompare(a.nama || '');
        if (sortBy === 'kelas_asc') return (a.kelas || '').localeCompare(b.kelas || '');
        return 0;
    });

    if (counterEl) {
        counterEl.innerText = `Menampilkan ${filtered.length} dari ${rawSiswaList.length} siswa`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8 text-gray-400">Tidak ada data siswa yang cocok dengan filter.</td></tr>';
        return;
    }

    const isAdmin = currentUser && currentUser.role === 'admin';
    let htmlRows = '';

    filtered.forEach(s => {
        const isDeviceBound = !!(s.device_id && s.device_id.trim() !== '');
        const badgeDevice = isDeviceBound 
            ? `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-200"><i class="fas fa-lock"></i> Terikat</span>` 
            : `<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold border border-gray-200"><i class="fas fa-unlock"></i> Bebas</span>`;

        const btnAksi = isAdmin 
            ? `<div class="flex justify-center gap-1">
                   <button onclick="resetPasswordSiswa('${s.nis}', '${(s.nama || '').replace(/'/g, "\\'")}')" class="bg-amber-50 text-amber-700 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors border border-amber-200" title="Kembalikan Sandi ke 123456"><i class="fas fa-key"></i> Reset Pass</button>
                   <button onclick="resetDeviceBinding('tabel_siswa', 'nis', '${s.nis}')" class="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors border border-red-200" title="Lepaskan Perangkat"><i class="fas fa-mobile-alt"></i> Reset HP</button>
               </div>`
            : '-';

        htmlRows += `
            <tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                <td class="px-6 py-4 font-mono text-gray-500 text-xs">${s.nisn || '-'}</td>
                <td class="px-6 py-4 font-mono text-gray-600 text-xs font-bold">${s.nis}</td>
                <td class="px-6 py-4 font-bold text-gray-900">${s.nama}</td>
                <td class="px-6 py-4">${s.jk || '-'}</td>
                <td class="px-6 py-4 font-medium text-gray-700">${s.tingkat || '-'}</td>
                <td class="px-6 py-4 font-bold text-teal-700">${s.kelas || '-'}</td>
                <td class="px-6 py-4"><span class="bg-blue-50 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 border border-blue-100">${s.id_jurusan || '-'}</span></td>
                <td class="px-6 py-4 text-xs text-gray-600">${s.no_hp || '-'}</td>
                <td class="px-6 py-4">${badgeDevice}</td>
                <td class="px-6 py-4 text-center">${btnAksi}</td>
            </tr>
        `;
    });

    tbody.innerHTML = htmlRows;
}

// ==========================================
// 3. DATA GURU & HAK AKSES
// ==========================================

async function loadDataGuru(forceReload = false) {
    const tbody = document.getElementById('tabel-data-guru');
    const counterEl = document.getElementById('counter-guru');

    if (!forceReload && rawGuruList && rawGuruList.length > 0) {
        applyFilterGuru();
        return;
    }

    tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8"><i class="fas fa-spinner fa-spin text-orange-500 text-2xl"></i><p class="text-sm mt-2 text-gray-500">Menarik data Guru dari Cloud...</p></td></tr>';
    
    try {
        const { data, error } = await db.from('tabel_guru').select('*').order('nip', { ascending: true });
        
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-gray-500">Database Guru masih kosong. Gunakan menu Kelola Data untuk Import.</td></tr>';
            if (counterEl) counterEl.innerText = "0 guru terdaftar";
            rawGuruList = [];
            return;
        }

        rawGuruList = data;

        const filterJabatanEl = document.getElementById('filter-guru-jabatan');
        if (filterJabatanEl) {
            const currentSelected = filterJabatanEl.value;
            const availableJabatan = [...new Set(data.map(g => g.jabatan ? g.jabatan.trim() : null).filter(Boolean))].sort();
            filterJabatanEl.innerHTML = '<option value="ALL">Semua Jabatan</option>';
            availableJabatan.forEach(j => {
                const opt = document.createElement('option');
                opt.value = j;
                opt.textContent = j;
                if (j === currentSelected) opt.selected = true;
                filterJabatanEl.appendChild(opt);
            });
        }

        applyFilterGuru();

    } catch (err) {
        console.error("Gagal memuat data guru:", err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-red-500 font-medium"><i class="fas fa-exclamation-circle mr-1"></i> Gagal memuat data guru (${err.message || 'Cek RLS tabel_guru'})</td></tr>`;
    }
}

function applyFilterGuru() {
    const tbody = document.getElementById('tabel-data-guru');
    const counterEl = document.getElementById('counter-guru');
    if (!rawGuruList || rawGuruList.length === 0) return;

    const keyword = (document.getElementById('filter-guru-keyword')?.value || '').trim().toLowerCase();
    const filterJabatan = document.getElementById('filter-guru-jabatan')?.value || 'ALL';
    const filterWali = document.getElementById('filter-guru-walikelas')?.value || 'ALL';
    const sortBy = document.getElementById('sort-guru-by')?.value || 'nama_asc';

    let filtered = rawGuruList.filter(g => {
        const matchKeyword = !keyword || 
            (g.nama && g.nama.toLowerCase().includes(keyword)) ||
            (g.nip && String(g.nip).toLowerCase().includes(keyword));

        const matchJabatan = filterJabatan === 'ALL' || (g.jabatan && g.jabatan.trim() === filterJabatan);

        const hasWali = !!(g.wali_kelas && g.wali_kelas.trim() !== '' && g.wali_kelas !== 'null');
        const matchWali = filterWali === 'ALL' || 
            (filterWali === 'wali' && hasWali) || 
            (filterWali === 'non_wali' && !hasWali);

        return matchKeyword && matchJabatan && matchWali;
    });

    filtered.sort((a, b) => {
        if (keyword) {
            const getRelevanceScore = (nama, nip) => {
                const n = (nama || '').toLowerCase();
                const idNip = String(nip || '').toLowerCase();

                if (n === keyword || idNip === keyword) return 0;
                if (n.startsWith(keyword)) return 1;
                if (n.includes(' ' + keyword)) return 2;
                if (n.includes(keyword) || idNip.includes(keyword)) return 3;
                return 4;
            };

            const scoreA = getRelevanceScore(a.nama, a.nip);
            const scoreB = getRelevanceScore(b.nama, b.nip);

            if (scoreA !== scoreB) {
                return scoreA - scoreB;
            }
        }

        if (sortBy === 'nama_asc') return (a.nama || '').localeCompare(b.nama || '');
        if (sortBy === 'nama_desc') return (b.nama || '').localeCompare(a.nama || '');
        if (sortBy === 'nip_asc') return String(a.nip || '').localeCompare(String(b.nip || ''), undefined, { numeric: true });
        if (sortBy === 'nip_desc') return String(b.nip || '').localeCompare(String(a.nip || ''), undefined, { numeric: true });
        return 0;
    });

    if (counterEl) {
        counterEl.innerText = `Menampilkan ${filtered.length} dari ${rawGuruList.length} guru`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-gray-400">Tidak ada data guru yang cocok dengan filter.</td></tr>';
        return;
    }

    const isAdmin = currentUser && currentUser.role === 'admin';
    let htmlRows = '';
    
    filtered.forEach(g => {
        const isDeviceBound = !!(g.device_id && g.device_id.trim() !== '');
        const badgeDevice = isDeviceBound 
            ? `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-200"><i class="fas fa-lock"></i> Terikat</span>` 
            : `<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold border border-gray-200"><i class="fas fa-unlock"></i> Bebas</span>`;

        let btnAksi = '-';
        if (isAdmin) {
            const btnReset = (g.nip !== currentUser.nip) 
                ? `<button onclick="resetDeviceBinding('tabel_guru', 'nip', '${g.nip}')" class="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors border border-red-200" title="Lepaskan Perangkat"><i class="fas fa-mobile-alt"></i> Reset</button>` 
                : '';
                
            btnAksi = `
                <div class="flex justify-center gap-1">
                    <button onclick="openModalEditGuru('${g.nip}', '${(g.nama || '').replace(/'/g, "\\'")}', '${g.jabatan || ''}', '${g.wali_kelas || ''}', '${g.kelas_ajar || ''}')" class="bg-teal-50 text-teal-700 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors border border-teal-200"><i class="fas fa-edit"></i> Edit</button>
                    ${btnReset}
                </div>
            `;
        }

        let badgeKelasAjar = '-';
        if (g.kelas_ajar && g.kelas_ajar.trim() !== '') {
            badgeKelasAjar = g.kelas_ajar.split(',').map(k => `<span class="inline-block bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold mr-1 mb-1">${k.trim()}</span>`).join('');
        }

        const waliKelasVal = (g.wali_kelas && g.wali_kelas !== 'null') ? g.wali_kelas : '-';

        htmlRows += `
            <tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                <td class="px-6 py-4 font-mono text-gray-600 text-xs">${g.nip}</td>
                <td class="px-6 py-4 font-bold text-gray-900">${g.nama}</td>
                <td class="px-6 py-4 font-medium text-gray-700">${g.jabatan || '-'}</td>
                <td class="px-6 py-4"><span class="bg-orange-50 px-2.5 py-1 rounded-lg text-xs font-bold text-orange-700 border border-orange-100">${waliKelasVal}</span></td>
                <td class="px-6 py-4 whitespace-normal min-w-[200px]">${badgeKelasAjar}</td>
                <td class="px-6 py-4">${badgeDevice}</td>
                <td class="px-6 py-4 text-center">${btnAksi}</td>
            </tr>
        `;
    });

    tbody.innerHTML = htmlRows;
}

async function openModalEditGuru(nip, nama, jabatan, walikelas, kelasajar) {
    // 1. Set Identitas Dasar
    document.getElementById('edit-guru-nip').value = nip;
    document.getElementById('edit-guru-nama').value = nama;
    
    // 2. Set Dropdown Jabatan
    const selJabatan = document.getElementById('edit-guru-jabatan');
    if (jabatan && (jabatan.toLowerCase().includes('admin') || jabatan.toLowerCase().includes('operator'))) {
        selJabatan.value = 'Admin';
    } else {
        selJabatan.value = 'Guru Mapel';
    }

    // Tampilkan Modal UI Terlebih Dahulu
    document.getElementById('modal-edit-guru').classList.remove('hidden');
    document.getElementById('modal-edit-guru').classList.add('flex');

    const selWali = document.getElementById('edit-guru-walikelas');
    const wrapKelasAjar = document.getElementById('wrap-edit-guru-kelasajar');
    
    selWali.innerHTML = '<option value="">Memuat kelas...</option>';
    wrapKelasAjar.innerHTML = '<p class="text-[11px] text-gray-400 col-span-full text-center py-2"><i class="fas fa-spinner fa-spin"></i> Memuat kelas...</p>';

    // 3. Tarik Data Kelas Unik dari Database Siswa
    try {
        const { data } = await db.from('tabel_siswa').select('kelas');
        let unikKelas = [];
        if (data && data.length > 0) {
            // Ambil daftar kelas dan hilangkan duplikasi, lalu urutkan
            unikKelas = [...new Set(data.map(s => s.kelas).filter(Boolean))].sort();
        }

        // --- Render Dropdown Wali Kelas ---
        let optWali = '<option value="">Bukan Wali Kelas</option>';
        unikKelas.forEach(k => {
            const isSelected = (walikelas === k) ? 'selected' : '';
            optWali += `<option value="${k}" ${isSelected}>${k}</option>`;
        });
        selWali.innerHTML = optWali;

        // --- Render Checkbox Kelas Ajar ---
        const currentAjar = (kelasajar === 'null' || !kelasajar) ? [] : kelasajar.split(',').map(k => k.trim());
        if (unikKelas.length > 0) {
            wrapKelasAjar.innerHTML = unikKelas.map(k => `
                <label class="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-teal-50 transition-colors shadow-sm">
                    <input type="checkbox" value="${k}" class="cb-admin-kelas-ajar text-teal-600 rounded focus:ring-teal-500 w-3.5 h-3.5" ${currentAjar.includes(k) ? 'checked' : ''}>
                    <span class="text-[10px] font-bold text-gray-700 truncate">${k}</span>
                </label>
            `).join('');
        } else {
            wrapKelasAjar.innerHTML = '<p class="text-[11px] text-gray-400 col-span-full text-center py-2">Belum ada kelas terdaftar.</p>';
        }

    } catch (e) {
        console.error("Gagal menarik data kelas:", e);
        selWali.innerHTML = '<option value="">Gagal memuat kelas</option>';
        wrapKelasAjar.innerHTML = '<p class="text-[11px] text-red-500 col-span-full text-center py-2">Gagal memuat kelas.</p>';
    }
}

function closeModalEditGuru() {
    document.getElementById('modal-edit-guru').classList.add('hidden');
    document.getElementById('modal-edit-guru').classList.remove('flex');
}

async function simpanEditGuru() {
    const btn = document.getElementById('btn-save-edit-guru');
    const nip = document.getElementById('edit-guru-nip').value;
    const jabatan = document.getElementById('edit-guru-jabatan').value;
    const walikelas = document.getElementById('edit-guru-walikelas').value;
    
    // Ambil Data Checkbox Kelas Ajar yang Dicentang
    const cbs = document.querySelectorAll('.cb-admin-kelas-ajar:checked');
    const kelasajar = Array.from(cbs).map(cb => cb.value).join(',');

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    btn.disabled = true;

    try {
        const { error } = await db.from('tabel_guru')
            .update({ jabatan: jabatan, wali_kelas: walikelas, kelas_ajar: kelasajar })
            .eq('nip', nip);

        if (error) throw error;
        showToast('Hak akses guru berhasil diperbarui!');
        closeModalEditGuru();
        loadDataGuru(true); // Paksa segarkan tabel guru
    } catch (error) {
        console.error("Gagal simpan edit guru:", error);
        showToast('Gagal menyimpan perubahan hak akses.', true);
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Hak Akses';
        btn.disabled = false;
    }
}

// ==========================================
// 4. PENGAJUAN IZIN (PANEL ADMIN)
// ==========================================

async function loadIzinAdmin() {
    const tbody = document.getElementById('tabel-data-izin-admin');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8"><i class="fas fa-spinner fa-spin text-teal-600 text-2xl"></i><p class="text-sm mt-2 text-gray-500">Menarik data dari Cloud...</p></td></tr>';
    
    const authClasses = getGuruAuthClasses(currentUser);
    if (currentUser.role !== 'admin' && authClasses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500">Anda belum ditugaskan untuk memantau kelas manapun.</td></tr>';
        return;
    }

    let query = db.from('tabel_izin').select('*').order('id', { ascending: false }).limit(100);
    
    if (authClasses[0] !== 'ALL') {
        const { data: allowedSiswa } = await db.from('tabel_siswa').select('nis').in('kelas', authClasses);
        if (!allowedSiswa || allowedSiswa.length === 0) {
             tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500">Belum ada pengajuan izin di kelas Anda.</td></tr>';
             return;
        }
        const allowedNisList = allowedSiswa.map(s => s.nis);
        query = query.in('nis', allowedNisList);
    }
    
    const { data, error } = await query;
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500">Belum ada pengajuan izin.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    data.forEach(izin => {
        const statusColor = izin.status === 'Disetujui' ? 'bg-green-100 text-green-700' : (izin.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700');
        const lampiranLink = izin.lampiran ? `<br><a href="${izin.lampiran}" target="_blank" class="text-blue-500 hover:underline text-xs"><i class="fas fa-paperclip"></i> Lihat Lampiran</a>` : '';
        
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 border-b border-gray-50">
                <td class="px-6 py-4 text-xs font-semibold text-gray-600">${izin.tanggal}</td>
                <td class="px-6 py-4 font-bold text-gray-900">${izin.nama} <span class="font-mono text-xs text-gray-400 block">${izin.nis}</span></td>
                <td class="px-6 py-4"><span class="bg-gray-100 px-2 py-1 rounded text-xs font-bold">${izin.jenis}</span></td>
                <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title="${izin.keterangan}">${izin.keterangan} ${lampiranLink}</td>
                <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-lg text-xs font-bold ${statusColor}">${izin.status}</span></td>
                <td class="px-6 py-4 text-center">
                    ${izin.status === 'Menunggu' ? `
                        <button onclick="updateStatusIzin(${izin.id}, 'Disetujui')" class="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded mr-1" title="Setujui"><i class="fas fa-check"></i></button>
                        <button onclick="updateStatusIzin(${izin.id}, 'Ditolak')" class="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded" title="Tolak"><i class="fas fa-times"></i></button>
                    ` : '-'}
                </td>
            </tr>
        `;
    });
}

async function updateStatusIzin(id, statusBaru) {
    try {
        // 1. Tarik detail pengajuan untuk mengetahui NIS, Tanggal, dan Jenisnya
        const { data: izin, error: errGet } = await db.from('tabel_izin')
            .select('*')
            .eq('id', id)
            .single();
            
        if (errGet) throw errGet;

        // 2. Perbarui status di tabel_izin menjadi Disetujui/Ditolak
        const { error: errUpdate } = await db.from('tabel_izin')
            .update({ status: statusBaru })
            .eq('id', id);
            
        if (errUpdate) throw errUpdate;

        // ===============================================================
        // 3. AUTO-INJECT PRESENSI (JIKA DISETUJUI & MERUPAKAN LUPA ABSEN)
        // ===============================================================
        if (statusBaru === 'Disetujui' && izin.jenis.includes('Lupa Absen')) {
            // Cek apakah siswa sudah punya baris presensi di tanggal tersebut
            const { data: presensi } = await db.from('tabel_presensi')
                .select('*')
                .eq('nis', izin.nis)
                .eq('tanggal', izin.tanggal)
                .maybeSingle();

            let payloadPresensi = {};
            
            // Kita beri tanda khusus "(Klaim)" agar admin tahu itu hasil ACC
            if (izin.jenis === 'Lupa Absen Masuk') {
                payloadPresensi.jam_masuk = '07:00 (Klaim)'; 
                payloadPresensi.status_masuk = 'Hadir';
            } else if (izin.jenis === 'Lupa Absen Pulang') {
                payloadPresensi.jam_pulang = '14:30 (Klaim)';
                payloadPresensi.status_pulang = 'Hadir';
            }

            if (presensi) {
                // Jika baris presensi sudah ada, cukup tambahkan jam/status yang kurang
                await db.from('tabel_presensi').update(payloadPresensi).eq('id', presensi.id);
            } else {
                // Jika hari itu dia sama sekali tidak absen, buatkan baris baru
                payloadPresensi.nis = izin.nis;
                payloadPresensi.nama = izin.nama;
                payloadPresensi.tanggal = izin.tanggal;
                
                // Cari data kelas siswa untuk dimasukkan ke log presensi
                const { data: siswa } = await db.from('tabel_siswa').select('kelas').eq('nis', izin.nis).maybeSingle();
                payloadPresensi.kelas = siswa ? siswa.kelas : '-';
                
                await db.from('tabel_presensi').insert([payloadPresensi]);
            }
        }

        showToast(`Pengajuan berhasil ${statusBaru.toLowerCase()}!`);
        loadIzinAdmin(); 
    } catch (error) {
        console.error("Gagal update status izin:", error);
        showToast('Gagal mengubah status', true);
    }
}

// ==========================================
// 5. IMPORT EXCEL KE SUPABASE
// ==========================================

let selectedFile = null;
window.handleFileSelect = function(event) {
    selectedFile = event.target.files[0];
    const btnProcess = document.getElementById('btn-process-import');
    if (selectedFile) {
        btnProcess.classList.remove('opacity-50', 'cursor-not-allowed');
        btnProcess.removeAttribute('disabled');
        document.getElementById('import-status').innerHTML = `<i class="fas fa-check-circle text-green-500"></i> Siap upload: <b>${selectedFile.name}</b>`;
        document.getElementById('import-status').classList.remove('hidden', 'bg-red-50', 'text-red-700');
        document.getElementById('import-status').classList.add('block', 'bg-blue-50', 'text-blue-700');
    }
};

window.processImportToCloud = function() {
    if (!selectedFile) return;
    const type = document.getElementById('import-type').value;
    const statusText = document.getElementById('import-status');
    const btnProcess = document.getElementById('btn-process-import');
    
    statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membaca & mengirim data ke Cloud...';
    btnProcess.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            
            if (json.length === 0) throw new Error("File Excel kosong tidak ada data.");
            
            let targetTable = 'tabel_siswa';
            if (type === 'guru') targetTable = 'tabel_guru';
            if (type === 'jadwal') targetTable = 'tabel_jadwal';
            
            const payload = json.map(row => {
                let cleanRow = {};
                for (const key in row) {
                    const cleanKey = key.trim().toLowerCase();
                    if (cleanKey !== '__empty' && !cleanKey.startsWith('__empty_')) {
                         cleanRow[cleanKey] = String(row[key]); 
                    }
                }
                return cleanRow;
            });

            const { error } = await db.from(targetTable).upsert(payload); 
            
            if (error) {
                console.error("Supabase Error Details:", error);
                throw error;
            }

            statusText.classList.replace('bg-blue-50', 'bg-green-50');
            statusText.classList.replace('text-blue-700', 'text-green-700');
            statusText.innerHTML = `<i class="fas fa-check-circle"></i> <b>Sukses!</b> ${payload.length} data dikirim ke ${targetTable}.`;
            
            document.getElementById('file-import').value = '';
            selectedFile = null;
            setTimeout(() => { 
                btnProcess.innerHTML = 'Kirim ke Cloud'; 
                btnProcess.classList.add('opacity-50', 'cursor-not-allowed');
                btnProcess.setAttribute('disabled', 'true');
            }, 2000);
            
            loadDashboardGuruData();

        } catch (err) {
            console.error(err);
            statusText.classList.replace('bg-blue-50', 'bg-red-50');
            statusText.classList.replace('text-blue-700', 'text-red-700');
            
            const errMsg = err.message || (err.hint ? err.hint : "Gagal upload. Cek Console browser.");
            statusText.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <b>Error Server:</b> ${errMsg}`;
            
            btnProcess.innerHTML = 'Coba Lagi';
        }
    };
    reader.readAsArrayBuffer(selectedFile);
};

window.downloadTemplate = function(type) {
    let data = [];
    let fileName = `Template_${type}_Supabase.xlsx`;

    if (type === 'siswa') {
        data = [{ 
            nisn: "0118771800", nis: "20260001", nama: "Aiman Nuralamsyah", jk: "L", 
            tingkat: "X", kelas: "X-AKL 1", status_siswa: "Aktif", id_jurusan: "AKL", 
            tempat_lahir: "", tgl_lahir: "", no_hp: "08123456789", email_siswa: "siswa@mail.com", alamat: "Jl. Contoh" 
        }];
    } else if (type === 'guru') {
        data = [{ 
            nip: "19830410", nama: "Contoh Guru", jk: "P", 
            jabatan: "Guru Mapel", wali_kelas: "X-A", kelas_ajar: "X-A, XI-A" 
        }];
    } else if (type === 'jadwal') {
        data = [
            { hari: "Senin", jam_mulai: "07:00", jam_selesai: "07:45", mapel: "Upacara Bendera", guru: "Kesiswaan", ruang: "Lapangan", kelas: "XII-PF 1" },
            { hari: "Senin", jam_mulai: "07:45", jam_selesai: "09:15", mapel: "Produksi Siaran TV", guru: "Bpk. Mardas, S.Pd", ruang: "Studio TV 1", kelas: "XII-PF 1" },
            { hari: "Selasa", jam_mulai: "07:15", jam_selesai: "09:30", mapel: "Editing Audio Video", guru: "Tim BDF", ruang: "Lab Editing", kelas: "XII-PF 1" }
        ];
    }
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, fileName);
};

// ==========================================
// 6. PENGATURAN SISTEM & PROFIL GURU
// ==========================================

async function loadPengaturan() {
    const btn = document.getElementById('btn-save-pengaturan');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
    
    // Tarik daftar template terlebih dahulu untuk mengisi opsi Dropdown L & P
    await loadDaftarTemplate();
    
    try {
        const { data, error } = await db.from('tabel_pengaturan').select('*').limit(1).single();
        if (data) {
            cachedPengaturan = data;
            document.getElementById('set-jam-masuk-buka').value = data.jam_masuk_mulai || '';
            document.getElementById('set-jam-masuk-tutup').value = data.jam_masuk_akhir || '';
            document.getElementById('set-jam-pulang').value = data.jam_pulang_mulai || '';
            document.getElementById('set-lat').value = data.lokasi_lat || '';
            document.getElementById('set-lng').value = data.lokasi_lng || '';
            document.getElementById('set-radius').value = data.radius || '';
            
            document.getElementById('set-logo-url').value = data.logo_url || '';
            document.getElementById('set-logo-sekolah-url').value = data.logo_sekolah_url || '';
            document.getElementById('set-bg-url').value = data.bg_url || '';

            document.getElementById('set-akses-jadwal').checked = data.akses_guru_jadwal || false;
            document.getElementById('set-akses-kelas').checked = data.akses_guru_kelas || false;

            // Pengaturan Fitur Ulang Tahun
            document.getElementById('set-ultah-aktif').checked = cachedPengaturan.fitur_ultah_aktif !== false; 
            
            // Pilih template aktif dari database
            if(cachedPengaturan.template_l) document.getElementById('select-template-l').value = cachedPengaturan.template_l;
            if(cachedPengaturan.template_p) document.getElementById('select-template-p').value = cachedPengaturan.template_p;
            
            if (data.logo_url) {
                document.getElementById('preview-logo-setting').src = data.logo_url;
                document.getElementById('preview-logo-setting').classList.remove('hidden');
            }
            if (data.logo_sekolah_url) {
                document.getElementById('preview-logo-sekolah-setting').src = data.logo_sekolah_url;
                document.getElementById('preview-logo-sekolah-setting').classList.remove('hidden');
            }
            if (data.bg_url) {
                document.getElementById('preview-bg-setting').src = data.bg_url;
                document.getElementById('preview-bg-setting').classList.remove('hidden');
            }
        }
    } catch (err) {
        console.log("Belum ada data pengaturan.");
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Pengaturan';
    }
}

function getLokasiSekarang() {
    if (navigator.geolocation) {
        showToast('Mencari koordinat lokasi Anda...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('set-lat').value = position.coords.latitude;
                document.getElementById('set-lng').value = position.coords.longitude;
                showToast('Lokasi berhasil didapatkan!');
            },
            (error) => {
                showToast('Gagal mendapatkan lokasi. Izinkan akses GPS di browser Anda.', true);
            }
        );
    } else {
        showToast('Browser Anda tidak mendukung GPS.', true);
    }
}

async function handleTampilanUpload(fileInputId, statusId, hiddenInputId, previewId) {
    const file = document.getElementById(fileInputId).files[0];
    if (!file) return;
    
    const statusEl = document.getElementById(statusId);
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengunggah...';
    statusEl.className = 'text-[10px] text-teal-600 mt-1 font-bold';

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `aset_${fileInputId}_${Date.now()}.${fileExt}`;
        const publicUrl = await uploadFileToSupabase(file, 'aset_aplikasi', fileName);
        
        document.getElementById(hiddenInputId).value = publicUrl;
        const previewEl = document.getElementById(previewId);
        previewEl.src = publicUrl;
        previewEl.classList.remove('hidden');
        
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Berhasil diunggah';
        statusEl.className = 'text-[10px] text-green-600 mt-1 font-bold';
    } catch (error) {
        statusEl.innerHTML = `<i class="fas fa-times-circle"></i> Gagal unggah. Cek bucket 'aset_aplikasi' dan RLS.`;
        statusEl.className = 'text-[10px] text-red-500 mt-1 font-bold';
        console.error(error);
    }
}

const setLogoFileEl = document.getElementById('set-logo-file');
if (setLogoFileEl) setLogoFileEl.addEventListener('change', () => handleTampilanUpload('set-logo-file', 'status-logo-upload', 'set-logo-url', 'preview-logo-setting'));

const setBgFileEl = document.getElementById('set-bg-file');
if (setBgFileEl) setBgFileEl.addEventListener('change', () => handleTampilanUpload('set-bg-file', 'status-bg-upload', 'set-bg-url', 'preview-bg-setting'));

const setLogoSekolahFileEl = document.getElementById('set-logo-sekolah-file');
if (setLogoSekolahFileEl) setLogoSekolahFileEl.addEventListener('change', () => handleTampilanUpload('set-logo-sekolah-file', 'status-logo-sekolah-upload', 'set-logo-sekolah-url', 'preview-logo-sekolah-setting'));

async function simpanPengaturan() {
    const btn = document.getElementById('btn-save-pengaturan');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;
    
    try {
        const payload = {
            id: 1, 
            jam_masuk_mulai: document.getElementById('set-jam-masuk-buka').value,
            jam_masuk_akhir: document.getElementById('set-jam-masuk-tutup').value,
            jam_pulang_mulai: document.getElementById('set-jam-pulang').value,
            lokasi_lat: document.getElementById('set-lat').value,
            lokasi_lng: document.getElementById('set-lng').value,
            radius: document.getElementById('set-radius').value,
            logo_url: document.getElementById('set-logo-url').value, 
            bg_url: document.getElementById('set-bg-url').value,
            logo_sekolah_url: document.getElementById('set-logo-sekolah-url').value,  
            akses_guru_jadwal: document.getElementById('set-akses-jadwal').checked,
            akses_guru_kelas: document.getElementById('set-akses-kelas').checked,
            // HANYA simpan status aktif sakelar. Data template_l dan template_p sudah 
            // disimpan secara otomatis oleh fungsi simpanTemplateAktif()
            fitur_ultah_aktif: document.getElementById('set-ultah-aktif').checked
        };

        const { error } = await db.from('tabel_pengaturan').upsert(payload);
        if (error) throw error;
        
        cachedPengaturan = { ...cachedPengaturan, ...payload };
        showToast('Pengaturan berhasil disimpan ke Cloud!');
    } catch (err) {
        const errorMsg = err.message || 'Terjadi kesalahan saat menyimpan.';
        showToast(`Gagal menyimpan: ${errorMsg}`, true);
        console.error("Detail Error Supabase:", err);
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Pengaturan';
        btn.disabled = false;
    }
}

const editFotoGuruFileEl = document.getElementById('edit-foto-guru-file');
if (editFotoGuruFileEl) {
    editFotoGuruFileEl.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        // PERBAIKAN: Izinkan guru DAN admin untuk ganti foto
        if (!file || !currentUser || (currentUser.role !== 'guru' && currentUser.role !== 'admin')) return;
        
        const statusEl = document.getElementById('status-foto-guru-upload');
        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengunggah foto...';
        statusEl.className = 'text-xs text-teal-600 mt-1 font-bold';

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `profil_guru_${currentUser.nip}_${Date.now()}.${fileExt}`;
            const publicUrl = await uploadFileToSupabase(file, 'foto_profil', fileName);
            
            document.getElementById('edit-foto-guru-url').value = publicUrl;
            
            document.getElementById('edit-preview-foto-guru').style.display = 'block';
            document.getElementById('edit-preview-foto-guru').src = publicUrl;
            document.getElementById('edit-preview-foto-guru').classList.remove('hidden');
            
            document.getElementById('edit-icon-guru').style.display = 'none';
            document.getElementById('edit-icon-guru').classList.add('hidden');

            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Berhasil diunggah (Jangan lupa klik Simpan)';
            statusEl.className = 'text-xs text-green-600 mt-1 font-bold';
        } catch (error) {
            let errorMsg = 'Gagal unggah foto.';
            if (error.message && error.message.includes('row-level security')) {
               errorMsg = 'Akses ditolak. Cek RLS Policy Storage.';
            }
            statusEl.innerHTML = `<i class="fas fa-times-circle"></i> ${errorMsg}`;
            statusEl.className = 'text-xs text-red-500 mt-1 font-bold';
            console.error(error);
        }
    });
}

function loadProfilGuru() {
    if (!currentUser) return;

    document.getElementById('lbl-nama-guru').innerText = currentUser.nama || 'Pengguna';
    document.getElementById('lbl-nip-guru').innerText = `ID/NIP: ${currentUser.nip} | ${currentUser.jabatan || 'Pengajar'}`;
    
    document.getElementById('edit-foto-guru-url').value = currentUser.foto_profil || '';
    document.getElementById('edit-password-guru').value = ''; 
    document.getElementById('edit-foto-guru-file').disabled = false;
    document.getElementById('edit-password-guru').disabled = false;
    document.getElementById('btn-simpan-profil-guru').disabled = false;
    
    const editImg = document.getElementById('edit-preview-foto-guru');
    const editIco = document.getElementById('edit-icon-guru');
    
    if (currentUser.foto_profil) {
        editImg.style.display = 'block'; 
        editImg.src = currentUser.foto_profil;
        editImg.classList.remove('hidden');
        editIco.style.display = 'none';
        editIco.classList.add('hidden');
    } else {
        editImg.style.display = 'none';
        editImg.classList.add('hidden');
        editIco.style.display = 'block';
        editIco.classList.remove('hidden');
    }
}

async function simpanProfilGuru() {
    // Izinkan guru DAN admin untuk menyimpan data profil/kata sandi
    if (!currentUser || (currentUser.role !== 'guru' && currentUser.role !== 'admin')) return;

    const btn = document.getElementById('btn-simpan-profil-guru');
    const fotoUrl = document.getElementById('edit-foto-guru-url').value.trim();
    const passBaru = document.getElementById('edit-password-guru').value.trim();

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    let dataUpdate = {};
    if (fotoUrl !== '') dataUpdate.foto_profil = fotoUrl;
    if (passBaru !== '') dataUpdate.password = passBaru;

    // --- TARIK DATA KELAS AJAR DARI CHECKBOX ---
    const containerKelas = document.getElementById('container-edit-kelas-ajar');
    if (containerKelas && !containerKelas.classList.contains('hidden')) {
        const cbs = document.querySelectorAll('.cb-kelas-ajar:checked');
        // Gabungkan array menjadi string dipisah koma (tanpa spasi berlebih)
        const kelasAjarStr = Array.from(cbs).map(cb => cb.value).join(',');
        dataUpdate.kelas_ajar = kelasAjarStr;
    }
    // -------------------------------------------

    if (Object.keys(dataUpdate).length === 0) {
         showToast('Tidak ada perubahan yang disimpan.');
         btn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan Akun';
         btn.disabled = false;
         return;
    }

    try {
        const { error } = await db.from('tabel_guru')
            .update(dataUpdate)
            .eq('nip', currentUser.nip);

        if (error) throw error;

        // --- SINKRONISASI MEMORI (AGAR LANGSUNG EFEK TANPA LOGOUT) ---
        if (fotoUrl !== '') {
            currentUser.foto_profil = fotoUrl;
            updateFotoGuruUI(fotoUrl); 
        }
        if (passBaru !== '') {
            currentUser.password = passBaru;
        }
        if (dataUpdate.kelas_ajar !== undefined) {
            currentUser.kelas_ajar = dataUpdate.kelas_ajar; // <--- INI KUNCI UTAMANYA
        }

        // Simpan sesi baru ke memori peramban
        localStorage.setItem('app_session', JSON.stringify(currentUser));
        
        // --- PAKSA RESET CACHE TABEL ---
        // Kosongkan list memori agar menu Siswa & Jadwal menarik data baru dari Cloud
        if (typeof rawSiswaList !== 'undefined') rawSiswaList = [];
        if (typeof rawJadwalList !== 'undefined') rawJadwalList = [];
        
        // Segarkan angka statistik di Dashboard
        if (typeof loadDashboardGuruData === 'function') loadDashboardGuruData();
        
        showToast('Profil akun berhasil diperbarui!');
        document.getElementById('edit-password-guru').value = ''; 
    } catch (error) {
        console.error("Detail Error Guru:", error);
        
        let errMsg = "Gagal menyimpan profil!";
        if (error.message) {
             if (error.message.includes("row-level security") || error.code === '42501') {
                 errMsg = "Akses ditolak database (Cek RLS tabel_guru untuk Update).";
             } else {
                 errMsg = error.message;
             }
        }
        showToast(`Gagal: ${errMsg}`, true);
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan Akun';
        btn.disabled = false;
    }
}


// ==========================================
// 7. MANAJEMEN PENGUMUMAN (PANEL ADMIN/GURU)
// ==========================================

async function loadPengumumanAdmin() {
    const tbody = document.getElementById('tabel-data-pengumuman-admin');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8"><i class="fas fa-spinner fa-spin text-teal-600 text-2xl"></i><p class="text-sm mt-2 text-gray-500">Menarik data pengumuman...</p></td></tr>';

    try {
        const { data, error } = await db.from('tabel_pengumuman')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-gray-400">Belum ada pengumuman yang dibuat.</td></tr>';
            return;
        }

        let html = '';
        data.forEach(item => {
            let badgeKat = 'bg-blue-50 text-blue-600 border-blue-200';
            if (item.kategori === 'Penting') badgeKat = 'bg-rose-50 text-rose-600 border-rose-200';
            if (item.kategori === 'Kegiatan') badgeKat = 'bg-emerald-50 text-emerald-600 border-emerald-200';
            if (item.kategori === 'Akademik') badgeKat = 'bg-amber-50 text-amber-700 border-amber-200';

            html += `
                <tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                    <td class="px-6 py-4">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeKat}">
                            ${item.kategori || 'Informasi'}
                        </span>
                    </td>
                    <td class="px-6 py-4 max-w-sm">
                        <h4 class="font-bold text-gray-800 text-xs truncate mb-1" title="${item.judul}">${item.judul}</h4>
                        <p class="text-gray-500 text-[11px] truncate whitespace-normal line-clamp-2" title="${item.isi}">${item.isi}</p>
                    </td>
                    <td class="px-6 py-4">
                        <span class="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-[10px] font-bold">
                            ${item.target_kelas || 'ALL'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-xs text-gray-600 font-medium">
                        ${item.penulis || 'Admin'}
                    </td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="hapusPengumuman(${item.id})" class="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-200" title="Hapus Pengumuman">
                            <i class="fas fa-trash-alt"></i> Hapus
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (err) {
        console.error("Gagal memuat pengumuman admin:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-500 font-medium">Gagal mengambil data (${err.message || 'Error RLS'})</td></tr>`;
    }
}

async function tambahPengumumanBaru() {
    const judulEl = document.getElementById('admin-pengumuman-judul');
    const kategoriEl = document.getElementById('admin-pengumuman-kategori');
    const targetEl = document.getElementById('admin-pengumuman-target');
    const isiEl = document.getElementById('admin-pengumuman-isi');
    const btn = document.getElementById('btn-tambah-pengumuman');

    const judul = judulEl.value.trim();
    const kategori = kategoriEl.value;
    const target = targetEl.value.trim() || 'ALL';
    const isi = isiEl.value.trim();

    if (!judul || !isi) {
        return showToast('Judul dan isi pengumuman wajib diisi!', true);
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mempublikasikan...';
    btn.disabled = true;

    try {
        const payload = {
            judul: judul,
            isi: isi,
            kategori: kategori,
            target_kelas: target,
            penulis: currentUser ? currentUser.nama : 'Admin Sekolah'
        };

        const { error } = await db.from('tabel_pengumuman').insert([payload]);
        if (error) throw error;

        showToast('Pengumuman berhasil dipublikasikan!');
        judulEl.value = '';
        isiEl.value = '';
        targetEl.value = 'ALL';
        
        loadPengumumanAdmin();

    } catch (err) {
        console.error("Gagal tambah pengumuman:", err);
        showToast(`Gagal: ${err.message || 'Terjadi kesalahan sistem'}`, true);
    } finally {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publikasikan Pengumuman';
        btn.disabled = false;
    }
}

async function hapusPengumuman(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) return;

    try {
        const { error } = await db.from('tabel_pengumuman').delete().eq('id', id);
        if (error) throw error;

        showToast('Pengumuman berhasil dihapus!');
        loadPengumumanAdmin();
    } catch (err) {
        console.error("Gagal menghapus pengumuman:", err);
        showToast(`Gagal menghapus: ${err.message}`, true);
    }
}


// ==========================================
// 8. MANAJEMEN JADWAL PELAJARAN (ADMIN/GURU)
// ==========================================

let rawJadwalList = [];

async function loadJadwalAdmin(forceReload = false) {
    const tbody = document.getElementById('tabel-data-jadwal-admin');
    const counterEl = document.getElementById('counter-jadwal-admin');
    if (!tbody) return;

    if (!forceReload && rawJadwalList && rawJadwalList.length > 0) {
        applyFilterJadwal();
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8"><i class="fas fa-spinner fa-spin text-purple-600 text-2xl"></i><p class="text-sm mt-2 text-gray-500">Menarik data jadwal dari Cloud...</p></td></tr>';

    try {
        const { data, error } = await db.from('tabel_jadwal')
            .select('*')
            .order('hari', { ascending: true })
            .order('jam_mulai', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-400">Belum ada data jadwal pelajaran.</td></tr>';
            if (counterEl) counterEl.innerText = "0 jadwal";
            rawJadwalList = [];
            return;
        }

        rawJadwalList = data;

        // Isi opsi filter kelas otomatis dari data yang ada
        const filterKelasEl = document.getElementById('filter-jadwal-kelas');
        if (filterKelasEl) {
            const currentSelected = filterKelasEl.value;
            const availableClasses = [...new Set(data.map(j => j.kelas ? j.kelas.trim() : null).filter(Boolean))].sort();
            filterKelasEl.innerHTML = '<option value="ALL">Semua Kelas</option>';
            availableClasses.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = k;
                if (k === currentSelected) opt.selected = true;
                filterKelasEl.appendChild(opt);
            });
        }

        applyFilterJadwal();

    } catch (err) {
        console.error("Gagal memuat jadwal admin:", err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500 font-medium">Gagal memuat jadwal (${err.message || 'Error RLS'})</td></tr>`;
    }
}

function applyFilterJadwal() {
    const tbody = document.getElementById('tabel-data-jadwal-admin');
    const counterEl = document.getElementById('counter-jadwal-admin');
    if (!rawJadwalList || rawJadwalList.length === 0) return;

    const filterKelas = document.getElementById('filter-jadwal-kelas')?.value || 'ALL';
    const filterHari = document.getElementById('filter-jadwal-hari')?.value || 'ALL';

    const urutanHari = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };

    let filtered = rawJadwalList.filter(j => {
        const matchKelas = filterKelas === 'ALL' || (j.kelas && j.kelas.trim() === filterKelas);
        const matchHari = filterHari === 'ALL' || (j.hari && j.hari.trim() === filterHari);
        return matchKelas && matchHari;
    });

    // Urutkan berdasarkan hari (Senin - Jumat) lalu jam mulai
    filtered.sort((a, b) => {
        const hA = urutanHari[a.hari] || 99;
        const hB = urutanHari[b.hari] || 99;
        if (hA !== hB) return hA - hB;
        return String(a.jam_mulai || '').localeCompare(String(b.jam_mulai || ''));
    });

    if (counterEl) counterEl.innerText = `${filtered.length} jadwal ditemukan`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-400">Tidak ada jadwal yang cocok dengan filter.</td></tr>';
        return;
    }

    let html = '';
    filtered.forEach(item => {
        html += `
            <tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                <td class="px-5 py-3.5">
                    <span class="font-bold text-gray-800 text-xs block">${item.hari}</span>
                    <span class="text-purple-600 font-mono text-[11px] font-semibold">${item.jam_mulai} - ${item.jam_selesai}</span>
                </td>
                <td class="px-5 py-3.5 font-bold text-gray-900 text-xs">${item.mapel}</td>
                <td class="px-5 py-3.5 text-xs text-gray-600 font-medium">${item.guru || '-'}</td>
                <td class="px-5 py-3.5"><span class="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs font-bold border border-blue-100">${item.kelas}</span></td>
                <td class="px-5 py-3.5 text-xs text-gray-500">${item.ruang || 'Kelas'}</td>
                <td class="px-5 py-3.5 text-center">
                    <button onclick="hapusJadwal(${item.id})" class="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-200" title="Hapus Jadwal">
                        <i class="fas fa-trash-alt"></i> Hapus
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

async function tambahJadwalBaru() {
    const hari = document.getElementById('form-jadwal-hari').value;
    const jam_mulai = document.getElementById('form-jadwal-mulai').value;
    const jam_selesai = document.getElementById('form-jadwal-selesai').value;
    const mapel = document.getElementById('form-jadwal-mapel').value.trim();
    const guru = document.getElementById('form-jadwal-guru').value.trim();
    const kelas = document.getElementById('form-jadwal-kelas').value.trim();
    const ruang = document.getElementById('form-jadwal-ruang').value.trim() || 'Kelas';
    const btn = document.getElementById('btn-tambah-jadwal');

    if (!mapel || !kelas || !jam_mulai || !jam_selesai) {
        return showToast('Harap lengkapi mata pelajaran, kelas, dan jam pelajaran!', true);
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    try {
        const payload = {
            hari: hari,
            jam_mulai: jam_mulai,
            jam_selesai: jam_selesai,
            mapel: mapel,
            guru: guru || '-',
            kelas: kelas,
            ruang: ruang
        };

        const { error } = await db.from('tabel_jadwal').insert([payload]);
        if (error) throw error;

        showToast('Jadwal pelajaran berhasil ditambahkan!');
        document.getElementById('form-jadwal-mapel').value = '';
        document.getElementById('form-jadwal-guru').value = '';

        loadJadwalAdmin(true);

    } catch (err) {
        console.error("Gagal menambah jadwal:", err);
        showToast(`Gagal: ${err.message || 'Terjadi kesalahan'}`, true);
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Jadwal';
        btn.disabled = false;
    }
}

async function hapusJadwal(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;

    try {
        const { error } = await db.from('tabel_jadwal').delete().eq('id', id);
        if (error) throw error;

        showToast('Jadwal berhasil dihapus!');
        loadJadwalAdmin(true);
    } catch (err) {
        console.error("Gagal menghapus jadwal:", err);
        showToast(`Gagal: ${err.message}`, true);
    }
}

async function initDropdownJadwal() {
    const selMapel = document.getElementById('form-jadwal-mapel');
    const selKelas = document.getElementById('form-jadwal-kelas');
    const selGuru = document.getElementById('form-jadwal-guru'); // Sekarang ini adalah elemen <select>

    // 1. Atur Kolom Guru berdasarkan Role
    if (currentUser.role === 'guru') {
        selGuru.innerHTML = `<option value="${currentUser.nama}" selected>${currentUser.nama}</option>`;
        selGuru.disabled = true; // Kunci pilihan
        selGuru.className = "w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-100 text-gray-500 font-bold cursor-not-allowed outline-none appearance-none";
    } else {
        selGuru.disabled = false;
        selGuru.className = "w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-500 bg-gray-50/50";
        // Tarik Daftar Guru untuk Admin
        try {
            const { data: guruData } = await db.from('tabel_guru').select('nama').order('nama');
            let optGuru = '<option value="">Pilih Guru Pengajar...</option>';
            if (guruData) guruData.forEach(g => optGuru += `<option value="${g.nama}">${g.nama}</option>`);
            selGuru.innerHTML = optGuru;
        } catch(e) { console.error("Gagal memuat guru:", e); }
    }

    // 2. Tarik Daftar Mapel
    try {
        const { data: mapel } = await db.from('tabel_mapel').select('nama_mapel').order('nama_mapel');
        let optMapel = '<option value="">Pilih Mapel...</option>';
        if (mapel) mapel.forEach(m => optMapel += `<option value="${m.nama_mapel}">${m.nama_mapel}</option>`);
        selMapel.innerHTML = optMapel;
    } catch(e) { console.error("Gagal memuat mapel:", e); }

    // 3. Tarik Daftar Kelas
    try {
        const { data: siswa } = await db.from('tabel_siswa').select('kelas');
        let optKelas = '<option value="">Pilih Kelas Target...</option>';
        if (siswa) {
            const unik = [...new Set(siswa.map(s => s.kelas).filter(Boolean))].sort();
            unik.forEach(k => optKelas += `<option value="${k}">${k}</option>`);
        }
        selKelas.innerHTML = optKelas;
    } catch(e) { console.error("Gagal memuat kelas:", e); }
}

// Fungsi Pemicu Tambah Mapel Instan
async function promptTambahMapel() {
    const nama = prompt("Masukkan nama Mata Pelajaran baru (Cth: Bahasa Indonesia):");
    if (!nama || nama.trim() === '') return;
    try {
        showToast("Menyimpan mata pelajaran...");
        const { error } = await db.from('tabel_mapel').insert([{ nama_mapel: nama.trim() }]);
        if (error) throw error;
        showToast("Mata pelajaran berhasil ditambahkan!");
        initDropdownJadwal(); // Segarkan dropdown mapel
    } catch (e) {
        showToast("Gagal menambah mapel (Cek RLS tabel_mapel)", true);
    }
}


// ==========================================
// 8.5 MANAJEMEN TEMPLATE ULANG TAHUN
// ==========================================

let daftarTemplateL = [];
let daftarTemplateP = [];

function bukaModalKelolaTemplate() {
    const modal = document.getElementById('modal-template-ultah');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    loadDaftarTemplate(true);
}

function tutupModalTemplateUltah() {
    const modal = document.getElementById('modal-template-ultah');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function loadDaftarTemplate(isFromModal = false) {
    try {
        const { data, error } = await db.from('tabel_template_ultah').select('*').order('id', { ascending: false });
        if (error) throw error;
        
        daftarTemplateL = data ? data.filter(t => t.jenis_kelamin === 'L') : [];
        daftarTemplateP = data ? data.filter(t => t.jenis_kelamin === 'P') : [];
        
        const selCardL = document.getElementById('select-template-l');
        const selCardP = document.getElementById('select-template-p');
        const selModalL = document.getElementById('aktif-template-l');
        const selModalP = document.getElementById('aktif-template-p');
        
        let optL = '<option value="">-- Pilih Template Laki-laki --</option>';
        daftarTemplateL.forEach(t => optL += `<option value="${t.id}">${t.nama_template}</option>`);
        if(selCardL) selCardL.innerHTML = optL;
        if(selModalL) selModalL.innerHTML = optL;

        let optP = '<option value="">-- Pilih Template Perempuan --</option>';
        daftarTemplateP.forEach(t => optP += `<option value="${t.id}">${t.nama_template}</option>`);
        if(selCardP) selCardP.innerHTML = optP;
        if(selModalP) selModalP.innerHTML = optP;
        
        if (cachedPengaturan) {
            if(cachedPengaturan.template_l && selModalL) selModalL.value = cachedPengaturan.template_l;
            if(cachedPengaturan.template_p && selModalP) selModalP.value = cachedPengaturan.template_p;
        }

        if (isFromModal) {
            const tbody = document.getElementById('tabel-daftar-template');
            let rows = '';
            if (!data || data.length === 0) {
                rows = '<tr><td colspan="4" class="text-center py-4">Belum ada template.</td></tr>';
            } else {
                data.forEach(t => {
                    const badgeJK = t.jenis_kelamin === 'L' 
                        ? '<span class="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-[9px]">Laki-Laki</span>' 
                        : '<span class="bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded text-[9px]">Perempuan</span>';
                    
                    // PERBAIKAN: Menambahkan tombol Edit berwarna biru
                    rows += `
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td class="px-4 py-3 font-bold text-gray-800">${t.nama_template}</td>
                        <td class="px-4 py-3">${badgeJK}</td>
                        <td class="px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="editTemplate(${t.id})" class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 w-8 h-8 rounded-full transition-all" title="Edit Template"><i class="fas fa-pencil-alt text-xs"></i></button>
                                <button onclick="hapusTemplate(${t.id})" class="text-red-400 hover:text-red-600 hover:bg-red-50 w-8 h-8 rounded-full transition-all" title="Hapus Template"><i class="fas fa-trash-alt text-xs"></i></button>
                            </div>
                        </td>
                    </tr>`;
                });
            }
            tbody.innerHTML = rows;
        }

    } catch(err) {
        console.error("Gagal memuat template:", err);
    }
}

// FUNGSI BARU: Tarik data ke form untuk di-edit
function editTemplate(id) {
    const semuaTpl = [...daftarTemplateL, ...daftarTemplateP];
    const dataTpl = semuaTpl.find(t => String(t.id) === String(id));
    
    if (dataTpl) {
        document.getElementById('form-tpl-id').value = dataTpl.id; // Simpan ID
        document.getElementById('form-tpl-nama').value = dataTpl.nama_template;
        document.getElementById('form-tpl-jk').value = dataTpl.jenis_kelamin;
        document.getElementById('form-tpl-pesan').value = dataTpl.pesan_utama || '';
        document.getElementById('form-tpl-kutipan').value = dataTpl.pesan_kutipan || '';
        document.getElementById('form-tpl-bg').value = dataTpl.bg_url || '';
        
        // Ubah Judul & Tombol Form
        document.getElementById('title-form-template').innerHTML = `<i class="fas fa-edit text-blue-500"></i> Edit Template`;
        document.getElementById('area-form-template').classList.add('border-blue-300', 'bg-blue-50/20');
        const btnSave = document.getElementById('btn-save-tpl');
        btnSave.className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm shadow-md flex items-center gap-2';
        btnSave.innerHTML = '<i class="fas fa-check"></i> <span>Perbarui Template</span>';
        
        // Munculkan tombol Batal
        document.getElementById('btn-batal-edit-tpl').classList.remove('hidden');
    }
}

// FUNGSI BARU: Kembalikan form ke mode Tambah Baru
function resetFormTemplate() {
    document.getElementById('form-tpl-id').value = '';
    document.getElementById('form-tpl-nama').value = '';
    document.getElementById('form-tpl-pesan').value = '';
    document.getElementById('form-tpl-kutipan').value = '';
    document.getElementById('form-tpl-bg').value = '';
    document.getElementById('form-tpl-jk').value = 'L';
    
    // Kembalikan Judul & Tombol
    document.getElementById('title-form-template').innerHTML = `<i class="fas fa-plus-circle text-rose-500"></i> Buat Template Baru`;
    document.getElementById('area-form-template').classList.remove('border-blue-300', 'bg-blue-50/20');
    const btnSave = document.getElementById('btn-save-tpl');
    btnSave.className = 'bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm shadow-md flex items-center gap-2';
    btnSave.innerHTML = '<i class="fas fa-save"></i> <span>Simpan ke Bank Template</span>';
    
    // Sembunyikan tombol Batal
    document.getElementById('btn-batal-edit-tpl').classList.add('hidden');
}

async function simpanTemplateBaru() {
    const idTpl = document.getElementById('form-tpl-id').value; // Jika ada, berarti mode Update
    const nama = document.getElementById('form-tpl-nama').value.trim();
    const jk = document.getElementById('form-tpl-jk').value;
    const pesan = document.getElementById('form-tpl-pesan').value.trim();
    const kutipan = document.getElementById('form-tpl-kutipan').value.trim();
    const bgUrl = document.getElementById('form-tpl-bg').value.trim();
    const btn = document.getElementById('btn-save-tpl');

    if (!nama || !pesan || !bgUrl) {
        return showToast("Nama, Pesan, dan URL Gambar wajib diisi!", true);
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    try {
        const payload = {
            nama_template: nama,
            jenis_kelamin: jk,
            pesan_utama: pesan,
            pesan_kutipan: kutipan,
            bg_url: bgUrl
        };

        if (idTpl) {
            // MODE UPDATE
            const { error } = await db.from('tabel_template_ultah').update(payload).eq('id', idTpl);
            if (error) throw error;
            showToast("Template berhasil diperbarui!");
        } else {
            // MODE INSERT BARU
            const { error } = await db.from('tabel_template_ultah').insert([payload]);
            if (error) throw error;
            showToast("Template berhasil ditambahkan!");
        }
        
        resetFormTemplate();
        loadDaftarTemplate(true);
    } catch(err) {
        showToast("Gagal menyimpan template. (Periksa Koneksi/RLS)", true);
        console.error(err);
    } finally {
        // Karena kita memanggil resetFormTemplate() jika berhasil, tombol sudah dikembalikan.
        // Tapi kita pastikan disabled false di sini jika error.
        btn.disabled = false;
        if(document.getElementById('form-tpl-id').value === '') {
            btn.innerHTML = '<i class="fas fa-save"></i> <span>Simpan ke Bank Template</span>';
        } else {
            btn.innerHTML = '<i class="fas fa-check"></i> <span>Perbarui Template</span>';
        }
    }
}

async function hapusTemplate(id) {
    if(!confirm("Yakin ingin menghapus template ini?\nPeringatan: Jika template sedang digunakan, penghapusan mungkin digagalkan oleh database.")) return;
    try {
        // Modifikasi pesan error agar lebih jelas jika gagal karena dipakai
        const { error } = await db.from('tabel_template_ultah').delete().eq('id', id);
        if (error) throw error;
        
        showToast("Template berhasil dihapus!");
        loadDaftarTemplate(true);
    } catch(err) { 
        console.error("Error Delete:", err); 
        if (err.message && err.message.includes('foreign key constraint')) {
            showToast("Gagal! Template sedang dipakai/aktif. Ubah template aktif terlebih dahulu.", true);
        } else {
            showToast("Gagal menghapus template. Akses ditolak atau terjadi kesalahan jaringan.", true);
        }
    }
}

async function uploadGambarTemplate(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    const statusEl = document.getElementById('status-upload-tpl');
    const urlInput = document.getElementById('form-tpl-bg');
    
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengunggah ke Cloud...';
    statusEl.className = 'text-[10px] text-teal-600 mt-1 font-bold';

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `template_ultah_${Date.now()}.${fileExt}`;
        
        // Memanfaatkan fungsi uploadFileToSupabase yang sudah ada di config.js
        const publicUrl = await uploadFileToSupabase(file, 'aset_aplikasi', fileName); 
        
        urlInput.value = publicUrl;
        
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Gambar berhasil diunggah!';
        statusEl.className = 'text-[10px] text-green-600 mt-1 font-bold';
    } catch (error) {
        statusEl.innerHTML = `<i class="fas fa-times-circle"></i> Gagal unggah. Cek koneksi atau izin RLS Supabase.`;
        statusEl.className = 'text-[10px] text-red-500 mt-1 font-bold';
        console.error("Gagal Upload Gambar Template:", error);
    }
}

async function simpanTemplateAktif(templateId, gender) {
    // Fungsi ini dipicu otomatis saat dropdown diubah
    const kolom = gender === 'L' ? 'template_l' : 'template_p';
    
    // Perbarui UI di tempat lain agar sinkron
    if (gender === 'L') {
        const dropCard = document.getElementById('select-template-l');
        const dropModal = document.getElementById('aktif-template-l');
        if(dropCard && dropCard.value !== templateId) dropCard.value = templateId;
        if(dropModal && dropModal.value !== templateId) dropModal.value = templateId;
        if (cachedPengaturan) cachedPengaturan.template_l = templateId;
    } else {
        const dropCard = document.getElementById('select-template-p');
        const dropModal = document.getElementById('aktif-template-p');
        if(dropCard && dropCard.value !== templateId) dropCard.value = templateId;
        if(dropModal && dropModal.value !== templateId) dropModal.value = templateId;
        if (cachedPengaturan) cachedPengaturan.template_p = templateId;
    }
    
    // Simpan langsung ke database (Tabel Pengaturan)
    try {
        const payload = { id: 1 };
        payload[kolom] = templateId;
        await db.from('tabel_pengaturan').upsert(payload);
        showToast(`Template ${gender === 'L' ? 'Laki-Laki' : 'Perempuan'} Aktif diperbarui!`);
    } catch(err) {
        console.error(err);
        showToast("Gagal mengatur template aktif (Pastikan kolom template_l/p ada di Supabase)", true);
    }
}

function previewTemplate(gender) {
    const idTemplate = gender === 'L' 
        ? document.getElementById('select-template-l').value 
        : document.getElementById('select-template-p').value;
        
    if (!idTemplate) return showToast("Pilih template terlebih dahulu!", true);
    
    const arrayTpl = gender === 'L' ? daftarTemplateL : daftarTemplateP;
    const dataTpl = arrayTpl.find(t => String(t.id) === String(idTemplate));
    
    if (dataTpl) {
        // Simulasi User Dummy untuk Preview
        const userDummy = {
            nama: "Fulan bin Fulan (Preview)",
            jk: gender,
            tgl_lahir: new Date().toISOString().slice(0, 10) // Hari ini
        };
        
        // Setel nilai sementara ke elemen
        document.getElementById('ultah-nama').innerText = "Contoh Nama Siswa";
        document.getElementById('ultah-pesan').innerHTML = dataTpl.pesan_utama || '';
        
        if (dataTpl.pesan_kutipan) {
            document.getElementById('ultah-kutipan').innerHTML = `"${dataTpl.pesan_kutipan}"`;
            document.getElementById('ultah-kutipan').style.display = 'block';
        } else {
            document.getElementById('ultah-kutipan').style.display = 'none';
        }
        
        document.getElementById('ultah-gambar').src = dataTpl.bg_url;
        
        // Tampilkan Modal
        const modal = document.getElementById('modal-ultah');
        const content = document.getElementById('modal-ultah-content');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 50);
    }
}

// ==========================================
// 9. DUKUNGAN TEMA & DARK MODE (CHROME ROBUST)
// ==========================================

window.toggleDarkModeGuruQuick = function() {
    // Deteksi status aktif murni dari class root <html>
    const isDark = document.documentElement.classList.contains('dark') || 
                   document.documentElement.classList.contains('dark-mode-simulated');
    const newState = !isDark;

    // Eksekusi fungsi toggle utama
    if (typeof handleToggleDarkMode === 'function') {
        handleToggleDarkMode(newState);
    } else {
        // Fallback langsung jika belum terikat
        const root = document.documentElement;
        const body = document.body;
        const container = document.getElementById('app-container');
        if (newState) {
            root.classList.add('dark', 'dark-mode-simulated');
            body.classList.add('dark', 'dark-mode-simulated');
            if (container) container.classList.add('dark-mode-simulated');
            localStorage.setItem('pref_dark_mode', 'true');
        } else {
            root.classList.remove('dark', 'dark-mode-simulated');
            body.classList.remove('dark-mode-simulated');
            if (container) container.classList.remove('dark-mode-simulated');
            localStorage.setItem('pref_dark_mode', 'false');
        }
    }

    syncDarkModeGuruUI(newState);
};

function syncDarkModeGuruUI(isDark) {
    const quickIcon = document.getElementById('icon-dark-guru-quick');
    const toggleGuru = document.getElementById('toggle-dark-mode-guru');
    if (quickIcon) {
        if (isDark) {
            quickIcon.className = 'fas fa-sun text-xs pointer-events-none';
            quickIcon.parentElement.className = 'w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30 shadow-sm active:scale-95 transition-all';
        } else {
            quickIcon.className = 'fas fa-moon text-xs pointer-events-none';
            quickIcon.parentElement.className = 'w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/70 shadow-sm active:scale-95 transition-all';
        }
    }
    if (toggleGuru) {
        toggleGuru.checked = isDark;
    }
}

// Sinkronkan ikon saat dashboard guru pertama kali dimuat
const originalSetupGuruDashboard = window.setupGuruDashboard;
if (typeof originalSetupGuruDashboard === 'function') {
    window.setupGuruDashboard = function(user) {
        originalSetupGuruDashboard(user);
        const isDark = localStorage.getItem('pref_dark_mode') === 'true';
        syncDarkModeGuruUI(isDark);
    };
}


// ==========================================
// 10. NAVIGASI TAB PENGATURAN & WHITELIST DEVICE
// ==========================================

function switchTabPengaturan(tabId) {
    // 1. Sembunyikan semua konten tab
    ['waktu', 'ui', 'fitur', 'keamanan'].forEach(id => {
        const content = document.getElementById(`tab-content-${id}`);
        const btn = document.getElementById(`tab-btn-${id}`);
        
        if (content) content.classList.add('hidden');
        
        // Kembalikan warna tombol ke abu-abu (tidak aktif)
        if (btn) {
            btn.classList.remove('bg-teal-600', 'text-white');
            btn.classList.add('bg-white', 'text-gray-500');
        }
    });

    // 2. Munculkan konten tab yang dipilih
    const activeContent = document.getElementById(`tab-content-${tabId}`);
    const activeBtn = document.getElementById(`tab-btn-${tabId}`);
    
    if (activeContent) activeContent.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.remove('bg-white', 'text-gray-500');
        activeBtn.classList.add('bg-teal-600', 'text-white');
    }

    // 3. Pemicu Khusus: Jika tab Keamanan dibuka, muat data Whitelist otomatis
    if (tabId === 'keamanan') {
        muatDataWhitelist();
    }
}

// Variabel penampung data untuk fitur pencarian
let rawWhitelistData = [];

async function muatDataWhitelist() {
    const tbody = document.getElementById('tabel-data-whitelist');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-gray-400"><i class="fas fa-spinner fa-spin mr-1"></i> Menarik data dari Cloud...</td></tr>';

    try {
        // Ambil data siswa yang relevan (hanya NIS, Nama, Kelas, dan status Bypass)
        const { data, error } = await db.from('tabel_siswa')
            .select('nis, nama, kelas, bypass_device')
            .order('kelas', { ascending: true })
            .order('nama', { ascending: true });

        if (error) throw error;

        rawWhitelistData = data || [];

        // Buat daftar dropdown Kelas secara otomatis
        const filterKelasEl = document.getElementById('filter-whitelist-kelas');
        if (filterKelasEl) {
            const currentSelected = filterKelasEl.value;
            const availableClasses = [...new Set(rawWhitelistData.map(s => s.kelas ? s.kelas.trim() : null).filter(Boolean))].sort();
            filterKelasEl.innerHTML = '<option value="ALL">Semua Kelas</option>';
            availableClasses.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = k;
                if (k === currentSelected) opt.selected = true;
                filterKelasEl.appendChild(opt);
            });
        }

        applyFilterWhitelist();

    } catch (err) {
        console.error("Gagal memuat data whitelist:", err);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-red-500 font-medium"><i class="fas fa-exclamation-triangle"></i> Gagal memuat data (${err.message || 'Error RLS'})</td></tr>`;
    }
}

function applyFilterWhitelist() {
    const tbody = document.getElementById('tabel-data-whitelist');
    if (!rawWhitelistData || rawWhitelistData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-gray-400">Belum ada data siswa di database.</td></tr>';
        return;
    }

    const keyword = (document.getElementById('filter-whitelist-keyword').value || '').trim().toLowerCase();
    const filterKelas = document.getElementById('filter-whitelist-kelas').value || 'ALL';

    let filtered = rawWhitelistData.filter(s => {
        const matchKeyword = !keyword || 
            (s.nama && s.nama.toLowerCase().includes(keyword)) ||
            (s.nis && String(s.nis).toLowerCase().includes(keyword));
            
        const matchKelas = filterKelas === 'ALL' || (s.kelas && s.kelas.trim() === filterKelas);
        
        return matchKeyword && matchKelas;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-gray-400">Tidak ada siswa yang cocok dengan filter pencarian.</td></tr>';
        return;
    }

    let htmlRows = '';
    filtered.forEach(s => {
        const isBypass = s.bypass_device === true; // Pastikan boolean
        const toggleId = `toggle-bypass-${s.nis}`;
        
        htmlRows += `
            <tr class="hover:bg-slate-50 border-b border-gray-100 transition-colors">
                <td class="px-4 py-3 font-mono text-gray-600 text-xs">${s.nis}</td>
                <td class="px-4 py-3 font-bold text-gray-800 text-xs">${s.nama}</td>
                <td class="px-4 py-3 text-xs text-gray-600 font-medium">${s.kelas || '-'}</td>
                <td class="px-4 py-3 text-center">
                    <label class="relative inline-flex items-center cursor-pointer" title="${isBypass ? 'Matikan Bypass' : 'Aktifkan Bypass'}">
                        <input type="checkbox" id="${toggleId}" onchange="toggleBypassDevice('${s.nis}', this.checked)" class="sr-only peer" ${isBypass ? 'checked' : ''}>
                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500 shadow-inner"></div>
                    </label>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = htmlRows;
}

async function toggleBypassDevice(nis, isBypassAktif) {
    try {
        // 1. Eksekusi pembaruan (UPDATE) langsung ke Cloud Supabase
        const { error } = await db.from('tabel_siswa')
            .update({ bypass_device: isBypassAktif })
            .eq('nis', nis);
            
        if (error) throw error;

        // 2. Perbarui data lokal (array di memori) agar jika admin mencari nama lain, 
        // status sakelar yang baru diklik tidak ter-reset secara visual.
        const studentIndex = rawWhitelistData.findIndex(s => s.nis === nis);
        if(studentIndex !== -1) {
            rawWhitelistData[studentIndex].bypass_device = isBypassAktif;
        }

        const pesanStatus = isBypassAktif 
            ? `Bypass Perangkat DIAKTIFKAN untuk NIS ${nis}` 
            : `Bypass Perangkat DIMATIKAN untuk NIS ${nis}`;
            
        showToast(pesanStatus);
        
    } catch (err) {
        console.error("Gagal update status bypass:", err);
        showToast("Gagal memperbarui status. Periksa koneksi/RLS tabel_siswa.", true);
        
        // Kembalikan posisi sakelar jika terjadi error di jaringan/database
        const toggle = document.getElementById(`toggle-bypass-${nis}`);
        if(toggle) toggle.checked = !isBypassAktif;
    }
}
