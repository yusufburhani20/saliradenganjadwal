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
    ChevronDownIcon,
    ComputerDesktopIcon,
    ClipboardDocumentListIcon,
    ArrowTopRightOnSquareIcon,
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
    room?: string | null;
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

const DAY_ORDER: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
};

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

function downloadCsvBlob(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function ScheduleIndex({
    auth,
    schedules,
    classes,
    teachers,
    school_name,
    labs = [],
}: PageProps<{
    schedules: Schedule[];
    classes: AcademicClass[];
    teachers: Teacher[];
    lesson_hours?: Record<string, Array<{ slot: number; start: string; end: string }>>;
    school_name?: string;
    labs?: string[];
}>) {
    const [isModalOpen, setIsModalOpen]             = useState(false);
    const [editingSchedule, setEditingSchedule]     = useState<Schedule | null>(null);
    const [filterDay, setFilterDay]                 = useState('');
    const [filterClass, setFilterClass]             = useState('');
    const [filterTeacher, setFilterTeacher]         = useState('');

    // View tab: table, by-class, by-teacher
    const [activeTab, setActiveTab]                 = useState<'table' | 'class' | 'teacher'>('table');
    const [selectedViewTarget, setSelectedViewTarget] = useState<string>('all');

    // Export & Print modals
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen]   = useState(false);
    const [printMode, setPrintMode]                 = useState<'table' | 'class' | 'teacher'>('table');

    // Official aSc PDF export filters
    const [selectedTeacherForPdf, setSelectedTeacherForPdf] = useState<string>('');
    const [selectedClassForPdf, setSelectedClassForPdf] = useState<string>('');
    const [selectedLabForPdf, setSelectedLabForPdf] = useState<string>('');
    const [selectedDayForPdf, setSelectedDayForPdf] = useState<string>('');
    const [validDateForPdf, setValidDateForPdf]     = useState<string>('29 Agustus 2026');

    React.useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('openExport=pdf')) {
            setIsPrintModalOpen(true);
        }
    }, []);

    const { data, setData, post, put, reset, processing, errors } = useForm({
        class_id:   '',
        teacher_id: '',
        subject:    '',
        room:       '',
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
            room:       schedule.room || '',
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
        const matchDay     = filterDay     ? s.day === filterDay : true;
        const matchClass   = filterClass   ? String(s.class_id) === filterClass : true;
        const matchTeacher = filterTeacher ? String(s.teacher_id) === filterTeacher : true;
        return matchDay && matchClass && matchTeacher;
    });

    // 1. Export Excel Per Kelas
    const handleExportPerClass = () => {
        const targetClasses = filterClass
            ? classes.filter(c => String(c.id) === filterClass)
            : classes.filter(c => schedules.some(s => s.class_id === c.id));

        if (targetClasses.length === 0) {
            alert('Tidak ada data kelas untuk diekspor.');
            return;
        }

        const lines: string[] = [];
        lines.push(`"JADWAL PELAJARAN PER KELAS"`);
        lines.push(`"Sekolah: ${(school_name || 'SIM Salira').replace(/"/g, '""')}"`);
        lines.push(`"Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}"`);
        lines.push('');

        targetClasses.forEach((cls) => {
            const classItems = schedules
                .filter(s => s.class_id === cls.id && (!filterDay || s.day === filterDay) && (!filterTeacher || String(s.teacher_id) === filterTeacher))
                .sort((a, b) => (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99) || (a.start_time || '').localeCompare(b.start_time || ''));

            lines.push(`"=== KELAS: ${cls.name.toUpperCase().replace(/"/g, '""')} (Total: ${classItems.length} Sesi Pelajaran) ==="`);
            lines.push('No,Hari,Jam Mulai,Jam Selesai,Mata Pelajaran,Guru Pengampu');

            if (classItems.length === 0) {
                lines.push('"","(Tidak ada jadwal tercatat)","","","",""');
            } else {
                classItems.forEach((s, idx) => {
                    lines.push([
                        idx + 1,
                        getDayLabel(s.day),
                        formatTime(s.start_time),
                        formatTime(s.end_time),
                        `"${(s.subject || '').replace(/"/g, '""')}"`,
                        `"${(s.teacher?.name || '').replace(/"/g, '""')}"`,
                    ].join(','));
                });
            }
            lines.push('');
        });

        const csv = '\uFEFF' + lines.join('\r\n');
        downloadCsvBlob(csv, `Jadwal_Pelajaran_Per_Kelas_${new Date().toISOString().slice(0, 10)}.csv`);
        setIsExportModalOpen(false);
    };

    // 2. Export Excel Per Guru
    const handleExportPerTeacher = () => {
        const targetTeachers = filterTeacher
            ? teachers.filter(t => String(t.id) === filterTeacher)
            : teachers.filter(t => schedules.some(s => s.teacher_id === t.id));

        if (targetTeachers.length === 0) {
            alert('Tidak ada data guru untuk diekspor.');
            return;
        }

        const lines: string[] = [];
        lines.push(`"JADWAL MENGAJAR GURU"`);
        lines.push(`"Sekolah: ${(school_name || 'SIM Salira').replace(/"/g, '""')}"`);
        lines.push(`"Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}"`);
        lines.push('');

        targetTeachers.forEach((tch) => {
            const teacherItems = schedules
                .filter(s => s.teacher_id === tch.id && (!filterDay || s.day === filterDay) && (!filterClass || String(s.class_id) === filterClass))
                .sort((a, b) => (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99) || (a.start_time || '').localeCompare(b.start_time || ''));

            lines.push(`"=== GURU: ${tch.name.toUpperCase().replace(/"/g, '""')} (Total Beban: ${teacherItems.length} Sesi Mengajar) ==="`);
            lines.push('No,Hari,Jam Mulai,Jam Selesai,Kelas,Mata Pelajaran');

            if (teacherItems.length === 0) {
                lines.push('"","(Tidak ada jadwal mengajar)","","","",""');
            } else {
                teacherItems.forEach((s, idx) => {
                    lines.push([
                        idx + 1,
                        getDayLabel(s.day),
                        formatTime(s.start_time),
                        formatTime(s.end_time),
                        `"${(s.academic_class?.name || '').replace(/"/g, '""')}"`,
                        `"${(s.subject || '').replace(/"/g, '""')}"`,
                    ].join(','));
                });
            }
            lines.push('');
        });

        const csv = '\uFEFF' + lines.join('\r\n');
        downloadCsvBlob(csv, `Jadwal_Mengajar_Per_Guru_${new Date().toISOString().slice(0, 10)}.csv`);
        setIsExportModalOpen(false);
    };

    // 3. Export Semua Jadwal Flat
    const handleExportAllRaw = () => {
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
        downloadCsvBlob(csvContent, `Jadwal_Pelajaran_Lengkap_${new Date().toISOString().slice(0, 10)}.csv`);
        setIsExportModalOpen(false);
    };

    // Print Trigger
    const triggerPrint = (mode: 'table' | 'class' | 'teacher') => {
        setPrintMode(mode);
        setIsPrintModalOpen(false);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    // Classes & Teachers with schedules for display
    const classesWithSchedules = classes.filter(c => schedules.some(s => s.class_id === c.id));
    const teachersWithSchedules = teachers.filter(t => schedules.some(s => s.teacher_id === t.id));

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Jadwal Pelajaran</h2>}>
            <Head title="Jadwal Pelajaran" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Jadwal Pelajaran Mingguan</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
                                Kelola jadwal resmi sekolah. Dilengkapi export Excel & cetak PDF per kelas dan per guru.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Ekspor Excel Button */}
                            <button
                                onClick={() => setIsExportModalOpen(true)}
                                className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm gap-2"
                                title="Pilih Format Ekspor Excel"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>Ekspor Excel</span>
                                <ChevronDownIcon className="w-3 h-3 opacity-80" />
                            </button>

                            {/* Cetak / PDF Button */}
                            <button
                                onClick={() => setIsPrintModalOpen(true)}
                                className="inline-flex items-center px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm gap-2"
                                title="Pilih Format Cetak atau Simpan PDF"
                            >
                                <PrinterIcon className="w-4 h-4" />
                                <span>Cetak / PDF</span>
                                <ChevronDownIcon className="w-3 h-3 opacity-80" />
                            </button>

                            {/* Tambah Jadwal Button */}
                            <button
                                onClick={openAddModal}
                                className="inline-flex items-center px-4 py-2.5 bg-primary border border-transparent rounded-xl font-bold text-xs text-white uppercase tracking-wider hover:bg-primary-hover transition-all shadow-sm gap-2"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Tambah Jadwal</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-xl"><CalendarDaysIcon className="w-6 h-6 text-primary" /></div>
                            <div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{schedules.length}</p>
                                <p className="text-xs text-gray-500 font-medium">Total Jadwal</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl"><AcademicCapIcon className="w-6 h-6 text-emerald-600" /></div>
                            <div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{classesWithSchedules.length}</p>
                                <p className="text-xs text-gray-500 font-medium">Kelas Aktif</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl"><UserIcon className="w-6 h-6 text-purple-600" /></div>
                            <div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{teachersWithSchedules.length}</p>
                                <p className="text-xs text-gray-500 font-medium">Guru Mengajar</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl"><BookOpenIcon className="w-6 h-6 text-orange-600" /></div>
                            <div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{[...new Set(schedules.map(s => s.subject))].length}</p>
                                <p className="text-xs text-gray-500 font-medium">Mata Pelajaran</p>
                            </div>
                        </div>
                    </div>

                    {/* View Switcher Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-2">
                        <button
                            onClick={() => { setActiveTab('table'); setSelectedViewTarget('all'); }}
                            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                                activeTab === 'table'
                                    ? 'border-primary text-primary dark:text-primary-light'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <CalendarDaysIcon className="w-4 h-4" />
                            Daftar Tabel
                        </button>
                        <button
                            onClick={() => { setActiveTab('class'); setSelectedViewTarget('all'); }}
                            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                                activeTab === 'class'
                                    ? 'border-primary text-primary dark:text-primary-light'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <AcademicCapIcon className="w-4 h-4" />
                            Jadwal Per Kelas ({classesWithSchedules.length})
                        </button>
                        <button
                            onClick={() => { setActiveTab('teacher'); setSelectedViewTarget('all'); }}
                            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                                activeTab === 'teacher'
                                    ? 'border-primary text-primary dark:text-primary-light'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <UserIcon className="w-4 h-4" />
                            Jadwal Per Guru ({teachersWithSchedules.length})
                        </button>
                    </div>

                    {/* Filters (Active in Table Mode) */}
                    {activeTab === 'table' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3 shadow-xs">
                            <select
                                value={filterDay}
                                onChange={e => setFilterDay(e.target.value)}
                                className="rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-xs font-semibold py-2 px-3"
                            >
                                <option value="">Semua Hari</option>
                                {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>

                            <select
                                value={filterClass}
                                onChange={e => setFilterClass(e.target.value)}
                                className="rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-xs font-semibold py-2 px-3"
                            >
                                <option value="">Semua Kelas</option>
                                {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                            </select>

                            <select
                                value={filterTeacher}
                                onChange={e => setFilterTeacher(e.target.value)}
                                className="rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-xs font-semibold py-2 px-3"
                            >
                                <option value="">Semua Guru</option>
                                {teachers.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                            </select>

                            {(filterDay || filterClass || filterTeacher) && (
                                <button
                                    onClick={() => { setFilterDay(''); setFilterClass(''); setFilterTeacher(''); }}
                                    className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                                >
                                    <XMarkIcon className="w-4 h-4" /> Reset Filter
                                </button>
                            )}

                            <span className="ml-auto text-xs text-gray-500 font-medium">
                                Menampilkan {filtered.length} dari {schedules.length} jadwal
                            </span>
                        </div>
                    )}

                    {/* CONTENT TAB 1: TABEL LENGKAP */}
                    {activeTab === 'table' && (
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-2xl border border-gray-200 dark:border-gray-700">
                            {schedules.length === 0 ? (
                                <div className="py-16 text-center">
                                    <CalendarDaysIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-600 font-semibold text-base">Belum ada jadwal pelajaran</p>
                                    <p className="text-gray-400 text-xs mt-1">Tambahkan jadwal manual atau gunakan menu Generator Jadwal untuk membuat otomatis.</p>
                                    <button onClick={openAddModal}
                                        className="mt-4 inline-flex items-center px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors">
                                        <PlusIcon className="w-4 h-4 mr-1.5" /> Tambah Jadwal Pertama
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300 font-bold">
                                                <th className="px-5 py-3.5">Hari</th>
                                                <th className="px-5 py-3.5">Kelas</th>
                                                <th className="px-5 py-3.5">Mata Pelajaran</th>
                                                <th className="px-5 py-3.5">Guru Pengampu</th>
                                                <th className="px-5 py-3.5">Jam</th>
                                                <th className="px-5 py-3.5 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                            {filtered.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400 italic">
                                                        Tidak ada jadwal yang cocok dengan filter yang dipilih.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filtered.map(schedule => (
                                                    <tr key={schedule.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${DAY_COLORS[schedule.day] ?? ''}`}>
                                                                {getDayLabel(schedule.day)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                            <span className="font-bold text-gray-900 dark:text-white">
                                                                {schedule.academic_class?.name ?? '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-gray-800 dark:text-gray-200 font-semibold">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span>{schedule.subject}</span>
                                                                {schedule.room && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                                                                        🏢 {schedule.room}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                                                            {schedule.teacher?.name ?? '-'}
                                                        </td>
                                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">
                                                                <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                                                                {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 whitespace-nowrap text-right space-x-1">
                                                            <button
                                                                onClick={() => openEditModal(schedule)}
                                                                className="inline-flex p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                                title="Edit jadwal"
                                                            >
                                                                <PencilSquareIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(schedule.id)}
                                                                className="inline-flex p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="Hapus jadwal"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
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
                    )}

                    {/* CONTENT TAB 2: JADWAL PER KELAS */}
                    {activeTab === 'class' && (
                        <div className="space-y-6">
                            {/* Class Selector Bar */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Pilih Kelas:</span>
                                    <select
                                        value={selectedViewTarget}
                                        onChange={e => setSelectedViewTarget(e.target.value)}
                                        className="rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-xs font-bold py-2 px-3"
                                    >
                                        <option value="all">Semua Kelas ({classesWithSchedules.length})</option>
                                        {classesWithSchedules.map(c => (
                                            <option key={c.id} value={String(c.id)}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExportPerClass}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 transition"
                                    >
                                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                        Ekspor Excel Kelas
                                    </button>
                                    <button
                                        onClick={() => triggerPrint('class')}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                                    >
                                        <PrinterIcon className="w-3.5 h-3.5" />
                                        Cetak Jadwal Kelas
                                    </button>
                                </div>
                            </div>

                            {/* Render Classes Cards */}
                            {classesWithSchedules
                                .filter(c => selectedViewTarget === 'all' || String(c.id) === selectedViewTarget)
                                .map(cls => {
                                    const classItems = schedules
                                        .filter(s => s.class_id === cls.id)
                                        .sort((a, b) => (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99) || (a.start_time || '').localeCompare(b.start_time || ''));

                                    return (
                                        <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4 gap-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                                                        <AcademicCapIcon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-gray-900 dark:text-white">Kelas {cls.name}</h4>
                                                        <p className="text-xs text-gray-500 font-medium">Jadwal Pelajaran Mingguan Rombel</p>
                                                    </div>
                                                </div>
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                                                    {classItems.length} Sesi Terjadwal
                                                </span>
                                            </div>

                                            {/* Weekly Day Columns */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                                                {DAY_OPTIONS.slice(0, 6).map(day => {
                                                    const dayItems = classItems.filter(s => s.day === day.value);
                                                    return (
                                                        <div key={day.value} className="bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
                                                            <div className="text-center font-bold text-xs text-gray-700 dark:text-gray-300 pb-2 mb-2 border-b border-gray-200/60 dark:border-gray-700">
                                                                {day.label}
                                                            </div>
                                                            <div className="space-y-2 min-h-[140px]">
                                                                {dayItems.length === 0 ? (
                                                                    <div className="h-28 flex items-center justify-center text-[11px] text-gray-400 italic">
                                                                        Kosong
                                                                    </div>
                                                                ) : (
                                                                    dayItems.map(item => (
                                                                        <div key={item.id} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 shadow-xs space-y-1">
                                                                            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 font-bold">
                                                                                <span>{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
                                                                            </div>
                                                                            <p className="font-bold text-xs text-gray-900 dark:text-white leading-tight line-clamp-1">{item.subject}</p>
                                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">👤 {item.teacher?.name ?? '-'}</p>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {/* CONTENT TAB 3: JADWAL PER GURU */}
                    {activeTab === 'teacher' && (
                        <div className="space-y-6">
                            {/* Teacher Selector Bar */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Pilih Guru:</span>
                                    <select
                                        value={selectedViewTarget}
                                        onChange={e => setSelectedViewTarget(e.target.value)}
                                        className="rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-xs font-bold py-2 px-3"
                                    >
                                        <option value="all">Semua Guru ({teachersWithSchedules.length})</option>
                                        {teachersWithSchedules.map(t => (
                                            <option key={t.id} value={String(t.id)}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExportPerTeacher}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 transition"
                                    >
                                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                        Ekspor Excel Guru
                                    </button>
                                    <button
                                        onClick={() => triggerPrint('teacher')}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                                    >
                                        <PrinterIcon className="w-3.5 h-3.5" />
                                        Cetak Jadwal Guru
                                    </button>
                                </div>
                            </div>

                            {/* Render Teachers Cards */}
                            {teachersWithSchedules
                                .filter(t => selectedViewTarget === 'all' || String(t.id) === selectedViewTarget)
                                .map(tch => {
                                    const teacherItems = schedules
                                        .filter(s => s.teacher_id === tch.id)
                                        .sort((a, b) => (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99) || (a.start_time || '').localeCompare(b.start_time || ''));

                                    return (
                                        <div key={tch.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-700/80 pb-4 gap-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                                                        <UserIcon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-gray-900 dark:text-white">{tch.name}</h4>
                                                        <p className="text-xs text-gray-500 font-medium">Jadwal Mengajar Pendidik</p>
                                                    </div>
                                                </div>
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                                                    Beban: {teacherItems.length} Sesi Mengajar
                                                </span>
                                            </div>

                                            {/* Weekly Day Columns */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                                                {DAY_OPTIONS.slice(0, 6).map(day => {
                                                    const dayItems = teacherItems.filter(s => s.day === day.value);
                                                    return (
                                                        <div key={day.value} className="bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
                                                            <div className="text-center font-bold text-xs text-gray-700 dark:text-gray-300 pb-2 mb-2 border-b border-gray-200/60 dark:border-gray-700">
                                                                {day.label}
                                                            </div>
                                                            <div className="space-y-2 min-h-[140px]">
                                                                {dayItems.length === 0 ? (
                                                                    <div className="h-28 flex items-center justify-center text-[11px] text-gray-400 italic">
                                                                        Kosong
                                                                    </div>
                                                                ) : (
                                                                    dayItems.map(item => (
                                                                        <div key={item.id} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 shadow-xs space-y-1">
                                                                            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 font-bold">
                                                                                <span>{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
                                                                            </div>
                                                                            <p className="font-bold text-xs text-gray-900 dark:text-white leading-tight line-clamp-1">{item.subject}</p>
                                                                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold truncate">🏫 Kelas {item.academic_class?.name ?? '-'}</p>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {/* Info Banner */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
                        <ClockIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                            <p className="font-bold">Informasi Sinkronisasi Jadwal & Absensi</p>
                            <p className="mt-0.5 text-xs opacity-85 leading-relaxed">
                                Jadwal ini otomatis terhubung dengan modul absensi scan QR barcode siswa. Sistem mencocokkan waktu scan dengan jadwal kelas saat ini. Gunakan fitur Ekspor untuk mendistribusikan jadwal ke seluruh wali kelas dan guru pengampu.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL PILIHAN EKSPOR EXCEL */}
            {isExportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 space-y-5">
                        <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Pilih Format Ekspor Excel</h3>
                                    <p className="text-xs text-gray-500">File spreadsheet (.csv) siap buka di Microsoft Excel</p>
                                </div>
                            </div>
                            <button onClick={() => setIsExportModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Ekspor Per Kelas */}
                            <button
                                onClick={handleExportPerClass}
                                className="w-full text-left p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition group flex items-start gap-3.5"
                            >
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mt-0.5 group-hover:bg-emerald-500 group-hover:text-white transition">
                                    <AcademicCapIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                                        Ekspor Jadwal Per Kelas
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                        Data dikelompokkan dan dipisah per rombel kelas. Sangat cocok dibagikan ke siswa & wali kelas.
                                    </p>
                                </div>
                            </button>

                            {/* Ekspor Per Guru */}
                            <button
                                onClick={handleExportPerTeacher}
                                className="w-full text-left p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition group flex items-start gap-3.5"
                            >
                                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 mt-0.5 group-hover:bg-emerald-500 group-hover:text-white transition">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                                        Ekspor Jadwal Per Guru
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                        Data dikelompokkan per guru lengkap dengan total beban jam mengajar mingguan masing-masing.
                                    </p>
                                </div>
                            </button>

                            {/* Ekspor Tabel Lengkap */}
                            <button
                                onClick={handleExportAllRaw}
                                className="w-full text-left p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition group flex items-start gap-3.5"
                            >
                                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mt-0.5 group-hover:bg-emerald-500 group-hover:text-white transition">
                                    <CalendarDaysIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                                        Ekspor Daftar Tabel Lengkap
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                        Format spreadsheet flat berisi seluruh baris jadwal (menghargai filter aktif).
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PILIHAN CETAK / PDF */}
            {isPrintModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-700 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <PrinterIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Ekspor PDF & Cetak Jadwal</h3>
                                    <p className="text-xs text-gray-500">Unduh PDF resmi format aSc Timetables atau cetak langsung via browser</p>
                                </div>
                            </div>
                            <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* SECTION 1: 4 FORMAT RESMI aSc TIMETABLES */}
                        <div className="space-y-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                        Format Resmi aSc Timetables
                                    </span>
                                    <span className="text-xs text-gray-400">Layout Landscape Letter rapi & cell-merging</span>
                                </div>
                            </div>

                            {/* ISIAN TANGGAL MULAI BERLAKU UNTUK FOOTER PDF */}
                            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                        <CalendarDaysIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                                            Jadwal Mulai Berlaku pada Tanggal:
                                        </label>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                            Tercetak otomatis di sudut kiri bawah footer seluruh dokumen PDF
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full sm:w-72">
                                    <input
                                        type="text"
                                        value={validDateForPdf}
                                        onChange={e => setValidDateForPdf(e.target.value)}
                                        placeholder="Contoh: 29 Agustus 2026"
                                        className="w-full text-xs font-semibold rounded-xl border-amber-300 dark:border-amber-700/60 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 focus:ring-amber-500 focus:border-amber-500 shadow-inner bg-white/90"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {/* 1. PDF GURU */}
                                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 bg-purple-50/20 dark:bg-purple-950/10 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                                                    <UserIcon className="w-4 h-4" />
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Jadwal Per Guru</h4>
                                            </div>
                                            <span className="text-[10px] font-semibold text-purple-600 bg-purple-100/80 px-2 py-0.5 rounded-md">65 Guru</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            1 lembar per guru lengkap dengan nama kelas & tag ruang lab.
                                        </p>
                                    </div>
                                    <div className="space-y-2 pt-1 border-t border-purple-100 dark:border-purple-900/30">
                                        <select
                                            value={selectedTeacherForPdf}
                                            onChange={e => setSelectedTeacherForPdf(e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 py-1.5 px-2"
                                        >
                                            <option value="">Semua Guru (Semua Lembar)</option>
                                            {teachersWithSchedules.map(t => (
                                                <option key={t.id} value={String(t.id)}>{t.name}</option>
                                            ))}
                                        </select>
                                        <a
                                            href={`/admin/schedules/export-pdf?type=guru${selectedTeacherForPdf ? `&teacher_id=${selectedTeacherForPdf}` : ''}${validDateForPdf ? `&valid_date=${encodeURIComponent(validDateForPdf)}` : ''}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                                        >
                                            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                            <span>Unduh PDF Guru</span>
                                        </a>
                                    </div>
                                </div>

                                {/* 2. PDF KELAS */}
                                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                                                    <AcademicCapIcon className="w-4 h-4" />
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Jadwal Per Kelas</h4>
                                            </div>
                                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-md">28 Kelas</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            1 lembar per kelas rombel dengan nama mapel, guru pengampu & ruang.
                                        </p>
                                    </div>
                                    <div className="space-y-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/30">
                                        <select
                                            value={selectedClassForPdf}
                                            onChange={e => setSelectedClassForPdf(e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 py-1.5 px-2"
                                        >
                                            <option value="">Semua Kelas (Semua Lembar)</option>
                                            {classesWithSchedules.map(c => (
                                                <option key={c.id} value={String(c.id)}>{c.name}</option>
                                            ))}
                                        </select>
                                        <a
                                            href={`/admin/schedules/export-pdf?type=kelas${selectedClassForPdf ? `&class_id=${selectedClassForPdf}` : ''}${validDateForPdf ? `&valid_date=${encodeURIComponent(validDateForPdf)}` : ''}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                                        >
                                            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                            <span>Unduh PDF Kelas</span>
                                        </a>
                                    </div>
                                </div>

                                {/* 3. PDF LAB */}
                                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                                                    <ComputerDesktopIcon className="w-4 h-4" />
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Jadwal Ruang Lab</h4>
                                            </div>
                                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-md">3 Ruang Lab</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            1 lembar per lab: LAB 1, LAB 2, LAB TI untuk memantau okupansi lab komputer.
                                        </p>
                                    </div>
                                    <div className="space-y-2 pt-1 border-t border-emerald-100 dark:border-emerald-900/30">
                                        <select
                                            value={selectedLabForPdf}
                                            onChange={e => setSelectedLabForPdf(e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 py-1.5 px-2"
                                        >
                                            <option value="">Semua Lab (LAB 1, 2, TI)</option>
                                            <option value="LAB 1">LAB 1</option>
                                            <option value="LAB 2">LAB 2</option>
                                            <option value="LAB TI">LAB TI</option>
                                        </select>
                                        <a
                                            href={`/admin/schedules/export-pdf?type=lab${selectedLabForPdf ? `&lab=${encodeURIComponent(selectedLabForPdf)}` : ''}${validDateForPdf ? `&valid_date=${encodeURIComponent(validDateForPdf)}` : ''}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                                        >
                                            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                            <span>Unduh PDF Lab</span>
                                        </a>
                                    </div>
                                </div>

                                {/* 4. PDF PIKET */}
                                <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 bg-amber-50/20 dark:bg-amber-950/10 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                                                    <ClipboardDocumentListIcon className="w-4 h-4" />
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Jadwal Guru Piket</h4>
                                            </div>
                                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-md">6 Hari Aktif</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            Master jadwal harian memuat 28 kelas (kolom) x 9 jam pelajaran (baris).
                                        </p>
                                    </div>
                                    <div className="space-y-2 pt-1 border-t border-amber-100 dark:border-amber-900/30">
                                        <select
                                            value={selectedDayForPdf}
                                            onChange={e => setSelectedDayForPdf(e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 py-1.5 px-2"
                                        >
                                            <option value="">Semua Hari (Sabtu s/d Kamis)</option>
                                            <option value="saturday">Sabtu</option>
                                            <option value="sunday">Ahad</option>
                                            <option value="monday">Senin</option>
                                            <option value="tuesday">Selasa</option>
                                            <option value="wednesday">Rabu</option>
                                            <option value="thursday">Kamis</option>
                                        </select>
                                        <a
                                            href={`/admin/schedules/export-pdf?type=piket${selectedDayForPdf ? `&day=${selectedDayForPdf}` : ''}${validDateForPdf ? `&valid_date=${encodeURIComponent(validDateForPdf)}` : ''}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                                        >
                                            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                            <span>Unduh PDF Piket</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: BROWSER PRINT FALLBACK */}
                        <div className="pt-2 border-t dark:border-gray-700 space-y-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Opsi Alternatif: Cetak Cepat via Browser (Ctrl+P)
                            </span>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => triggerPrint('class')}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                >
                                    Dialog Print: Per Kelas
                                </button>
                                <button
                                    onClick={() => triggerPrint('teacher')}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                >
                                    Dialog Print: Per Guru
                                </button>
                                <button
                                    onClick={() => triggerPrint('table')}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                >
                                    Dialog Print: Tabel Aktif
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT-ONLY AREA: DILENGKAPI PAGE BREAK PER KELAS & PER GURU */}
            <div className="print-only">
                {/* Print Per Kelas */}
                {printMode === 'class' && (
                    <div>
                        {classesWithSchedules.map(cls => {
                            const classItems = schedules
                                .filter(s => s.class_id === cls.id)
                                .sort((a, b) => (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99) || (a.start_time || '').localeCompare(b.start_time || ''));

                            return (
                                <div key={cls.id} className="print-page-break p-6 space-y-4">
                                    {/* Header Kop */}
                                    <div className="text-center border-b-2 border-black pb-3">
                                        <h2 className="text-lg font-black uppercase tracking-wider">{school_name || 'SIM SALIRA'}</h2>
                                        <h3 className="text-base font-bold uppercase mt-0.5">JADWAL PELAJARAN KELAS {cls.name}</h3>
                                        <p className="text-xs text-gray-600">Tahun Ajaran Aktif • Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
                                    </div>

                                    {/* Table */}
                                    <table className="w-full text-left border border-black border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-100 border-b border-black font-bold">
                                                <th className="p-2 border-r border-black w-10 text-center">No</th>
                                                <th className="p-2 border-r border-black w-24">Hari</th>
                                                <th className="p-2 border-r border-black w-32">Waktu</th>
                                                <th className="p-2 border-r border-black">Mata Pelajaran</th>
                                                <th className="p-2">Guru Pengampu</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-4 text-center italic text-gray-500">
                                                        Belum ada jadwal untuk kelas ini.
                                                    </td>
                                                </tr>
                                            ) : (
                                                classItems.map((item, idx) => (
                                                    <tr key={item.id} className="border-b border-gray-400">
                                                        <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                                                        <td className="p-2 border-r border-black font-semibold">{getDayLabel(item.day)}</td>
                                                        <td className="p-2 border-r border-black font-mono">{formatTime(item.start_time)} - {formatTime(item.end_time)}</td>
                                                        <td className="p-2 border-r border-black font-bold">{item.subject}</td>
                                                        <td className="p-2">{item.teacher?.name ?? '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Signature Block */}
                                    <div className="pt-8 flex justify-between text-xs">
                                        <div className="text-center w-48">
                                            <p>Wali Kelas {cls.name},</p>
                                            <div className="h-16" />
                                            <p className="font-bold underline">(............................................)</p>
                                        </div>
                                        <div className="text-center w-48">
                                            <p>Kepala Sekolah,</p>
                                            <div className="h-16" />
                                            <p className="font-bold underline">(............................................)</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Print Per Guru */}
                {printMode === 'teacher' && (
                    <div>
                        {teachersWithSchedules.map(tch => {
                            const teacherItems = schedules
                                .filter(s => s.teacher_id === tch.id)
                                .sort((a, b) => (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99) || (a.start_time || '').localeCompare(b.start_time || ''));

                            return (
                                <div key={tch.id} className="print-page-break p-6 space-y-4">
                                    {/* Header Kop */}
                                    <div className="text-center border-b-2 border-black pb-3">
                                        <h2 className="text-lg font-black uppercase tracking-wider">{school_name || 'SIM SALIRA'}</h2>
                                        <h3 className="text-base font-bold uppercase mt-0.5">JADWAL MENGAJAR GURU: {tch.name}</h3>
                                        <p className="text-xs text-gray-600">Total Beban: {teacherItems.length} Sesi Mengajar • Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
                                    </div>

                                    {/* Table */}
                                    <table className="w-full text-left border border-black border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-100 border-b border-black font-bold">
                                                <th className="p-2 border-r border-black w-10 text-center">No</th>
                                                <th className="p-2 border-r border-black w-24">Hari</th>
                                                <th className="p-2 border-r border-black w-32">Waktu</th>
                                                <th className="p-2 border-r border-black w-28">Kelas</th>
                                                <th className="p-2">Mata Pelajaran</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teacherItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-4 text-center italic text-gray-500">
                                                        Belum ada jam mengajar untuk guru ini.
                                                    </td>
                                                </tr>
                                            ) : (
                                                teacherItems.map((item, idx) => (
                                                    <tr key={item.id} className="border-b border-gray-400">
                                                        <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                                                        <td className="p-2 border-r border-black font-semibold">{getDayLabel(item.day)}</td>
                                                        <td className="p-2 border-r border-black font-mono">{formatTime(item.start_time)} - {formatTime(item.end_time)}</td>
                                                        <td className="p-2 border-r border-black font-bold">Kelas {item.academic_class?.name ?? '-'}</td>
                                                        <td className="p-2">{item.subject}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Signature Block */}
                                    <div className="pt-8 flex justify-between text-xs">
                                        <div className="text-center w-48">
                                            <p>Guru Pengampu,</p>
                                            <div className="h-16" />
                                            <p className="font-bold underline">{tch.name}</p>
                                        </div>
                                        <div className="text-center w-48">
                                            <p>Kepala Sekolah,</p>
                                            <div className="h-16" />
                                            <p className="font-bold underline">(............................................)</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
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

                                    {/* Ruangan / Lab */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Ruangan / Lab (Opsional)
                                        </label>
                                        <select
                                            value={data.room}
                                            onChange={e => setData('room', e.target.value)}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm"
                                        >
                                            <option value="">Ruang Kelas Biasa (Tanpa Lab)</option>
                                            {Array.from(new Set([...(labs || []), 'LAB 1', 'LAB 2', 'LAB TI'])).map(lab => (
                                                <option key={lab} value={lab}>🏢 {lab}</option>
                                            ))}
                                        </select>
                                        {errors.room && <p className="text-red-500 text-xs mt-1">{errors.room}</p>}
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
                    .print-only {
                        display: block !important;
                    }
                    .print-page-break {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                }
                @media screen {
                    .print-only {
                        display: none !important;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
