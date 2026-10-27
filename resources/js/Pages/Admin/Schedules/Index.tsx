import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    CalendarDaysIcon,
    ClockIcon,
    AcademicCapIcon,
    UserIcon,
    BookOpenIcon,
    XMarkIcon,
    PrinterIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface AcademicClass {
    id: number;
    name: string;
}

interface Teacher {
    id: number;
    name: string;
}

interface Schedule {
    id: number;
    class_id: number;
    teacher_id: number;
    subject: string;
    day: string;
    start_time: string;
    end_time: string;
    academic_class?: AcademicClass;
    teacher?: Teacher;
}

const DAY_OPTIONS = [
    { value: 'monday',    label: 'Senin' },
    { value: 'tuesday',   label: 'Selasa' },
    { value: 'wednesday', label: 'Rabu' },
    { value: 'thursday',  label: 'Kamis' },
    { value: 'friday',    label: 'Jumat' },
    { value: 'saturday',  label: 'Sabtu' },
    { value: 'sunday',    label: 'Minggu' },
];

const DAY_COLORS: Record<string, string> = {
    monday:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    tuesday:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    wednesday: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    thursday:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    friday:    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    saturday:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    sunday:    'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
};

function getDayLabel(day: string) {
    return DAY_OPTIONS.find(d => d.value === day)?.label ?? day;
}

function formatTime(time: string) {
    return time ? time.substring(0, 5) : '-';
}

export default function ScheduleIndex({
    auth,
    schedules,
    classes,
    teachers,
}: PageProps<{
    schedules: Schedule[];
    classes: AcademicClass[];
    teachers: Teacher[];
}>) {
    const [isModalOpen, setIsModalOpen]       = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [filterDay, setFilterDay]           = useState('');
    const [filterClass, setFilterClass]       = useState('');

    const { data, setData, post, put, reset, processing, errors } = useForm({
        class_id:   '',
        teacher_id: '',
        subject:    '',
        day:        '',
        start_time: '',
        end_time:   '',
    });

    const openAddModal = () => {
        reset();
        setEditingSchedule(null);
        setIsModalOpen(true);
    };

    const openEditModal = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setData({
            class_id:   String(schedule.class_id),
            teacher_id: String(schedule.teacher_id),
            subject:    schedule.subject,
            day:        schedule.day,
            start_time: formatTime(schedule.start_time),
            end_time:   formatTime(schedule.end_time),
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSchedule(null);
        reset();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSchedule) {
            put(route('admin.schedules.update', editingSchedule.id), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('admin.schedules.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Hapus jadwal pelajaran ini? Data absensi QR yang terkait juga akan terhapus.')) {
            router.delete(route('admin.schedules.destroy', id));
        }
    };

    // Filter
    const filtered = schedules.filter(s => {
        const matchDay   = filterDay   ? s.day === filterDay : true;
        const matchClass = filterClass ? String(s.class_id) === filterClass : true;
        return matchDay && matchClass;
    });

    // Group by day for calendar-like view
    const grouped = DAY_OPTIONS.map(day => ({
        ...day,
        items: filtered.filter(s => s.day === day.value),
    })).filter(g => g.items.length > 0 || !filterDay);

    const handleExportExcel = () => {
        if (filtered.length === 0) {
            alert('Tidak ada data jadwal untuk diekspor.');
            return;
        }

        const headers = ['No', 'Hari', 'Jam Mulai', 'Jam Selesai', 'Kelas', 'Mata Pelajaran', 'Guru Pengampu'];
        const rows = filtered.map((s, idx) => [
            idx + 1,
            getDayLabel(s.day),
            formatTime(s.start_time),
            formatTime(s.end_time),
            `"${(s.academic_class?.name || '').replace(/"/g, '""')}"`,
            `"${(s.subject || '').replace(/"/g, '""')}"`,
            `"${(s.teacher?.name || '').replace(/"/g, '""')}"`,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Jadwal_Pelajaran_Resmi_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Jadwal Pelajaran</h2>}>
            <Head title="Jadwal Pelajaran" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400">
                                Kelola jadwal pelajaran mingguan. Jadwal ini digunakan untuk fitur <strong>Absensi Barcode Siswa</strong>.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleExportExcel}
                                className="inline-flex items-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
                                title="Download spreadsheet CSV / Excel"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4 mr-1.5" />
                                Ekspor Excel
                            </button>
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
                                title="Cetak Jadwal atau Simpan PDF"
                            >
                                <PrinterIcon className="w-4 h-4 mr-1.5" />
                                Cetak / PDF
                            </button>
                            <button
                                onClick={openAddModal}
                                className="inline-flex items-center px-4 py-2 bg-primary border border-transparent rounded-lg font-semibold text-xs text-white uppercase tracking-widest hover:bg-primary-hover transition-all shadow-sm"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Tambah Jadwal
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg"><CalendarDaysIcon className="w-6 h-6 text-primary" /></div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{schedules.length}</p>
                                <p className="text-xs text-gray-500">Total Jadwal</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><AcademicCapIcon className="w-6 h-6 text-emerald-600" /></div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{[...new Set(schedules.map(s => s.class_id))].length}</p>
                                <p className="text-xs text-gray-500">Kelas Aktif</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><UserIcon className="w-6 h-6 text-purple-600" /></div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{[...new Set(schedules.map(s => s.teacher_id))].length}</p>
                                <p className="text-xs text-gray-500">Guru Mengajar</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><BookOpenIcon className="w-6 h-6 text-orange-600" /></div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{[...new Set(schedules.map(s => s.subject))].length}</p>
                                <p className="text-xs text-gray-500">Mata Pelajaran</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-3">
                        <select
                            value={filterDay}
                            onChange={e => setFilterDay(e.target.value)}
                            className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-sm"
                        >
                            <option value="">Semua Hari</option>
                            {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                        <select
                            value={filterClass}
                            onChange={e => setFilterClass(e.target.value)}
                            className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-sm"
                        >
                            <option value="">Semua Kelas</option>
                            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                        {(filterDay || filterClass) && (
                            <button onClick={() => { setFilterDay(''); setFilterClass(''); }}
                                className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
                                <XMarkIcon className="w-4 h-4" /> Reset Filter
                            </button>
                        )}
                        <span className="ml-auto text-sm text-gray-500 self-center">
                            Menampilkan {filtered.length} dari {schedules.length} jadwal
                        </span>
                    </div>

                    {/* Schedule Table */}
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                        {schedules.length === 0 ? (
                            <div className="py-16 text-center">
                                <CalendarDaysIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">Belum ada jadwal pelajaran</p>
                                <p className="text-gray-400 text-sm mt-1">Tambahkan jadwal agar fitur absensi QR barcode siswa dapat berfungsi.</p>
                                <button onClick={openAddModal}
                                    className="mt-4 inline-flex items-center px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors">
                                    <PlusIcon className="w-4 h-4 mr-2" /> Tambah Jadwal Pertama
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider">
                                            <th className="px-5 py-4 font-bold text-gray-900 dark:text-white">Hari</th>
                                            <th className="px-5 py-4 font-bold text-gray-900 dark:text-white">Kelas</th>
                                            <th className="px-5 py-4 font-bold text-gray-900 dark:text-white">Mata Pelajaran</th>
                                            <th className="px-5 py-4 font-bold text-gray-900 dark:text-white">Guru</th>
                                            <th className="px-5 py-4 font-bold text-gray-900 dark:text-white">Jam</th>
                                            <th className="px-5 py-4 font-bold text-gray-900 dark:text-white text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-5 py-10 text-center text-gray-400 italic">
                                                    Tidak ada jadwal yang cocok dengan filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map(schedule => (
                                                <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${DAY_COLORS[schedule.day] ?? ''}`}>
                                                            {getDayLabel(schedule.day)}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                                            {schedule.academic_class?.name ?? '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300 font-medium">
                                                        {schedule.subject}
                                                    </td>
                                                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                                        {schedule.teacher?.name ?? '-'}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="inline-flex items-center gap-1 text-sm font-mono text-gray-700 dark:text-gray-300">
                                                            <ClockIcon className="w-4 h-4 text-gray-400" />
                                                            {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-right space-x-1">
                                                        <button
                                                            onClick={() => openEditModal(schedule)}
                                                            className="inline-flex p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                            title="Edit jadwal"
                                                        >
                                                            <PencilSquareIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(schedule.id)}
                                                            className="inline-flex p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Hapus jadwal"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Info Banner */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
                        <ClockIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                            <p className="font-semibold">Cara Kerja Absensi QR Barcode</p>
                            <p className="mt-1 opacity-80">
                                Saat siswa scan QR, sistem akan mencari jadwal yang aktif berdasarkan <strong>hari ini</strong> dan <strong>jam saat ini ±15 menit</strong>.
                                Pastikan jadwal sudah diisi dengan benar agar absensi dapat tercatat.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Tambah/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
                            <form onSubmit={handleSubmit}>
                                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 rounded-t-2xl">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <CalendarDaysIcon className="w-6 h-6 text-primary" />
                                        {editingSchedule ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran'}
                                    </h3>
                                    <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    {/* Kelas */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Kelas <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.class_id}
                                            onChange={e => setData('class_id', e.target.value)}
                                            required
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm"
                                        >
                                            <option value="">-- Pilih Kelas --</option>
                                            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                                        </select>
                                        {errors.class_id && <p className="text-red-500 text-xs mt-1">{errors.class_id}</p>}
                                    </div>

                                    {/* Mata Pelajaran */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Mata Pelajaran <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.subject}
                                            onChange={e => setData('subject', e.target.value)}
                                            required
                                            placeholder="Contoh: Matematika, Bahasa Arab..."
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm"
                                        />
                                        {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                                    </div>

                                    {/* Guru */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Guru <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.teacher_id}
                                            onChange={e => setData('teacher_id', e.target.value)}
                                            required
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm"
                                        >
                                            <option value="">-- Pilih Guru --</option>
                                            {teachers.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                                        </select>
                                        {errors.teacher_id && <p className="text-red-500 text-xs mt-1">{errors.teacher_id}</p>}
                                    </div>

                                    {/* Hari */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Hari <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.day}
                                            onChange={e => setData('day', e.target.value)}
                                            required
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm"
                                        >
                                            <option value="">-- Pilih Hari --</option>
                                            {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                        </select>
                                        {errors.day && <p className="text-red-500 text-xs mt-1">{errors.day}</p>}
                                    </div>

                                    {/* Jam */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Jam Mulai <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                value={data.start_time}
                                                onChange={e => setData('start_time', e.target.value)}
                                                required
                                                className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm"
                                            />
                                            {errors.start_time && <p className="text-red-500 text-xs mt-1">{errors.start_time}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Jam Selesai <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                value={data.end_time}
                                                onChange={e => setData('end_time', e.target.value)}
                                                required
                                                className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm"
                                            />
                                            {errors.end_time && <p className="text-red-500 text-xs mt-1">{errors.end_time}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-8 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-50"
                                    >
                                        {processing ? 'Menyimpan...' : editingSchedule ? 'Perbarui Jadwal' : 'Simpan Jadwal'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Print Styles */}
            <style>{`
                @media print {
                    nav, header, aside, .no-print, [role="navigation"] {
                        display: none !important;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
