// ==========================================
// 1. KONEKSI SUPABASE & GLOBAL STATE
// ==========================================
const SUPABASE_URL = "https://oxjthzhxekopwjlrcaqv.supabase.co";
const SUPABASE_KEY = "sb_publishable_BrxXxg5c3TKVWWOX98deWw_zVUkpVIn";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let cachedPengaturan = null;

// ==========================================
// 2. FUNGSI KEAMANAN & SESI PERANGKAT
// ==========================================
function getDeviceID() {
    let deviceId = localStorage.getItem('app_device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('app_device_id', deviceId);
    }
    return deviceId;
}

// ==========================================
// 3. PEMBERITAHUAN TOAST & NAVIGASI LAYAR (CSR)
// ==========================================
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast-modal');
    document.getElementById('toast-msg').innerText = msg;
    const icon = document.getElementById('toast-icon');
    
    if (isError) {
        toast.classList.replace('bg-slate-800', 'bg-red-600');
        toast.classList.replace('bg-teal-600', 'bg-red-600');
        icon.className = 'fas fa-times-circle';
    } else {
        toast.classList.replace('bg-slate-800', 'bg-teal-600');
        toast.classList.replace('bg-red-600', 'bg-teal-600');
        icon.className = 'fas fa-check-circle';
    }

    toast.classList.remove('hidden');
    toast.classList.add('flex');
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('flex');
    }, 4500);
}

// FUNGSI LAZY LOADING HTML
async function loadViewHTML(viewId, filePath) {
    const container = document.getElementById(viewId);
    if (container && container.innerHTML.trim() === '') {
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();
            container.innerHTML = html;
        } catch (err) {
            console.error(`Gagal memuat ${filePath}:`, err);
            showToast(`Gagal memuat antarmuka. Pastikan jalan di Local Server.`, true);
        }
    }
}

// FUNGSI TRANSISI LAYAR
async function showScreen(id) {
    const viewMap = {
        'screen-login': 'views/login.html',
        'screen-mobile': 'views/siswa.html',
        'screen-scanner': 'views/scanner.html',
        'screen-desktop': 'views/guru.html'
    };

    // 1. Tarik HTML jika belum ada
    if (viewMap[id]) {
        await loadViewHTML(id, viewMap[id]);
    }

    // 2. Sembunyikan semua layar
    ['screen-splash', 'screen-login', 'screen-mobile', 'screen-scanner', 'screen-desktop'].forEach(s => {
        const el = document.getElementById(s);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
    });

    // 3. Tampilkan layar target
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
        if (id !== 'screen-splash') target.classList.add('flex');
    }

    // 4. JALANKAN INISIALISASI SETELAH RENDER HTML
    if (id === 'screen-login') {
        updateLoginUI();
        cekKoneksiDB();
    }
}

// FUNGSI UPDATE UI LOGIN (Dipanggil SETELAH login.html ditarik)
function updateLoginUI() {
    if (cachedPengaturan && cachedPengaturan.logo_sekolah_url) {
        const loginLogo = document.getElementById('login-logo-img');
        const loginLogoIcon = document.getElementById('login-logo-icon');
        if (loginLogo) {
            loginLogo.src = cachedPengaturan.logo_sekolah_url;
            loginLogo.style.display = 'block';
            loginLogo.classList.remove('hidden');
        }
        if (loginLogoIcon) {
            loginLogoIcon.style.display = 'none';
            loginLogoIcon.classList.add('hidden');
        }
    }
}

// FUNGSI CEK KONEKSI (Dipanggil SETELAH login.html ditarik)
async function cekKoneksiDB() {
    const ind = document.getElementById('db-status-indicator');
    if (!ind) return;
    try {
        const { error } = await db.from('tabel_siswa').select('nis').limit(1);
        if (error) throw error;
        ind.innerHTML = '<i class="fas fa-check-circle"></i> Terhubung ke Cloud';
        ind.className = 'text-green-500 text-[11px] font-semibold text-center';
    } catch (err) {
        console.error(err);
        ind.innerHTML = '<i class="fas fa-times-circle"></i> Gagal terhubung (Cek Koneksi/RLS)';
        ind.className = 'text-red-500 text-[11px] font-semibold text-center';
    }
}

// ==========================================
// 4. HELPER JARINGAN & LOKASI
// ==========================================
async function getServerTime() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'HEAD',
            headers: { 'apikey': SUPABASE_KEY }
        });
        const serverDateHeader = response.headers.get('date');
        if (serverDateHeader) return new Date(serverDateHeader);
    } catch (e) {
        console.warn("Gagal sinkron waktu server, menggunakan waktu lokal:", e);
    }
    return new Date();
}

function hitungJarakGPS(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

async function uploadFileToSupabase(file, bucketName, filePath) {
    if (!file) throw new Error("File tidak ditemukan");
    const { data, error } = await db.storage.from(bucketName).upload(filePath, file, {
        cacheControl: '3600', upsert: true
    });
    if (error) throw error;
    const { data: { publicUrl } } = db.storage.from(bucketName).getPublicUrl(filePath);
    return publicUrl;
}

// ==========================================
// 5. INISIALISASI AWAL APLIKASI
// ==========================================
window.onload = async () => {
    // 1. Tarik kustomisasi Tampilan Splash (Karena Splash ada di index.html)
    try {
        const { data: peng } = await db.from('tabel_pengaturan').select('*').limit(1).single();
        if (peng) {
            cachedPengaturan = peng;
            const splashWrap = document.querySelector('#screen-splash .relative');
            if (peng.bg_url && splashWrap) {
                splashWrap.style.backgroundImage = `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.95)), url('${peng.bg_url}')`;
                splashWrap.style.backgroundSize = 'cover';
                splashWrap.style.backgroundPosition = 'center';
            }
            if (peng.logo_url) {
                const defIcon = document.getElementById('default-splash-icon');
                const custLogo = document.getElementById('custom-splash-logo');
                if (defIcon) defIcon.classList.add('hidden');
                if (custLogo) {
                    custLogo.src = peng.logo_url;
                    custLogo.style.display = 'block';
                    custLogo.classList.remove('hidden');
                }
            }
        }
    } catch(e) { console.log("Gagal memuat kustomisasi landing page", e); }

    // 2. Cek Auto-Login
    const savedSession = localStorage.getItem('app_session');
    if (savedSession) {
        try {
            const userData = JSON.parse(savedSession);
            currentUser = userData;
            
            // JIKA AUTO LOGIN, KITA HARUS MEMAINKAN AWAIT AGAR HTML DITARIK DULU
            if (userData.role === 'siswa') {
                await showScreen('screen-mobile');
                if (typeof setupSiswaDashboard === 'function') setupSiswaDashboard(userData);
            } else {
                await showScreen('screen-desktop');
                if (typeof setupGuruDashboard === 'function') setupGuruDashboard(userData);
            }
            
            setTimeout(() => { if(typeof cekUlangTahun === 'function') cekUlangTahun(userData); }, 1500);
        } catch (e) {
            localStorage.removeItem('app_session');
        }
    }
};