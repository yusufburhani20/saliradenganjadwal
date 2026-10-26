import React, { useState } from 'react';
import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import {
    SparklesIcon,
    PlusIcon,
    TrashIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    ClockIcon,
    AcademicCapIcon,
    UserIcon,
    BookOpenIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    FunnelIcon,
    CheckBadgeIcon,
    PencilSquareIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

interface AcademicClass {
    id: number;
    name: string;
}

interface Teacher {
    id: number;
    name: string;
}

interface Subject {
    id: number;
    name: string;
    code: string;
}

interface TeachingAssignment {
    id: number;
    academic_class_id: number;
    subject_id: number;
    teacher_id: number;
    total_hours: number;
    max_hours_per_day: number;
    allowed_days?: string[] | null;
    academic_class?: AcademicClass;
    subject?: Subject;
    teacher?: Teacher;
}

interface TeacherUnavailability {
    id: number;
    teacher_id: number;
    day: string;
    slot_index: number | null;
    reason: string | null;
    teacher?: Teacher;
}

interface LessonHourSlot {
    label: string;
    start: string;
    end: string;
}

interface LessonHoursMap {
    [key: string]: LessonHourSlot[];
}

interface GeneratedScheduleItem {
    class_id: number;
    class_name: string;
    teacher_id: number;
    teacher_name: string;
    subject: string;
    subject_id: number;
    day: string;
    start_time: string;
    end_time: string;
    start_slot: number;
    end_slot: number;
    duration: number;
    slot_label: string;
}

interface Props extends PageProps {
    assignments: TeachingAssignment[];
    unavailabilities: TeacherUnavailability[];
    classes: AcademicClass[];
    teachers: Teacher[];
    subjects: Subject[];
    lesson_hours: LessonHoursMap;
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

const SUBJECT_COLORS = [
    'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
    'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300',
    'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300',
    'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300',
    'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300',
    'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300',
    'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-900/30 dark:border-cyan-800 dark:text-cyan-300',
    'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300',
];

export default function ScheduleGeneratorIndex({
    auth,
    assignments,
    unavailabilities,
    classes,
    teachers,
    subjects,
    lesson_hours,
}: Props) {
    const [activeTab, setActiveTab] = useState<'assignments' | 'unavailabilities' | 'generator'>('generator');

    // Filter state for assignments tab
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
    const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');

    // Modals
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
    const [showUnavailabilityModal, setShowUnavailabilityModal] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(false);

    // Generator state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationResult, setGenerationResult] = useState<{
        success: boolean;
        message: string;
        schedules: GeneratedScheduleItem[];
        placed_count: number;
        total_count: number;
        unplaced: any[];
        stats?: { steps: number; efficiency: string };
    } | null>(null);

    // Grid View Filter in Generator Tab
    const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
    const [selectedViewTarget, setSelectedViewTarget] = useState<number | 'all'>('all');
    const [isApplying, setIsApplying] = useState(false);

    // Assignment Form
    const assignmentForm = useForm({
        academic_class_id: classes[0]?.id || '',
        subject_id: subjects[0]?.id || '',
        teacher_id: teachers[0]?.id || '',
        total_hours: 2,
        max_hours_per_day: 2,
        allowed_days: [] as string[],
    });

    // Batch Assign Form (Atur Guru Per Mapel Sekaligus)
    const batchForm = useForm({
        subject_id: subjects[0]?.id || '',
        teacher_id: teachers[0]?.id || '',
    });

    // Unavailability Form
    const unavailabilityForm = useForm({
        teacher_id: teachers[0]?.id || '',
        day: 'monday',
        slot_index: '',
        reason: '',
    });

    const handleSaveAssignment = (e: React.FormEvent) => {
        e.preventDefault();
        assignmentForm.post(route('admin.schedule-generator.assignments.store'), {
            onSuccess: () => {
                setShowAssignmentModal(false);
                assignmentForm.reset();
            },
        });
    };

    const handleEditAssignment = (assignment: TeachingAssignment) => {
        assignmentForm.setData({
            academic_class_id: assignment.academic_class_id,
            subject_id: assignment.subject_id,
            teacher_id: assignment.teacher_id,
            total_hours: assignment.total_hours,
            max_hours_per_day: assignment.max_hours_per_day,
            allowed_days: assignment.allowed_days || [],
        });
        setShowAssignmentModal(true);
    };

    const handleQuickChangeTeacher = (assignment: TeachingAssignment, newTeacherId: number) => {
        router.post(route('admin.schedule-generator.assignments.store'), {
            academic_class_id: assignment.academic_class_id,
            subject_id: assignment.subject_id,
            teacher_id: newTeacherId,
            total_hours: assignment.total_hours,
            max_hours_per_day: assignment.max_hours_per_day,
            allowed_days: assignment.allowed_days || [],
        }, {
            preserveScroll: true,
        });
    };

    const handleDeleteAssignment = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus alokasi jam mengajar ini?')) {
            router.delete(route('admin.schedule-generator.assignments.destroy', id));
        }
    };

    const handleAutoPopulate = () => {
        if (confirm('Sistem akan membuat alokasi otomatis berdasarkan daftar mata pelajaran yang terhubung ke setiap kelas. Lanjutkan?')) {
            router.post(route('admin.schedule-generator.auto-populate'));
        }
    };

    const handleReassignEvenly = () => {
        if (confirm('Bagi rata mata pelajaran ke seluruh guru yang terdaftar secara merata (round-robin)? Semua kelas akan diperbarui guru pengampunya.')) {
            router.post(route('admin.schedule-generator.auto-populate'), { reassign_teachers: true });
        }
    };

    const handleClearAllAssignments = () => {
        if (confirm('Kosongkan semua alokasi mengajar saat ini? Data yang terhapus bisa diisi kembali dengan tombol Isi Otomatis.')) {
            router.post(route('admin.schedule-generator.clear'));
        }
    };

    const handleBatchAssignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        batchForm.post(route('admin.schedule-generator.batch-assign'), {
            onSuccess: () => {
                setShowBatchAssignModal(false);
            },
        });
    };

    const handleSaveUnavailability = (e: React.FormEvent) => {
        e.preventDefault();
        unavailabilityForm.post(route('admin.schedule-generator.unavailabilities.store'), {
            onSuccess: () => {
                setShowUnavailabilityModal(false);
                unavailabilityForm.reset();
            },
        });
    };

    const handleDeleteUnavailability = (id: number) => {
        if (confirm('Hapus preferensi ketidaksediaan ini?')) {
            router.delete(route('admin.schedule-generator.unavailabilities.destroy', id));
        }
    };

    // Run Automatic Scheduling Generator
    const runGenerator = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(route('admin.schedule-generator.generate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    class_ids: [],
                }),
            });
            const data = await response.json();
            setGenerationResult(data);
            if (data.schedules && data.schedules.length > 0) {
                // Default target view to the first class
                if (viewMode === 'class' && classes.length > 0) {
                    setSelectedViewTarget(classes[0].id);
                }
            }
        } catch (error) {
            alert('Terjadi kesalahan saat menjalankan generator jadwal.');
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Apply to official schedules
    const applyToOfficial = async () => {
        if (!generationResult || !generationResult.schedules) return;
        setIsApplying(true);
        try {
            const response = await fetch(route('admin.schedule-generator.apply'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    schedules: generationResult.schedules,
                    class_ids: [],
                }),
            });
            const data = await response.json();
            if (data.success) {
                setShowApplyModal(false);
                alert(data.message);
                router.visit(route('admin.schedules.index'));
            } else {
                alert('Gagal menerapkan jadwal.');
            }
        } catch (error) {
            alert('Terjadi kesalahan saat menerapkan jadwal ke sistem.');
            console.error(error);
        } finally {
            setIsApplying(false);
        }
    };

    // Filtered assignments
    const filteredAssignments = assignments.filter((a) => {
        const matchClass = selectedClassFilter === 'all' || a.academic_class_id.toString() === selectedClassFilter;
        const matchTeacher = selectedTeacherFilter === 'all' || a.teacher_id.toString() === selectedTeacherFilter;
        return matchClass && matchTeacher;
    });

    const totalJP = assignments.reduce((acc, curr) => acc + curr.total_hours, 0);

    // Filter generated items for matrix
    const visibleGeneratedSchedules = (generationResult?.schedules || []).filter((item) => {
        if (selectedViewTarget === 'all') return true;
        if (viewMode === 'class') {
            return item.class_id === selectedViewTarget;
        } else {
            return item.teacher_id === selectedViewTarget;
        }
    });

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <SparklesIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            Auto Generator Jadwal Guru & Kelas
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Sistem penjadwalan cerdas bebas bentrok (CSP Constraint Solver) terintegrasi langsung ke KBM SALIRA
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.visit(route('admin.schedules.index'))}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                        >
                            <CalendarDaysIcon className="w-4 h-4" />
                            Lihat Jadwal Resmi
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Auto Generator Jadwal Pelajaran" />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Alokasi</span>
                            <BookOpenIcon className="w-5 h-5 text-indigo-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{assignments.length}</p>
                        <p className="text-xs text-slate-500 mt-1">Mata pelajaran kelas teralokasi</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Beban Jam</span>
                            <ClockIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{totalJP} <span className="text-sm font-normal text-slate-400">JP</span></p>
                        <p className="text-xs text-slate-500 mt-1">Total jam pelajaran per minggu</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Guru Pengampu</span>
                            <UserIcon className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{new Set(assignments.map(a => a.teacher_id)).size}</p>
                        <p className="text-xs text-slate-500 mt-1">Dari {teachers.length} guru terdaftar</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kelas Tercover</span>
                            <AcademicCapIcon className="w-5 h-5 text-cyan-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{new Set(assignments.map(a => a.academic_class_id)).size} / {classes.length}</p>
                        <p className="text-xs text-slate-500 mt-1">Rombel aktif terlayani</p>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm flex flex-wrap gap-1">
                    <button
                        onClick={() => setActiveTab('generator')}
                        className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                            activeTab === 'generator'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <SparklesIcon className="w-4 h-4" />
                        1. Generator & Simulasi Jadwal
                    </button>
                    <button
                        onClick={() => setActiveTab('assignments')}
                        className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                            activeTab === 'assignments'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <BookOpenIcon className="w-4 h-4" />
                        2. Alokasi Mengajar (SKBM)
                    </button>
                    <button
                        onClick={() => setActiveTab('unavailabilities')}
                        className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                            activeTab === 'unavailabilities'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <ClockIcon className="w-4 h-4" />
                        3. Batasan / Preferensi Guru ({unavailabilities.length})
                    </button>
                </div>

                {/* TAB 1: GENERATOR & SIMULASI */}
                {activeTab === 'generator' && (
                    <div className="space-y-6">
                        {/* Control Box */}
                        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                            
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                <div className="space-y-2 max-w-2xl">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold text-indigo-200">
                                        <CheckBadgeIcon className="w-4 h-4 text-emerald-400" />
                                        CSP Backtracking Engine Ready
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight">Generate Seluruh Jadwal dalam Hitungan Detik</h3>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        Algoritma akan menempatkan seluruh jam mengajar guru ke dalam slot waktu hari aktif sekolah, memastikan 0 bentrok guru dan 0 bentrok kelas.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                    <button
                                        onClick={runGenerator}
                                        disabled={isGenerating || assignments.length === 0}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 transition active:scale-95"
                                    >
                                        <ArrowPathIcon className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                                        {isGenerating ? 'Menghitung Solusi...' : 'Jalankan Auto Generator'}
                                    </button>

                                    {generationResult && generationResult.schedules.length > 0 && (
                                        <button
                                            onClick={() => setShowApplyModal(true)}
                                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl shadow-lg transition active:scale-95"
                                        >
                                            <CheckCircleIcon className="w-5 h-5 text-indigo-600" />
                                            Terapkan ke Jadwal Resmi
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Result Banner */}
                            {generationResult && (
                                <div className="mt-6 pt-6 border-t border-indigo-700/50 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {generationResult.success ? (
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
                                                <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center">
                                                <ExclamationTriangleIcon className="w-6 h-6 text-amber-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-white text-base">{generationResult.message}</p>
                                            <p className="text-xs text-indigo-200">
                                                Ditempatkan: {generationResult.placed_count} dari {generationResult.total_count} sesi pertemuan
                                                {generationResult.stats && ` • Efisiensi: ${generationResult.stats.efficiency} (${generationResult.stats.steps} langkah)`}
                                            </p>
                                        </div>
                                    </div>

                                    {generationResult.unplaced.length > 0 && (
                                        <div className="text-xs bg-amber-500/20 border border-amber-400/40 rounded-xl px-3 py-2 text-amber-200">
                                            Perhatian: Ada {generationResult.unplaced.length} sesi yang kekurangan slot jam kosong.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Visual Timetable Grid Matrix */}
                        {generationResult && generationResult.schedules.length > 0 ? (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                                            <button
                                                onClick={() => {
                                                    setViewMode('class');
                                                    if (classes[0]) setSelectedViewTarget(classes[0].id);
                                                }}
                                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                                    viewMode === 'class'
                                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                                                }`}
                                            >
                                                Tampilan Per Kelas
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setViewMode('teacher');
                                                    if (teachers[0]) setSelectedViewTarget(teachers[0].id);
                                                }}
                                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                                    viewMode === 'teacher'
                                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                                                }`}
                                            >
                                                Tampilan Per Guru
                                            </button>
                                        </div>

                                        <select
                                            value={selectedViewTarget}
                                            onChange={(e) => setSelectedViewTarget(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                            className="text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 py-1.5 px-3 focus:ring-indigo-500"
                                        >
                                            <option value="all">Semua {viewMode === 'class' ? 'Kelas' : 'Guru'}</option>
                                            {viewMode === 'class'
                                                ? classes.map((c) => (
                                                      <option key={c.id} value={c.id}>
                                                          {c.name}
                                                      </option>
                                                  ))
                                                : teachers.map((t) => (
                                                      <option key={t.id} value={t.id}>
                                                          {t.name}
                                                      </option>
                                                  ))}
                                        </select>
                                    </div>

                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                        {visibleGeneratedSchedules.length} Sesi Terjadwal
                                    </div>
                                </div>

                                {/* Matrix View */}
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px] grid grid-cols-7 gap-3">
                                        {DAY_OPTIONS.map((dayObj) => {
                                            const daySchedules = visibleGeneratedSchedules.filter((s) => s.day === dayObj.value);
                                            const daySlots = lesson_hours[dayObj.value] || [];

                                            return (
                                                <div key={dayObj.value} className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800">
                                                    <div className="text-center pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-700">
                                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{dayObj.label}</span>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">{daySlots.length} Jam Pelajaran</p>
                                                    </div>

                                                    <div className="space-y-2 min-h-[300px]">
                                                        {daySchedules.length === 0 ? (
                                                            <div className="h-40 flex items-center justify-center text-[11px] text-slate-400 italic">
                                                                Kosong / Libur
                                                            </div>
                                                        ) : (
                                                            daySchedules
                                                                .sort((a, b) => a.start_slot - b.start_slot)
                                                                .map((item, idx) => {
                                                                    const color = SUBJECT_COLORS[item.subject_id % SUBJECT_COLORS.length];
                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            className={`p-2.5 rounded-xl border transition shadow-xs hover:shadow-md ${color}`}
                                                                        >
                                                                            <div className="flex items-center justify-between text-[10px] font-semibold opacity-75 mb-1">
                                                                                <span>{item.start_time} - {item.end_time}</span>
                                                                                <span className="px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-black/20 text-[9px] font-bold">
                                                                                    {item.duration} JP
                                                                                </span>
                                                                            </div>
                                                                            <p className="font-bold text-xs leading-tight line-clamp-1">{item.subject}</p>
                                                                            <p className="text-[11px] mt-1 opacity-90 truncate">
                                                                                {viewMode === 'class' ? (
                                                                                    <span>👤 {item.teacher_name}</span>
                                                                                ) : (
                                                                                    <span>🏫 {item.class_name}</span>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                                    <SparklesIcon className="w-8 h-8" />
                                </div>
                                <div className="max-w-md mx-auto space-y-1">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Belum Ada Hasil Simulasi Jadwal</h4>
                                    <p className="text-sm text-slate-500">
                                        Klik tombol <strong>"Jalankan Auto Generator"</strong> di atas untuk memulai algoritma penempatan jadwal otomatis.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: ALOKASI MENGAJAR (SKBM) */}
                {activeTab === 'assignments' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Alokasi Mengajar Guru (SKBM)</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Daftar beban jam pelajaran tiap guru dan mata pelajaran per rombel kelas</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={handleReassignEvenly}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs"
                                    title="Membagi mata pelajaran secara seimbang ke seluruh guru"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    Bagi Guru Merata (Otomatis)
                                </button>
                                <button
                                    onClick={() => setShowBatchAssignModal(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs"
                                    title="Tetapkan 1 guru untuk 1 mata pelajaran di semua kelas sekaligus"
                                >
                                    <UserGroupIcon className="w-3.5 h-3.5" />
                                    Atur Guru Per Mapel
                                </button>
                                <button
                                    onClick={handleAutoPopulate}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs"
                                >
                                    <ArrowPathIcon className="w-3.5 h-3.5" />
                                    Isi Otomatis
                                </button>
                                <button
                                    onClick={handleClearAllAssignments}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                    title="Kosongkan seluruh alokasi"
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => {
                                        assignmentForm.reset();
                                        setShowAssignmentModal(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Tambah Alokasi
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <FunnelIcon className="w-4 h-4" /> Filter:
                            </div>
                            <select
                                value={selectedClassFilter}
                                onChange={(e) => setSelectedClassFilter(e.target.value)}
                                className="text-xs rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-1.5 px-3"
                            >
                                <option value="all">Semua Kelas ({classes.length})</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id.toString()}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={selectedTeacherFilter}
                                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                                className="text-xs rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-1.5 px-3"
                            >
                                <option value="all">Semua Guru ({teachers.length})</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id.toString()}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>

                            <div className="ml-auto text-xs text-slate-400">
                                Menampilkan {filteredAssignments.length} dari {assignments.length} alokasi
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                                    <tr>
                                        <th className="py-3 px-4">Kelas</th>
                                        <th className="py-3 px-4">Mata Pelajaran</th>
                                        <th className="py-3 px-4">Guru Pengampu</th>
                                        <th className="py-3 px-4 text-center">Total JP/Minggu</th>
                                        <th className="py-3 px-4 text-center">Maks JP/Hari</th>
                                        <th className="py-3 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredAssignments.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                Belum ada alokasi mengajar yang sesuai filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAssignments.map((a) => (
                                            <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                    {a.academic_class?.name || `Kelas #${a.academic_class_id}`}
                                                </td>
                                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                                    <span className="font-medium">{a.subject?.name}</span>
                                                    {a.subject?.code && (
                                                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                            {a.subject.code}
                                                        </span>
                                                    )}
                                                    {a.allowed_days && a.allowed_days.length > 0 && (
                                                        <div className="mt-1">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                                                                📅 Hanya: {a.allowed_days.map(d => DAY_OPTIONS.find(x => x.value === d)?.label || d).join(', ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-medium min-w-[200px]">
                                                    <select
                                                        value={a.teacher_id}
                                                        onChange={(e) => handleQuickChangeTeacher(a, Number(e.target.value))}
                                                        className="w-full text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-1.5 px-2.5 focus:ring-2 focus:ring-indigo-500 shadow-xs transition"
                                                        title="Klik untuk langsung ganti guru pengampu"
                                                    >
                                                        {teachers.map((t) => (
                                                            <option key={t.id} value={t.id}>
                                                                {t.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                                                        {a.total_hours} JP
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-500">
                                                    {a.max_hours_per_day} JP / sesi
                                                </td>
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleEditAssignment(a)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition"
                                                            title="Edit Detail & Batasan Hari"
                                                        >
                                                            <PencilSquareIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAssignment(a.id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                                                            title="Hapus Alokasi"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: PREFERENSI GURU (UNAVAILABILITIES) */}
                {activeTab === 'unavailabilities' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Batasan / Ketidaksediaan Guru</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Tentukan hari atau jam tertentu di mana seorang guru tidak dapat dijadwalkan (misal: guru honorer/part-time)
                                </p>
                            </div>

                            <button
                                onClick={() => setShowUnavailabilityModal(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Tambah Ketidaksediaan Guru
                            </button>
                        </div>

                        {unavailabilities.length === 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
                                <ClockIcon className="w-8 h-8 text-slate-400 mx-auto" />
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Belum Ada Batasan Waktu Khusus</p>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                    Semua guru diasumsikan siap mengajar di semua slot jam KBM aktif sekolah.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {unavailabilities.map((u) => {
                                    const dayName = DAY_OPTIONS.find((d) => d.value === u.day)?.label || u.day;
                                    return (
                                        <div
                                            key={u.id}
                                            className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between"
                                        >
                                            <div className="space-y-1">
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{u.teacher?.name}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold">
                                                        {dayName}
                                                    </span>
                                                    <span>{u.slot_index === null ? 'Sepanjang Hari' : `Jam ke-${u.slot_index + 1}`}</span>
                                                </div>
                                                {u.reason && <p className="text-[11px] text-slate-400 italic">Alasan: {u.reason}</p>}
                                            </div>

                                            <button
                                                onClick={() => handleDeleteUnavailability(u.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                                                title="Hapus Batasan"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL: TAMBAH ALOKASI MENGAJAR */}
            {showAssignmentModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Tambah Alokasi Jam Mengajar (SKBM)</h3>
                            <button onClick={() => setShowAssignmentModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Kelas</label>
                                <select
                                    value={assignmentForm.data.academic_class_id}
                                    onChange={(e) => assignmentForm.setData('academic_class_id', Number(e.target.value))}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2"
                                    required
                                >
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mata Pelajaran</label>
                                <select
                                    value={assignmentForm.data.subject_id}
                                    onChange={(e) => assignmentForm.setData('subject_id', Number(e.target.value))}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2"
                                    required
                                >
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} {s.code ? `(${s.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Guru Pengampu</label>
                                <select
                                    value={assignmentForm.data.teacher_id}
                                    onChange={(e) => assignmentForm.setData('teacher_id', Number(e.target.value))}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2"
                                    required
                                >
                                    {teachers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total JP/Minggu</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="15"
                                        value={assignmentForm.data.total_hours}
                                        onChange={(e) => assignmentForm.setData('total_hours', Number(e.target.value))}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2"
                                        required
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Misal: 4 JP</p>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Maks JP / Pertemuan</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="6"
                                        value={assignmentForm.data.max_hours_per_day}
                                        onChange={(e) => assignmentForm.setData('max_hours_per_day', Number(e.target.value))}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2"
                                        required
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Misal: 2 JP (dipecah 2x2)</p>
                                </div>
                            </div>

                            {/* Batasan Hari Khusus (Kondisi Khusus: Sabtu / Minggu / Hari Tertentu) */}
                            <div className="pt-1">
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Kondisi Khusus Hari Mengajar (Opsional)
                                </label>
                                <p className="text-[10px] text-slate-400 mb-2">
                                    Pilih hari jika guru/mapel ini <strong>hanya bisa</strong> dijadwalkan pada hari tertentu (misal: hanya Sabtu atau Minggu). Kosongkan jika bebas di semua hari KBM.
                                </p>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                                    {DAY_OPTIONS.map((d) => {
                                        const isChecked = assignmentForm.data.allowed_days.includes(d.value);
                                        return (
                                            <button
                                                type="button"
                                                key={d.value}
                                                onClick={() => {
                                                    const cur = [...assignmentForm.data.allowed_days];
                                                    if (isChecked) {
                                                        assignmentForm.setData('allowed_days', cur.filter(x => x !== d.value));
                                                    } else {
                                                        assignmentForm.setData('allowed_days', [...cur, d.value]);
                                                    }
                                                }}
                                                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition text-center ${
                                                    isChecked
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignmentModal(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={assignmentForm.processing}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm"
                                >
                                    Simpan Alokasi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: TAMBAH UNAVAILABILITY */}
            {showUnavailabilityModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Batasan Jadwal Guru</h3>
                            <button onClick={() => setShowUnavailabilityModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveUnavailability} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Guru</label>
                                <select
                                    value={unavailabilityForm.data.teacher_id}
                                    onChange={(e) => unavailabilityForm.setData('teacher_id', Number(e.target.value))}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2"
                                    required
                                >
                                    {teachers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hari Berhalangan</label>
                                    <select
                                        value={unavailabilityForm.data.day}
                                        onChange={(e) => unavailabilityForm.setData('day', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2"
                                        required
                                    >
                                        {DAY_OPTIONS.map((d) => (
                                            <option key={d.value} value={d.value}>
                                                {d.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Slot Jam</label>
                                    <select
                                        value={unavailabilityForm.data.slot_index}
                                        onChange={(e) => unavailabilityForm.setData('slot_index', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2"
                                    >
                                        <option value="">Sepanjang Hari</option>
                                        {Array.from({ length: 10 }).map((_, idx) => (
                                            <option key={idx} value={idx}>
                                                Jam ke-{idx + 1}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Alasan (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Mengajar di kampus lain / jadwal dinas luar"
                                    value={unavailabilityForm.data.reason}
                                    onChange={(e) => unavailabilityForm.setData('reason', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowUnavailabilityModal(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={unavailabilityForm.processing}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm"
                                >
                                    Simpan Batasan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: KONFIRMASI TERAPKAN KE JADWAL RESMI */}
            {showApplyModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <CheckCircleIcon className="w-7 h-7" />
                        </div>

                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Terapkan ke Jadwal Resmi Sekolah?</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Tindakan ini akan menyimpan sebanyak <strong>{generationResult?.schedules.length || 0} jadwal</strong> hasil generate ke tabel utama <code>schedules</code>.
                                Jadwal ini otomatis akan langsung tampil di menu <strong>Jadwal Pelajaran</strong>, absensi guru, jurnal KBM harian, dan portal siswa.
                            </p>
                        </div>

                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                            <strong>Catatan:</strong> Jadwal pelajaran resmi yang sudah ada sebelumnya akan diperbarui dengan hasil generate ini.
                        </div>

                        <div className="flex justify-end gap-2 pt-3">
                            <button
                                type="button"
                                onClick={() => setShowApplyModal(false)}
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={applyToOfficial}
                                disabled={isApplying}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md flex items-center gap-2"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${isApplying ? 'animate-spin' : ''}`} />
                                {isApplying ? 'Menerapkan...' : 'Ya, Terapkan Sekarang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ATUR GURU PER MAPEL (MASAL) */}
            {showBatchAssignModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Atur Guru Pengampu Masal</h3>
                            <button onClick={() => setShowBatchAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                            Pilih mata pelajaran dan guru pengampu. Tindakan ini akan <strong>menetapkan guru ini untuk mata pelajaran tersebut di seluruh kelas</strong> secara instan.
                        </p>

                        <form onSubmit={handleBatchAssignSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mata Pelajaran Target</label>
                                <select
                                    value={batchForm.data.subject_id}
                                    onChange={(e) => batchForm.setData('subject_id', Number(e.target.value))}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2 font-medium"
                                    required
                                >
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} {s.code ? `(${s.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Guru yang Ditetapkan</label>
                                <select
                                    value={batchForm.data.teacher_id}
                                    onChange={(e) => batchForm.setData('teacher_id', Number(e.target.value))}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 py-2 font-medium"
                                    required
                                >
                                    {teachers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBatchAssignModal(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={batchForm.processing}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm"
                                >
                                    Terapkan ke Semua Kelas
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
