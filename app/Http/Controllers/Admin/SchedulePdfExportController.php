<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\AcademicClass;
use App\Models\AcademicYear;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class SchedulePdfExportController extends Controller
{
    private $labMapping = [
        'VI ST|Informatika' => 'LAB 2',
        'VI KR|Informatika' => 'LAB 2',
        'VI SB|Informatika' => 'LAB 2',
        'I BS|Informatika' => 'LAB 1',
        'I TS 1|Informatika' => 'LAB 1',
        'I KR|Informatika' => 'LAB 1',
        'II BS 1|Informatika' => 'LAB 1',
        'II BS 2|Informatika' => 'LAB 1',
        'II TS|Informatika' => 'LAB 1',
        'II KR 1|Informatika' => 'LAB 1',
        'III BS 1|Informatika' => 'LAB 1',
        'III TS|Informatika' => 'LAB 1',
        'III KR|Informatika' => 'LAB 1',
        'III BS 2|Informatika' => 'LAB 1',
        'II KR 2|Informatika' => 'LAB 1',
        'VI TJKT|Keamanan Jaringan' => 'LAB TI',
        'IV AKL|Spreadsheet' => 'LAB 2',
        'V AKL|Komputer Akuntansi' => 'LAB 2',
        'VI AKL|Komputer Akuntansi' => 'LAB 2',
        'IV TJKT|Informatika' => 'LAB 2',
        'IV AKL|Informatika' => 'LAB 2',
        'VI TJKT|Teknologi Jaringan Kabel dan Nirkabel' => 'LAB TI',
        'V TJKT|Teknologi Jaringan Kabel dan Nirkabel' => 'LAB TI',
        'IV TJKT|Pemrograman Web' => 'LAB 1',
        'V TJKT|Pemrograman Web' => 'LAB 1',
        'IV TJKT|Design Grafis' => 'LAB 1',
        'V TJKT|Perencanaan dan Pengalamatan Jaringan' => 'LAB TI',
        'VI TJKT|Perencanaan dan Pengalamatan Jaringan' => 'LAB TI',
        'V TJKT|Keamanan Jaringan' => 'LAB TI',
        'IV KR|Informatika' => 'LAB 2',
        'IV SB|Informatika' => 'LAB 2',
        'V KR|Informatika' => 'LAB 2',
        'V SB|Informatika' => 'LAB 2',
        'VI TJKT|Pemrograman Web' => 'LAB TI',
        'IV TJKT|Sistem Komputer' => 'LAB TI',
        'I TS 2|Informatika' => 'LAB 1',
        'V AKL|Digital Marketing' => 'LAB 1',
        'VI AKL|Digital Marketing' => 'LAB 1',
        'IV TJKT|Jaringan Dasar' => 'LAB TI',
        'VI KR|Riset dan Sosial Keagamaan' => 'LAB 2',
        'V KR|Riset dan Sosial Keagamaan' => 'LAB 2',
        'V TJKT|Administrasi Sistem Jaringan' => 'LAB TI',
        'IV ST|Informatika' => 'LAB 1',
        'V ST|Informatika' => 'LAB 1',
        'VI TJKT|Administrasi Sistem Jaringan' => 'LAB TI'
    ];

    private function normalizeClassName($name)
    {
        $n = trim(str_replace([' PA', ' PI'], '', (string)$name));
        if (str_starts_with($n, 'XII ')) {
            return 'VI ' . substr($n, 4);
        }
        if (str_starts_with($n, 'XI ')) {
            return 'V ' . substr($n, 3);
        }
        if (str_starts_with($n, 'X ')) {
            return 'IV ' . substr($n, 2);
        }
        return $n;
    }

    private function getRoom($className, $subject)
    {
        $key = trim((string)$className) . '|' . trim((string)$subject);
        if (isset($this->labMapping[$key])) {
            return $this->labMapping[$key];
        }

        $normKey = $this->normalizeClassName($className) . '|' . trim((string)$subject);
        if (isset($this->labMapping[$normKey])) {
            return $this->labMapping[$normKey];
        }

        // Subject-based fallback
        $subjMap = [
            'Keamanan Jaringan' => 'LAB TI',
            'Teknologi Jaringan Kabel dan Nirkabel' => 'LAB TI',
            'Perencanaan dan Pengalamatan Jaringan' => 'LAB TI',
            'Administrasi Sistem Jaringan' => 'LAB TI',
            'Jaringan Dasar' => 'LAB TI',
            'Sistem Komputer' => 'LAB TI',
            'Spreadsheet' => 'LAB 2',
            'Komputer Akuntansi' => 'LAB 2',
            'Digital Marketing' => 'LAB 1',
            'Design Grafis' => 'LAB 1',
        ];
        return $subjMap[trim((string)$subject)] ?? null;
    }

    private function matchDay($scheduleDay, $targetDay)
    {
        if ($scheduleDay instanceof \BackedEnum) {
            return $scheduleDay->value === $targetDay;
        }
        if (is_string($scheduleDay)) {
            return $scheduleDay === $targetDay;
        }
        return false;
    }

    private function getCommonData()
    {
        $lessonHours = json_decode(Setting::get('lesson_hours_by_day', '{}'), true) ?: [];
        $slots = $lessonHours['monday'] ?? [
            ['label' => 'Jam ke-1', 'start' => '07:30', 'end' => '08:10'],
            ['label' => 'Jam ke-2', 'start' => '08:10', 'end' => '08:50'],
            ['label' => 'Jam ke-3', 'start' => '08:50', 'end' => '09:30'],
            ['label' => 'Jam ke-4', 'start' => '09:30', 'end' => '10:10'],
            ['label' => 'Jam ke-5', 'start' => '10:30', 'end' => '11:10'],
            ['label' => 'Jam ke-6', 'start' => '11:10', 'end' => '11:50'],
            ['label' => 'Jam ke-7', 'start' => '13:15', 'end' => '13:50'],
            ['label' => 'Jam ke-8', 'start' => '13:50', 'end' => '14:25'],
            ['label' => 'Jam ke-9', 'start' => '14:25', 'end' => '15:00'],
        ];

        $activeDays = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
        $dayLabels = [
            'saturday' => 'Sabtu',
            'sunday' => 'Ahad',
            'monday' => 'Senin',
            'tuesday' => 'Selasa',
            'wednesday' => 'Rabu',
            'thursday' => 'Kamis',
            'friday' => 'Jumat'
        ];

        $schoolName = Setting::get('school_name', 'SIM SALIRA');
        $activeYear = AcademicYear::where('is_active', true)->first();
        $academicYear = $activeYear ? $activeYear->name : (date('Y') . '/' . (date('Y') + 1));

        $months = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        $printedAt = date('j') . ' ' . ($months[(int)date('n')] ?? date('F')) . ' ' . date('Y');

        return compact('slots', 'activeDays', 'dayLabels', 'schoolName', 'academicYear', 'printedAt');
    }

    public function exportPdf(Request $request)
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);

        $type = $request->input('type', 'kelas');
        switch ($type) {
            case 'guru':
                return $this->exportGuru($request);
            case 'lab':
                return $this->exportLab($request);
            case 'piket':
                return $this->exportPiket($request);
            case 'kelas':
            default:
                return $this->exportKelas($request);
        }
    }

    public function exportKelas(Request $request)
    {
        $common = $this->getCommonData();
        $slots = $common['slots'];
        $activeDays = $common['activeDays'];
        $dayLabels = $common['dayLabels'];
        $schoolName = $common['schoolName'];
        $academicYear = $common['academicYear'];
        $printedAt = $common['printedAt'];
        $validDate = $request->input('valid_date');

        $query = AcademicClass::withoutGlobalScope('active_year')->orderBy('name');
        if ($request->filled('class_id')) {
            $query->where('id', $request->class_id);
        } else {
            $query->whereHas('schedules');
        }
        $classes = $query->get();

        $allSchedules = Schedule::with(['teacher', 'academicClass'])
            ->whereIn('class_id', $classes->pluck('id'))
            ->get();

        $matrix = [];
        foreach ($classes as $class) {
            $classSchedules = $allSchedules->where('class_id', $class->id);
            foreach ($activeDays as $day) {
                $daySchedules = $classSchedules->filter(function ($s) use ($day) {
                    return $this->matchDay($s->day, $day);
                });
                $covered = [];

                for ($sIdx = 0; $sIdx < count($slots); $sIdx++) {
                    if (in_array($sIdx, $covered)) {
                        $matrix[$class->id][$day][$sIdx] = ['type' => 'skip'];
                        continue;
                    }

                    $slotStart = $slots[$sIdx]['start'];
                    $match = $daySchedules->first(function ($s) use ($slotStart) {
                        return substr($s->start_time, 0, 5) <= $slotStart && substr($s->end_time, 0, 5) > $slotStart;
                    });

                    if ($match) {
                        $matchEnd = substr($match->end_time, 0, 5);
                        $span = 1;
                        for ($k = $sIdx + 1; $k < count($slots); $k++) {
                            if ($slots[$k]['start'] < $matchEnd) {
                                $span++;
                                $covered[] = $k;
                            } else {
                                break;
                            }
                        }

                        $room = $this->getRoom($class->name, $match->subject);
                        $matrix[$class->id][$day][$sIdx] = [
                            'type' => 'item',
                            'rowspan' => $span,
                            'schedule' => $match,
                            'room' => $room,
                        ];
                    } else {
                        $matrix[$class->id][$day][$sIdx] = [
                            'type' => 'empty',
                            'rowspan' => 1,
                        ];
                    }
                }
            }
        }

        $pdf = Pdf::loadView('pdf.schedules.kelas', [
            'classes' => $classes,
            'slots' => $slots,
            'active_days' => $activeDays,
            'day_labels' => $dayLabels,
            'school_name' => $schoolName,
            'academic_year' => $academicYear,
            'printed_at' => $printedAt,
            'valid_date' => $validDate,
            'matrix' => $matrix,
        ]);

        $pdf->setPaper('a4', 'landscape');
        $filename = 'Jadwal_Kelas_' . date('Ymd_His') . '.pdf';
        if ($request->boolean('download')) {
            return $pdf->download($filename);
        }
        return $pdf->stream($filename);
    }

    public function exportGuru(Request $request)
    {
        $common = $this->getCommonData();
        $slots = $common['slots'];
        $activeDays = $common['activeDays'];
        $dayLabels = $common['dayLabels'];
        $schoolName = $common['schoolName'];
        $academicYear = $common['academicYear'];
        $printedAt = $common['printedAt'];
        $validDate = $request->input('valid_date');

        $query = User::orderBy('name');
        if ($request->filled('teacher_id')) {
            $query->where('id', $request->teacher_id);
        } else {
            $query->whereHas('schedules');
        }
        $teachers = $query->get();

        $allSchedules = Schedule::with(['teacher', 'academicClass'])
            ->whereIn('teacher_id', $teachers->pluck('id'))
            ->get();

        $matrix = [];
        foreach ($teachers as $teacher) {
            $teacherSchedules = $allSchedules->where('teacher_id', $teacher->id);
            foreach ($activeDays as $day) {
                $daySchedules = $teacherSchedules->filter(function ($s) use ($day) {
                    return $this->matchDay($s->day, $day);
                });
                $covered = [];

                for ($sIdx = 0; $sIdx < count($slots); $sIdx++) {
                    if (in_array($sIdx, $covered)) {
                        $matrix[$teacher->id][$day][$sIdx] = ['type' => 'skip'];
                        continue;
                    }

                    $slotStart = $slots[$sIdx]['start'];
                    $match = $daySchedules->first(function ($s) use ($slotStart) {
                        return substr($s->start_time, 0, 5) <= $slotStart && substr($s->end_time, 0, 5) > $slotStart;
                    });

                    if ($match) {
                        $matchEnd = substr($match->end_time, 0, 5);
                        $span = 1;
                        for ($k = $sIdx + 1; $k < count($slots); $k++) {
                            if ($slots[$k]['start'] < $matchEnd) {
                                $span++;
                                $covered[] = $k;
                            } else {
                                break;
                            }
                        }

                        $className = $match->academicClass->name ?? '';
                        $room = $this->getRoom($className, $match->subject);
                        $matrix[$teacher->id][$day][$sIdx] = [
                            'type' => 'item',
                            'rowspan' => $span,
                            'schedule' => $match,
                            'room' => $room,
                        ];
                    } else {
                        $matrix[$teacher->id][$day][$sIdx] = [
                            'type' => 'empty',
                            'rowspan' => 1,
                        ];
                    }
                }
            }
        }

        $pdf = Pdf::loadView('pdf.schedules.guru', [
            'teachers' => $teachers,
            'slots' => $slots,
            'active_days' => $activeDays,
            'day_labels' => $dayLabels,
            'school_name' => $schoolName,
            'academic_year' => $academicYear,
            'printed_at' => $printedAt,
            'valid_date' => $validDate,
            'matrix' => $matrix,
        ]);

        $pdf->setPaper('a4', 'landscape');
        $filename = 'Jadwal_Guru_' . date('Ymd_His') . '.pdf';
        if ($request->boolean('download')) {
            return $pdf->download($filename);
        }
        return $pdf->stream($filename);
    }

    public function exportLab(Request $request)
    {
        $common = $this->getCommonData();
        $slots = $common['slots'];
        $activeDays = $common['activeDays'];
        $dayLabels = $common['dayLabels'];
        $schoolName = $common['schoolName'];
        $academicYear = $common['academicYear'];
        $printedAt = $common['printedAt'];
        $validDate = $request->input('valid_date');

        $dbLabs = \App\Models\ComputerLab::pluck('name')->toArray();
        $availableLabs = array_values(array_unique(array_merge(['LAB 1', 'LAB 2', 'LAB TI'], $dbLabs)));

        if ($request->filled('lab') && in_array($request->lab, $availableLabs)) {
            $labs = [$request->lab];
        } else {
            $labs = $availableLabs;
        }

        $allSchedules = Schedule::with(['academicClass', 'teacher'])->get();

        $matrix = [];
        foreach ($labs as $labName) {
            foreach ($activeDays as $day) {
                $daySchedules = $allSchedules->filter(function ($s) use ($day, $labName) {
                    if (!$this->matchDay($s->day, $day)) return false;
                    $className = $s->academicClass->name ?? '';
                    $room = $s->room ?: $this->getRoom($className, $s->subject);
                    return $room === $labName;
                });

                $covered = [];
                for ($sIdx = 0; $sIdx < count($slots); $sIdx++) {
                    if (in_array($sIdx, $covered)) {
                        $matrix[$labName][$day][$sIdx] = ['type' => 'skip'];
                        continue;
                    }

                    $slotStart = $slots[$sIdx]['start'];
                    $match = $daySchedules->first(function ($s) use ($slotStart) {
                        return substr($s->start_time, 0, 5) <= $slotStart && substr($s->end_time, 0, 5) > $slotStart;
                    });

                    if ($match) {
                        $matchEnd = substr($match->end_time, 0, 5);
                        $span = 1;
                        for ($k = $sIdx + 1; $k < count($slots); $k++) {
                            if ($slots[$k]['start'] < $matchEnd) {
                                $span++;
                                $covered[] = $k;
                            } else {
                                break;
                            }
                        }

                        $matrix[$labName][$day][$sIdx] = [
                            'type' => 'item',
                            'rowspan' => $span,
                            'schedule' => $match,
                        ];
                    } else {
                        $matrix[$labName][$day][$sIdx] = [
                            'type' => 'empty',
                            'rowspan' => 1,
                        ];
                    }
                }
            }
        }

        $pdf = Pdf::loadView('pdf.schedules.lab', [
            'labs' => $labs,
            'slots' => $slots,
            'active_days' => $activeDays,
            'day_labels' => $dayLabels,
            'school_name' => $schoolName,
            'academic_year' => $academicYear,
            'printed_at' => $printedAt,
            'valid_date' => $validDate,
            'matrix' => $matrix,
        ]);

        $pdf->setPaper('a4', 'landscape');
        $filename = 'Jadwal_Lab_' . date('Ymd_His') . '.pdf';
        if ($request->boolean('download')) {
            return $pdf->download($filename);
        }
        return $pdf->stream($filename);
    }

    public function exportPiket(Request $request)
    {
        $common = $this->getCommonData();
        $slots = $common['slots'];
        $activeDays = $common['activeDays'];
        $dayLabels = $common['dayLabels'];
        $schoolName = $common['schoolName'];
        $academicYear = $common['academicYear'];
        $printedAt = $common['printedAt'];
        $validDate = $request->input('valid_date');

        if ($request->filled('day') && in_array($request->day, $activeDays)) {
            $daysToExport = [$request->day];
        } else {
            $daysToExport = $activeDays;
        }

        $classes = AcademicClass::withoutGlobalScope('active_year')
            ->whereHas('schedules')
            ->orderBy('name')
            ->get();

        $allSchedules = Schedule::with(['teacher', 'academicClass'])
            ->whereIn('class_id', $classes->pluck('id'))
            ->get();

        $matrix = [];
        foreach ($daysToExport as $day) {
            foreach ($classes as $class) {
                $dayClassSchedules = $allSchedules->filter(function ($s) use ($day, $class) {
                    return $this->matchDay($s->day, $day) && $s->class_id == $class->id;
                });

                $covered = [];
                for ($sIdx = 0; $sIdx < count($slots); $sIdx++) {
                    if (in_array($sIdx, $covered)) {
                        $matrix[$day][$class->id][$sIdx] = ['type' => 'skip'];
                        continue;
                    }

                    $slotStart = $slots[$sIdx]['start'];
                    $match = $dayClassSchedules->first(function ($s) use ($slotStart) {
                        return substr($s->start_time, 0, 5) <= $slotStart && substr($s->end_time, 0, 5) > $slotStart;
                    });

                    if ($match) {
                        $matchEnd = substr($match->end_time, 0, 5);
                        $span = 1;
                        for ($k = $sIdx + 1; $k < count($slots); $k++) {
                            if ($slots[$k]['start'] < $matchEnd) {
                                $span++;
                                $covered[] = $k;
                            } else {
                                break;
                            }
                        }

                        $room = $this->getRoom($class->name, $match->subject);
                        $matrix[$day][$class->id][$sIdx] = [
                            'type' => 'item',
                            'rowspan' => $span,
                            'schedule' => $match,
                            'room' => $room,
                        ];
                    } else {
                        $matrix[$day][$class->id][$sIdx] = [
                            'type' => 'empty',
                            'rowspan' => 1,
                        ];
                    }
                }
            }
        }

        $pdf = Pdf::loadView('pdf.schedules.piket', [
            'classes' => $classes,
            'slots' => $slots,
            'active_days' => $daysToExport,
            'day_labels' => $dayLabels,
            'school_name' => $schoolName,
            'academic_year' => $academicYear,
            'printed_at' => $printedAt,
            'valid_date' => $validDate,
            'matrix' => $matrix,
        ]);

        $pdf->setPaper('a4', 'landscape');
        $filename = 'Jadwal_Piket_' . date('Ymd_His') . '.pdf';
        if ($request->boolean('download')) {
            return $pdf->download($filename);
        }
        return $pdf->stream($filename);
    }
}
