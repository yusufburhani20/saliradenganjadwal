<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\AcademicClass;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    public function index()
    {
        $schedules = Schedule::with(['academicClass', 'teacher'])
            ->orderByRaw("FIELD(day, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday')")
            ->orderBy('start_time')
            ->get();

        $classes = AcademicClass::orderBy('name')->get(['id', 'name']);
        $teachers = User::whereHas('roles', fn($q) => $q->whereIn('name', ['Guru', 'Super Admin', 'Wali Kelas', 'Kepala Program', 'Kepala Sekolah']))
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/Schedules/Index', [
            'schedules' => $schedules,
            'classes'   => $classes,
            'teachers'  => $teachers,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'class_id'   => 'required|exists:academic_classes,id',
            'teacher_id' => 'required|exists:users,id',
            'subject'    => 'required|string|max:255',
            'day'        => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'start_time' => 'required|date_format:H:i',
            'end_time'   => 'required|date_format:H:i|after:start_time',
        ], [
            'class_id.required'   => 'Kelas wajib dipilih.',
            'teacher_id.required' => 'Guru wajib dipilih.',
            'subject.required'    => 'Nama mata pelajaran wajib diisi.',
            'day.required'        => 'Hari wajib dipilih.',
            'start_time.required' => 'Jam mulai wajib diisi.',
            'end_time.required'   => 'Jam selesai wajib diisi.',
            'end_time.after'      => 'Jam selesai harus setelah jam mulai.',
        ]);

        Schedule::create([
            'class_id'   => $request->class_id,
            'teacher_id' => $request->teacher_id,
            'subject'    => $request->subject,
            'day'        => $request->day,
            'start_time' => $request->start_time . ':00',
            'end_time'   => $request->end_time . ':00',
        ]);

        return back()->with('success', 'Jadwal pelajaran berhasil ditambahkan.');
    }

    public function update(Request $request, Schedule $schedule)
    {
        $request->validate([
            'class_id'   => 'required|exists:academic_classes,id',
            'teacher_id' => 'required|exists:users,id',
            'subject'    => 'required|string|max:255',
            'day'        => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'start_time' => 'required|date_format:H:i',
            'end_time'   => 'required|date_format:H:i|after:start_time',
        ], [
            'end_time.after' => 'Jam selesai harus setelah jam mulai.',
        ]);

        $schedule->update([
            'class_id'   => $request->class_id,
            'teacher_id' => $request->teacher_id,
            'subject'    => $request->subject,
            'day'        => $request->day,
            'start_time' => $request->start_time . ':00',
            'end_time'   => $request->end_time . ':00',
        ]);

        return back()->with('success', 'Jadwal pelajaran berhasil diperbarui.');
    }

    public function destroy(Schedule $schedule)
    {
        $schedule->delete();
        return back()->with('success', 'Jadwal pelajaran berhasil dihapus.');
    }
}
