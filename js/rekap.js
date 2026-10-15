// ==========================================
// 1. STATE & PERHITUNGAN REKAPITULASI
// ==========================================

let currentRekapMode = 'log'; // 'log' atau 'akumulasi'
let localRekapCache = [];
let localAkumulasiCache = [];
let lastRekapQueryKey = '';

function switchRekapViewMode(mode) {
    currentRekapMode = mode;
    const btnLog = document.getElementById('btn-tab-mode-log');
    const btnAkum = document.getElementById('btn-tab-mode-akumulasi');
    const viewLog = document.getElementById('view-rekap-log');
    const viewAkum = document.getElementById('view-rekap-akumulasi');

    if (mode === 'log') {
        btnLog.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-sm transition-all flex items-center gap-2';
        btnAkum.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all flex items-center gap-2';
        viewLog.classList.remove('hidden');
        viewAkum.classList.add('hidden');
    } else {
        btnAkum.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-sm transition-all flex items-center gap-2';
        btnLog.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all flex items-center gap-2';
        viewAkum.classList.remove('hidden');
        viewLog.classList.add('hidden');
    }

    loadDataRekap(false);
}

function handlePeriodeChange() {
    const val = document.getElementById('filter-periode-rekap').value;
    const wStart = document.getElementById('wrapper-tgl-mulai');
    const wEnd = document.getElementById('wrapper-tgl-selesai');

    if (val === 'kustom') {
        wStart.classList.remove('hidden');
        wEnd.classList.remove('hidden');
        
        if (!document.getElementById('filter-rekap-start').value) {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('filter-rekap-start').value = today;
            document.getElementById('filter-rekap-end').value = today;
        }
    } else {
        wStart.classList.add('hidden');
        wEnd.classList.add('hidden');
    }

    loadDataRekap();
}

function getCalculatedDateRange() {
    const periode = document.getElementById('filter-periode-rekap')?.value || 'bulan_ini';
    const now = new Date();
    const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    let startDate, endDate;

    if (periode === 'hari_ini') {
        startDate = formatDate(now);
        endDate = formatDate(now);
    } else if (periode === 'minggu_ini') {
        const currentDay = now.getDay(); 
        const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diffToMonday));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        startDate = formatDate(monday);
        endDate = formatDate(sunday);
    } else if (periode === 'bulan_ini') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = formatDate(firstDay);
        endDate = formatDate(lastDay);
    } else if (periode === 'kustom') {
        startDate = document.getElementById('filter-rekap-start')?.value || formatDate(now);
        endDate = document.getElementById('filter-rekap-end')?.value || formatDate(now);
    }

    return { startDate, endDate };
}

function hitungHariEfektif(startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const actualEnd = end > today ? today : end;
    if (start > actualEnd) return 0;

    let totalHari = 0;
    let cur = new Date(start);

    while (cur <= actualEnd) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) {
            totalHari++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return totalHari;
}

// ==========================================
// 2. QUERY & BUFFER RENDERING REKAP
// ==========================================

async function loadDataRekap(forceReload = false) {
    const filterEl = document.getElementById('filter-kelas-rekap');
    const selectedClass = filterEl ? filterEl.value : 'ALL';
    const { startDate, endDate } = getCalculatedDateRange();

    const authClasses = getGuruAuthClasses(currentUser);
    if (currentUser.role !== 'admin' && authClasses.length === 0) {
        showToast('Anda belum ditugaskan untuk memantau kelas manapun.', true);
        return;
    }

    if (filterEl && filterEl.options.length <= 1) {
        let classOptions = [];
        if (authClasses[0] === 'ALL') {
            const { data: clsData } = await db.from('tabel_siswa').select('kelas');
            if (clsData) {
                classOptions = [...new Set(clsData.map(item => item.kelas ? item.kelas.trim().toUpperCase() : null).filter(Boolean))].sort();
            }
        } else {
            classOptions = [...authClasses].sort();
        }

        filterEl.innerHTML = '<option value="ALL">Semua Kelas</option>';
        classOptions.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            if (k === selectedClass) opt.selected = true;
            filterEl.appendChild(opt);
        });
    }

    const currentQueryKey = `${selectedClass}_${startDate}_${endDate}`;
    const needFetch = forceReload || (currentQueryKey !== lastRekapQueryKey);

    if (currentRekapMode === 'log') {
        const tbodyLog = document.getElementById('tabel-rekap-presensi');

        if (needFetch || !localRekapCache) {
            tbodyLog.innerHTML = '<tr><td colspan="6" class="text-center p-8"><i class="fas fa-spinner fa-spin text-teal-600 text-2xl"></i><p class="text-sm mt-2 text-gray-500">Menarik log presensi...</p></td></tr>';

            let query = db.from('tabel_presensi')
                .select('*')
                .gte('tanggal', startDate)
                .lte('tanggal', endDate)
                .order('tanggal', { ascending: false })
                .order('jam_masuk', { ascending: false });

            if (selectedClass !== 'ALL') {
                query = query.eq('kelas', selectedClass);
            } else if (authClasses[0] !== 'ALL') {
                query = query.in('kelas', authClasses);
            }

            const { data, error } = await query;
            if (error || !data || data.length === 0) {
                tbodyLog.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-gray-400">Tidak ada presensi pada rentang ${startDate} s/d ${endDate}.</td></tr>`;
                localRekapCache = [];
                lastRekapQueryKey = currentQueryKey;
                return;
            }

            localRekapCache = data;
            lastRekapQueryKey = currentQueryKey;
        }

        if (localRekapCache.length === 0) {
            tbodyLog.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-gray-400">Tidak ada presensi pada rentang ${startDate} s/d ${endDate}.</td></tr>`;
            return;
        }

        let htmlLogRows = '';
        localRekapCache.forEach(log => {
            const fotoMasukHtml = log.foto_masuk ? `<a href="${log.foto_masuk}" target="_blank" class="text-blue-500 ml-1 hover:text-blue-700" title="Foto Masuk"><i class="fas fa-camera"></i></a>` : '';
            const fotoPulangHtml = log.foto_pulang ? `<a href="${log.foto_pulang}" target="_blank" class="text-orange-500 ml-1 hover:text-orange-700" title="Foto Pulang"><i class="fas fa-camera"></i></a>` : '';

            htmlLogRows += `
                <tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                    <td class="px-6 py-4 text-xs font-semibold text-gray-600">${log.tanggal}</td>
                    <td class="px-6 py-4 font-mono text-xs text-gray-500">${log.nis || '-'}</td>
                    <td class="px-6 py-4 font-bold text-gray-800 text-sm">${log.nama}</td>
                    <td class="px-6 py-4 font-bold text-teal-700 text-xs">${log.kelas || '-'}</td>
                    <td class="px-6 py-4 font-mono text-teal-600 font-bold">${log.jam_masuk || '-'} ${fotoMasukHtml}</td>
                    <td class="px-6 py-4 font-mono text-orange-500 font-bold">${log.jam_pulang || '-'} ${fotoPulangHtml}</td>
                </tr>
            `;
        });
        tbodyLog.innerHTML = htmlLogRows;

    } else {
        const tbodyAkum = document.getElementById('tabel-rekap-akumulasi');

        if (needFetch || !localAkumulasiCache || localAkumulasiCache.length === 0) {
            tbodyAkum.innerHTML = '<tr><td colspan="9" class="text-center p-8"><i class="fas fa-spinner fa-spin text-teal-600 text-2xl"></i><p class="text-sm mt-2 text-gray-500">Mengirim & menghitung akumulasi kehadiran siswa...</p></td></tr>';

            let querySiswa = db.from('tabel_siswa').select('nis, nama, kelas').order('nama', { ascending: true });
            if (selectedClass !== 'ALL') {
                querySiswa = querySiswa.eq('kelas', selectedClass);
            } else if (authClasses[0] !== 'ALL') {
                querySiswa = querySiswa.in('kelas', authClasses);
            }
            const { data: siswaList } = await querySiswa;

            if (!siswaList || siswaList.length === 0) {
                tbodyAkum.innerHTML = '<tr><td colspan="9" class="text-center p-8 text-gray-400">Tidak ada siswa ditemukan pada kelas ini.</td></tr>';
                localAkumulasiCache = [];
                lastRekapQueryKey = currentQueryKey;
                return;
            }

            let queryHadir = db.from('tabel_presensi')
                .select('nis, tanggal')
                .gte('tanggal', startDate)
                .lte('tanggal', endDate);
            if (selectedClass !== 'ALL') queryHadir = queryHadir.eq('kelas', selectedClass);
            const { data: hadirList } = await queryHadir;

            let queryIzin = db.from('tabel_izin')
                .select('nis, jenis, tanggal')
                .eq('status', 'Disetujui')
                .gte('tanggal', startDate)
                .lte('tanggal', endDate);
            const { data: izinList } = await queryIzin;

            const hariEfektif = hitungHariEfektif(startDate, endDate);

            localAkumulasiCache = siswaList.map(s => {
                const totalHadir = hadirList ? hadirList.filter(h => String(h.nis) === String(s.nis)).length : 0;
                const totalSakit = izinList ? izinList.filter(i => String(i.nis) === String(s.nis) && i.jenis === 'Sakit').length : 0;
                const totalIzin = izinList ? izinList.filter(i => String(i.nis) === String(s.nis) && i.jenis === 'Izin').length : 0;
                
                const totalKeterangan = totalHadir + totalSakit + totalIzin;
                const totalAlpa = Math.max(0, hariEfektif - totalKeterangan);
                const persen = hariEfektif > 0 ? Math.round((totalHadir / hariEfektif) * 100) : 0;

                return {
                    nis: s.nis,
                    nama: s.nama,
                    kelas: s.kelas,
                    hadir: totalHadir,
                    sakit: totalSakit,
                    izin: totalIzin,
                    alpa: totalAlpa,
                    efektif: hariEfektif,
                    persentase: persen
                };
            });

            lastRekapQueryKey = currentQueryKey;
        }

        if (localAkumulasiCache.length === 0) {
            tbodyAkum.innerHTML = '<tr><td colspan="9" class="text-center p-8 text-gray-400">Tidak ada data rekapitulasi.</td></tr>';
            return;
        }

        let htmlAkumRows = '';
        localAkumulasiCache.forEach(item => {
            const badgePersenColor = item.persentase >= 85 
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                : (item.persentase >= 75 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200');

            htmlAkumRows += `
                <tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                    <td class="px-6 py-4 font-mono text-gray-600 text-xs">${item.nis}</td>
                    <td class="px-6 py-4 font-bold text-gray-800 text-sm">${item.nama}</td>
                    <td class="px-6 py-4 font-bold text-teal-700 text-xs">${item.kelas || '-'}</td>
                    <td class="px-4 py-4 text-center font-bold text-green-700 bg-green-50/20">${item.hadir}</td>
                    <td class="px-4 py-4 text-center font-bold text-amber-700 bg-amber-50/20">${item.sakit}</td>
                    <td class="px-4 py-4 text-center font-bold text-blue-700 bg-blue-50/20">${item.izin}</td>
                    <td class="px-4 py-4 text-center font-bold text-rose-700 bg-rose-50/20">${item.alpa}</td>
                    <td class="px-4 py-4 text-center font-semibold text-gray-500">${item.efektif} Hari</td>
                    <td class="px-6 py-4 text-center">
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold border ${badgePersenColor}">
                            ${item.persentase}%
                        </span>
                    </td>
                </tr>
            `;
        });
        tbodyAkum.innerHTML = htmlAkumRows;
    }
}

// ==========================================
// 3. EKSPOR EXCEL & PDF FORMAL
// ==========================================

window.exportRekapHandler = function(format) {
    const filterEl = document.getElementById('filter-kelas-rekap');
    const namaKelasFilter = (filterEl && filterEl.value !== 'ALL') ? filterEl.value : 'Semua Kelas';
    const { startDate, endDate } = getCalculatedDateRange();
    const labelPeriode = `${startDate} s/d ${endDate}`;

    if (currentRekapMode === 'log') {
        if (!localRekapCache || localRekapCache.length === 0) {
            return showToast('Data log presensi kosong untuk diekspor!', true);
        }

        const dataLog = localRekapCache.map((log, i) => ({
            'No': i + 1,
            'Tanggal': log.tanggal || '-',
            'NIS': log.nis || '-',
            'Nama': log.nama || '-',
            'Kelas': log.kelas || '-',
            'Masuk': log.jam_masuk || '-',
            'Pulang': log.jam_pulang || '-'
        }));

        if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(dataLog);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Log_Presensi");
            XLSX.writeFile(wb, `Log_Presensi_${namaKelasFilter}_${Date.now()}.xlsx`);
        } else {
            generateFormalPDF("LOG RIWAYAT PRESENSI HARIAN", dataLog, [
                { header: 'No', dataKey: 'No' },
                { header: 'Tanggal', dataKey: 'Tanggal' },
                { header: 'NIS', dataKey: 'NIS' },
                { header: 'Nama Siswa', dataKey: 'Nama' },
                { header: 'Kelas', dataKey: 'Kelas' },
                { header: 'Masuk', dataKey: 'Masuk' },
                { header: 'Pulang', dataKey: 'Pulang' }
            ], namaKelasFilter, labelPeriode);
        }

    } else {
        if (!localAkumulasiCache || localAkumulasiCache.length === 0) {
            return showToast('Data akumulasi presensi kosong untuk diekspor!', true);
        }

        const dataAkumulasi = localAkumulasiCache.map((a, i) => ({
            'No': i + 1,
            'NIS': a.nis || '-',
            'Nama': a.nama || '-',
            'Kelas': a.kelas || '-',
            'Hadir': a.hadir,
            'Sakit': a.sakit,
            'Izin': a.izin,
            'Alpa': a.alpa,
            'Hari Efektif': a.efektif,
            'Kehadiran (%)': `${a.persentase}%`
        }));

        if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(dataAkumulasi);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Rekap_Akumulasi");
            XLSX.writeFile(wb, `Akumulasi_Kehadiran_${namaKelasFilter}_${Date.now()}.xlsx`);
        } else {
            generateFormalPDF("REKAPITULASI AKUMULASI KEHADIRAN SISWA", dataAkumulasi, [
                { header: 'No', dataKey: 'No' },
                { header: 'NIS', dataKey: 'NIS' },
                { header: 'Nama Siswa', dataKey: 'Nama' },
                { header: 'Kelas', dataKey: 'Kelas' },
                { header: 'H', dataKey: 'Hadir' },
                { header: 'S', dataKey: 'Sakit' },
                { header: 'I', dataKey: 'Izin' },
                { header: 'A', dataKey: 'Alpa' },
                { header: 'Efektif', dataKey: 'Hari Efektif' },
                { header: '%', dataKey: 'Kehadiran (%)' }
            ], namaKelasFilter, labelPeriode);
        }
    }
};

function generateFormalPDF(judulLaporan, dataRows, columnsDef, kelasFilter, periodeStr) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 15;
    const marginRight = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("PEMERINTAH DAERAH PROVINSI JAWA BARAT", pageWidth / 2, 16, { align: "center" });
    doc.text("DINAS PENDIDIKAN", pageWidth / 2, 21, { align: "center" });

    doc.setFontSize(14);
    doc.text("SMK NEGERI 1 TASIKMALAYA", pageWidth / 2, 27, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("KONSENTRASI KEAHLIAN: BROADCASTING & PERFILMAN", pageWidth / 2, 32, { align: "center" });
    doc.text("Jl. Mancogeh No. 26, Nagarasari, Kec. Cipedes, Kota Tasikmalaya, Jawa Barat 46132", pageWidth / 2, 36, { align: "center" });
    doc.text("Laman: smkn1tasikmalaya.sch.id | Surel: info@smkn1tasikmalaya.sch.id", pageWidth / 2, 40, { align: "center" });

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.8);
    doc.line(marginLeft, 43, pageWidth - marginRight, 43);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, 44.2, pageWidth - marginRight, 44.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(judulLaporan, pageWidth / 2, 52, { align: "center" });

    const waktuCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    doc.text(`Rombel / Kelas : ${kelasFilter}`, marginLeft, 59);
    doc.text(`Rentang Waktu  : ${periodeStr}`, marginLeft, 64);

    doc.text(`Tanggal Cetak  : ${waktuCetak}`, pageWidth - marginRight, 59, { align: "right" });
    doc.text(`Total Baris    : ${dataRows.length} Data`, pageWidth - marginRight, 64, { align: "right" });

    doc.autoTable({
        columns: columnsDef,
        body: dataRows,
        startY: 69,
        margin: { left: marginLeft, right: marginRight, bottom: 40 },
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2.2,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [15, 118, 110],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        didDrawPage: function() {
            const pageNumber = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Halaman ${pageNumber} | Dokumen Presensi Resmi SMKN 1 Tasikmalaya`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    const pageHeight = doc.internal.pageSize.getHeight();

    if (finalY + 35 > pageHeight) {
        doc.addPage();
        drawSignatureBlock(doc, 25, pageWidth, marginLeft, marginRight, waktuCetak);
    } else {
        drawSignatureBlock(doc, finalY, pageWidth, marginLeft, marginRight, waktuCetak);
    }

    doc.save(`${judulLaporan.replace(/ /g, '_')}_${kelasFilter}_${Date.now()}.pdf`);
}

function drawSignatureBlock(doc, startY, pageWidth, marginLeft, marginRight, tglCetak) {
    const colRight = pageWidth - marginRight - 15;
    const colLeft = marginLeft + 15;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);

    doc.text(`Tasikmalaya, ${tglCetak}`, colRight, startY, { align: "center" });
    doc.text("Wali Kelas / Guru Pembimbing,", colRight, startY + 5, { align: "center" });

    doc.text("Mengetahui,", colLeft, startY + 5, { align: "center" });
    doc.text("Ketua Program Keahlian,", colLeft, startY + 10, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.text("( .................................................... )", colLeft, startY + 30, { align: "center" });
    doc.text("( .................................................... )", colRight, startY + 30, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("NIP. .............................................", colLeft, startY + 34, { align: "center" });
    doc.text("NIP. .............................................", colRight, startY + 34, { align: "center" });
}