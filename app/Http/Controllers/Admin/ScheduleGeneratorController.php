<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicClass;
use App\Models\Subject;
use App\Models\User;
use App\Models\TeachingAssignment;
use App\Models\TeacherUnavailability;
use App\Models\Setting;
use App\Services\ScheduleGeneratorService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScheduleGeneratorController extends Controller
{
    protected ScheduleGeneratorService $generatorService;

    public function __construct(ScheduleGeneratorService $generatorService)
    {
        $this->generatorService = $generatorService;
    }

    public function index()
    {
        $assignments = TeachingAssignment::with(['academicClass', 'subject', 'teacher'])
            ->get()
            ->sortBy([
                fn($a, $b) => ($a->academicClass->name ?? '') <=> ($b->academicClass->name ?? ''),
                fn($a, $b) => ($a->subject->name ?? '') <=> ($b->subject->name ?? ''),
            ])
            ->values();

        $unavailabilities = TeacherUnavailability::with('teacher')->get();
        $classes = AcademicClass::orderBy('name')->get(['id', 'name']);
        $teachers = User::whereHas('roles', fn($q) => $q->whereIn('name', ['Guru', 'Super Admin', 'Wali Kelas', 'Kepala Program', 'Kepala Sekolah']))
            ->orderBy('name')
            ->get(['id', 'name']);
        $subjects = Subject::orderBy('name')->get(['id', 'name', 'code']);
        $lessonHours = json_decode(Setting::get('lesson_hours_by_day', '{}'), true) ?: [];

        return Inertia::render('Admin/ScheduleGenerator/Index', [
            'assignments' => $assignments,
            'unavailabilities' => $unavailabilities,
            'classes' => $classes,
            'teachers' => $teachers,
            'subjects' => $subjects,
            'lesson_hours' => $lessonHours,
        ]);
    }

    public function storeAssignment(Request $request)
    {
        $request->validate([
            'academic_class_id' => 'required|exists:academic_classes,id',
            'subject_id' => 'required|exists:subjects,id',
            'teacher_id' => 'required|exists:users,id',
            'total_hours' => 'required|integer|min:1|max:20',
            'max_hours_per_day' => 'required|integer|min:1|max:6',
        ], [
            'academic_class_id.required' => 'Kelas wajib dipilih.',
            'subject_id.required' => 'Mata pelajaran wajib dipilih.',
            'teacher_id.required' => 'Guru wajib dipilih.',
            'total_hours.required' => 'Jumlah JP per minggu wajib diisi.',
            'max_hours_per_day.required' => 'Maksimal JP per hari wajib diisi.',
        ]);

        TeachingAssignment::updateOrCreate(
            [
                'academic_class_id' => $request->academic_class_id,
                'subject_id' => $request->subject_id,
            ],
            [
                'teacher_id' => $request->teacher_id,
                'total_hours' => $request->total_hours,
                'max_hours_per_day' => $request->max_hours_per_day,
            ]
        );

        return back()->with('success', 'Alokasi jam mengajar guru berhasil disimpan.');
    }

    public function destroyAssignment(TeachingAssignment $assignment)
    {
        $assignment->delete();
        return back()->with('success', 'Alokasi mengajar berhasil dihapus.');
    }

    public function autoPopulateFromClasses()
    {
        $classes = AcademicClass::with('subjects')->get();
        $defaultTeacher = User::whereHas('roles', fn($q) => $q->whereIn('name', ['Guru', 'Super Admin', 'Wali Kelas', 'Kepala Program', 'Kepala Sekolah']))->first();

        if (!$defaultTeacher) {
            return back()->with('error', 'Tidak ditemukan data guru aktif di sistem.');
        }

        $count = 0;
        foreach ($classes as $class) {
            foreach ($class->subjects as $subject) {
                $exists = TeachingAssignment::where('academic_class_id', $class->id)
                    ->where('subject_id', $subject->id)
                    ->exists();

                if (!$exists) {
                    TeachingAssignment::create([
                        'academic_class_id' => $class->id,
                        'subject_id' => $subject->id,
                        'teacher_id' => $defaultTeacher->id,
                        'total_hours' => 2,
                        'max_hours_per_day' => 2,
                    ]);
                    $count++;
                }
            }
        }

        return back()->with('success', "Berhasil membuat {$count} alokasi awal dari daftar mata pelajaran kelas.");
    }

    public function storeUnavailability(Request $request)
    {
        $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'day' => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'slot_index' => 'nullable|integer|min:0',
            'reason' => 'nullable|string|max:255',
        ]);

        TeacherUnavailability::create([
            'teacher_id' => $request->teacher_id,
            'day' => $request->day,
            'slot_index' => $request->slot_index,
            'reason' => $request->reason,
        ]);

        return back()->with('success', 'Preferensi ketidaksediaan guru berhasil ditambahkan.');
    }

    public function destroyUnavailability(TeacherUnavailability $unavailability)
    {
        $unavailability->delete();
        return back()->with('success', 'Data ketidaksediaan berhasil dihapus.');
    }

    public function runGenerate(Request $request)
    {
        $classIds = $request->input('class_ids', []);
        $result = $this->generatorService->generate($classIds);

        return response()->json($result);
    }

    public function applySchedules(Request $request)
    {
        $request->validate([
            'schedules' => 'required|array',
            'class_ids' => 'nullable|array',
        ]);

        $schedules = $request->input('schedules', []);
        $classIds = $request->input('class_ids', []);

        $saved = $this->generatorService->applyToOfficialSchedules($schedules, $classIds);

        return response()->json([
            'success' => true,
            'message' => "Sebanyak {$saved} jadwal pelajaran resmi berhasil diterapkan dan tersimpan ke sistem!",
        ]);
    }
}
