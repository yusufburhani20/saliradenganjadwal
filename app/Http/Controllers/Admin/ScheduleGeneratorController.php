<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicClass;
use App\Models\Subject;
use App\Models\User;
use App\Models\TeachingAssignment;
use App\Models\TeacherUnavailability;
use App\Models\TeacherScheduleConstraint;
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
        $constraints = TeacherScheduleConstraint::with('teacher')->get();
        $classes = AcademicClass::orderBy('name')->get(['id', 'name']);
        $teachers = User::whereHas('roles', fn($q) => $q->whereIn('name', ['Guru', 'Super Admin', 'Wali Kelas', 'Kepala Program', 'Kepala Sekolah']))
            ->orderBy('name')
            ->get(['id', 'name']);
        $subjects = Subject::orderBy('name')->get(['id', 'name', 'code']);
        $lessonHours = json_decode(Setting::get('lesson_hours_by_day', '{}'), true) ?: [];
        $labs = \App\Models\ComputerLab::orderBy('name')->pluck('name');

        return Inertia::render('Admin/ScheduleGenerator/Index', [
            'assignments' => $assignments,
            'unavailabilities' => $unavailabilities,
            'constraints' => $constraints,
            'classes' => $classes,
            'teachers' => $teachers,
            'subjects' => $subjects,
            'lesson_hours' => $lessonHours,
            'labs' => $labs,
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
            'allowed_days' => 'nullable|array',
            'room' => 'nullable|string|max:50',
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
                'allowed_days' => $request->input('allowed_days') ?: null,
                'room' => $request->input('room') ?: null,
            ]
        );

        return back()->with('success', 'Alokasi jam mengajar guru berhasil disimpan.');
    }

    public function destroyAssignment(TeachingAssignment $assignment)
    {
        $assignment->delete();
        return back()->with('success', 'Alokasi mengajar berhasil dihapus.');
    }

    public function autoPopulateFromClasses(Request $request)
    {
        $classes = AcademicClass::with('subjects')->get();
        $teachers = User::whereHas('roles', fn($q) => $q->whereIn('name', ['Guru', 'Super Admin', 'Wali Kelas', 'Kepala Program', 'Kepala Sekolah']))->get();

        if ($teachers->isEmpty()) {
            return back()->with('error', 'Tidak ditemukan data guru aktif di sistem.');
        }

        // Petakan tiap mapel ke guru yang berbeda secara merata (round-robin by subject)
        $subjectTeacherMap = [];
        $teacherIndex = 0;
        $allSubjects = Subject::orderBy('id')->get();
        foreach ($allSubjects as $sub) {
            $subjectTeacherMap[$sub->id] = $teachers[$teacherIndex % $teachers->count()]->id;
            $teacherIndex++;
        }

        $count = 0;
        foreach ($classes as $class) {
            foreach ($class->subjects as $subject) {
                $assignedTeacherId = $subjectTeacherMap[$subject->id] ?? $teachers[0]->id;

                $assignment = TeachingAssignment::where('academic_class_id', $class->id)
                    ->where('subject_id', $subject->id)
                    ->first();

                if (!$assignment) {
                    TeachingAssignment::create([
                        'academic_class_id' => $class->id,
                        'subject_id' => $subject->id,
                        'teacher_id' => $assignedTeacherId,
                        'total_hours' => 2,
                        'max_hours_per_day' => 2,
                    ]);
                    $count++;
                } else if ($request->boolean('reassign_teachers')) {
                    // Jika diminta reset pembagian guru secara merata
                    $assignment->update([
                        'teacher_id' => $assignedTeacherId,
                    ]);
                    $count++;
                }
            }
        }

        return back()->with('success', "Berhasil memetakan {$count} alokasi dengan pembagian guru secara merata.");
    }

    public function batchAssignTeacher(Request $request)
    {
        $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'teacher_id' => 'required|exists:users,id',
        ]);

        $updated = TeachingAssignment::where('subject_id', $request->subject_id)
            ->update(['teacher_id' => $request->teacher_id]);

        return back()->with('success', "Berhasil menetapkan guru pengampu untuk {$updated} kelas.");
    }

    public function clearAssignments()
    {
        TeachingAssignment::truncate();
        return back()->with('success', 'Seluruh data alokasi mengajar berhasil dikosongkan.');
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

    public function storeConstraint(Request $request)
    {
        $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'max_days_per_week' => 'nullable|integer|min:1|max:6',
            'max_hours_per_day' => 'nullable|integer|min:1|max:12',
        ], [
            'teacher_id.required' => 'Guru wajib dipilih.',
            'max_days_per_week.min' => 'Maksimal hari mengajar minimal 1 hari.',
            'max_days_per_week.max' => 'Maksimal hari mengajar maksimal 6 hari.',
        ]);

        TeacherScheduleConstraint::updateOrCreate(
            ['teacher_id' => $request->teacher_id],
            [
                'max_days_per_week' => $request->input('max_days_per_week') ?: null,
                'max_hours_per_day' => $request->input('max_hours_per_day') ?: null,
            ]
        );

        return back()->with('success', 'Batasan kuota hari & jam guru berhasil disimpan.');
    }

    public function destroyConstraint(TeacherScheduleConstraint $constraint)
    {
        $constraint->delete();
        return back()->with('success', 'Batasan kuota guru berhasil dihapus.');
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

    public function importAsc(Request $request, \App\Services\AscTimetableImporterService $importer)
    {
        $request->validate([
            'xml_file' => 'required|file|max:10240',
            'scope' => 'nullable|string|in:smk,all',
            'apply_schedules' => 'nullable',
        ], [
            'xml_file.required' => 'File XML aSc TimeTables wajib diunggah.',
            'xml_file.max' => 'Ukuran file maksimal 10 MB.',
        ]);

        $scope = $request->input('scope', 'smk');
        $applySchedules = $request->boolean('apply_schedules', true);

        $xmlContent = file_get_contents($request->file('xml_file')->getRealPath());
        $result = $importer->import($xmlContent, $scope, $applySchedules);

        if (!$result['success']) {
            return back()->with('error', $result['message']);
        }

        $stats = $result['stats'];
        $msg = "Import aSc TimeTables (" . $stats['scope'] . ") berhasil! "
            . "{$stats['teachers_count']} Guru, {$stats['subjects_count']} Mapel, "
            . "{$stats['assignments_count']} Alokasi SKBM, dan {$stats['schedules_count']} Jadwal Resmi telah disinkronkan.";

        return back()->with('success', $msg);
    }
}
