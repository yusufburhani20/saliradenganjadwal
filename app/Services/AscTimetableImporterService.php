<?php

namespace App\Services;

use App\Models\AcademicClass;
use App\Models\AcademicYear;
use App\Models\Subject;
use App\Models\User;
use App\Models\TeachingAssignment;
use App\Models\Schedule;
use App\Models\Setting;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AscTimetableImporterService
{
    /**
     * Import aSc TimeTables XML file content into database.
     *
     * @param string $xmlContent String XML content or file path
     * @param string $scope 'smk' atau 'all'
     * @param bool $applySchedules Apakah sekaligus memasukkan ke tabel schedules resmi
     * @return array
     */
    public function import(string $xmlContent, string $scope = 'smk', bool $applySchedules = true): array
    {
        libxml_use_internal_errors(true);
        if (file_exists($xmlContent)) {
            $xml = simplexml_load_file($xmlContent);
        } else {
            $xml = simplexml_load_string($xmlContent);
        }

        if (!$xml) {
            $errors = [];
            foreach (libxml_get_errors() as $error) {
                $errors[] = trim($error->message);
            }
            libxml_clear_errors();
            return [
                'success' => false,
                'message' => 'Format file XML tidak valid: ' . implode(', ', array_slice($errors, 0, 3)),
            ];
        }

        // 1. Tahun Ajaran
        $activeYear = AcademicYear::where('is_active', true)->first() ?: AcademicYear::first();
        $yearId = $activeYear ? $activeYear->id : 1;

        // 2. Role Guru
        Role::firstOrCreate(['name' => 'Guru']);

        // 3. Mapping data dasar
        $xmlClasses = [];
        foreach ($xml->classes->class as $c) {
            $xmlClasses[(string)$c['id']] = (string)$c['name'];
        }

        $xmlTeachers = [];
        foreach ($xml->teachers->teacher as $t) {
            $xmlTeachers[(string)$t['id']] = (string)$t['name'];
        }

        $xmlSubjects = [];
        $xmlSubjectCodes = [];
        foreach ($xml->subjects->subject as $s) {
            $xmlSubjects[(string)$s['id']] = (string)$s['name'];
            $xmlSubjectCodes[(string)$s['id']] = (string)$s['short'];
        }

        $xmlPeriods = [];
        foreach ($xml->periods->period as $p) {
            $pid = (string)$p['period'];
            $start = (string)$p['starttime'];
            $end = (string)$p['endtime'];
            if (strlen($start) === 4 && $start[1] === ':') $start = '0' . $start;
            if (strlen($end) === 4 && $end[1] === ':') $end = '0' . $end;
            $xmlPeriods[$pid] = ['start' => $start, 'end' => $end];
        }

        $daysMap = [
            '100000' => 'saturday',
            '010000' => 'sunday',
            '001000' => 'monday',
            '000100' => 'tuesday',
            '000010' => 'wednesday',
            '000001' => 'thursday',
        ];

        // 4. Filter Kelas berdasarkan Scope
        $targetXmlClasses = [];
        foreach ($xmlClasses as $cid => $cname) {
            if ($scope === 'smk') {
                if (str_contains($cname, 'AKL') || str_contains($cname, 'TJKT')) {
                    $targetXmlClasses[$cid] = $cname;
                }
            } else {
                $targetXmlClasses[$cid] = $cname;
            }
        }

        if (empty($targetXmlClasses)) {
            return [
                'success' => false,
                'message' => 'Tidak ditemukan data kelas yang sesuai dengan filter scope ' . strtoupper($scope),
            ];
        }

        // 5. Pemetaan ke AcademicClass DB
        $classDbMap = [];
        $classAliasMap = [
            'IV AKL'  => ['X AKL PA', 'X AKL', 'IV AKL'],
            'IV TJKT' => ['X TJKT PA', 'X TJKT', 'IV TJKT'],
            'V AKL'   => ['XI AKL PA', 'XI AKL', 'V AKL'],
            'V TJKT'  => ['XI TJKT', 'XI TJKT PA', 'V TJKT'],
            'VI AKL'  => ['XII AKL PA', 'XII AKL', 'VI AKL'],
            'VI TJKT' => ['XII TJKT', 'XII TJKT PA', 'VI TJKT'],
        ];

        foreach ($targetXmlClasses as $xmlCid => $xmlCname) {
            $targetAliases = $classAliasMap[$xmlCname] ?? [$xmlCname];
            $dbClass = null;
            foreach ($targetAliases as $alias) {
                $dbClass = AcademicClass::withoutGlobalScopes()->where('name', $alias)->first();
                if ($dbClass) break;
            }

            if (!$dbClass) {
                $dbClass = AcademicClass::create([
                    'name' => $targetAliases[0],
                    'academic_year_id' => $yearId,
                ]);
            }
            $classDbMap[$xmlCid] = $dbClass;
        }

        // 6. Filter Lesson
        $smkLessons = [];
        $targetTeacherXmlIds = [];
        $targetSubjectXmlIds = [];

        foreach ($xml->lessons->lesson as $l) {
            $lid = (string)$l['id'];
            $cids = array_filter(explode(',', (string)$l['classids']));
            $hasTarget = false;
            foreach ($cids as $cid) {
                if (isset($targetXmlClasses[$cid])) {
                    $hasTarget = true;
                    break;
                }
            }

            if ($hasTarget) {
                $smkLessons[$lid] = $l;
                foreach (array_filter(explode(',', (string)$l['teacherids'])) as $tid) {
                    $targetTeacherXmlIds[$tid] = true;
                }
                $subId = (string)$l['subjectid'];
                if ($subId) {
                    $targetSubjectXmlIds[$subId] = true;
                }
            }
        }

        // 7. Sinkronisasi Guru
        $teacherDbMap = [];
        $existingUsersByName = User::all()->keyBy(fn($u) => strtolower(trim($u->name)));
        $newTeachersCount = 0;

        foreach (array_keys($targetTeacherXmlIds) as $xmlTid) {
            $tName = trim($xmlTeachers[$xmlTid] ?? "Guru {$xmlTid}");
            $lowerName = strtolower($tName);

            $user = $existingUsersByName->get($lowerName);
            if (!$user) {
                $nameParts = explode(',', $tName);
                $firstNamePart = strtolower(trim($nameParts[0]));
                foreach ($existingUsersByName as $existingLowerName => $eu) {
                    if (str_contains($existingLowerName, $firstNamePart) || str_contains($firstNamePart, $existingLowerName)) {
                        $user = $eu;
                        break;
                    }
                }
            }

            if (!$user) {
                $slug = Str::slug(explode(',', $tName)[0], '');
                if (empty($slug)) $slug = 'guru' . uniqid();
                $email = $slug . '@salira.sch.id';

                $baseEmail = $slug;
                $idx = 1;
                while (User::where('email', $email)->exists()) {
                    $email = "{$baseEmail}{$idx}@salira.sch.id";
                    $idx++;
                }

                $user = User::create([
                    'name' => $tName,
                    'email' => $email,
                    'password' => Hash::make('password'),
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]);
                $newTeachersCount++;
                $existingUsersByName->put(strtolower($tName), $user);
            }

            if (!$user->hasRole('Guru')) {
                $user->assignRole('Guru');
            }
            $teacherDbMap[$xmlTid] = $user;
        }

        // 8. Sinkronisasi Mata Pelajaran
        $subjectDbMap = [];
        $existingSubjects = Subject::all()->keyBy(fn($s) => strtolower(trim($s->name)));
        $newSubjectsCount = 0;

        foreach (array_keys($targetSubjectXmlIds) as $xmlSubId) {
            $subName = trim($xmlSubjects[$xmlSubId] ?? "Mapel {$xmlSubId}");
            $lowerSub = strtolower($subName);
            $subCode = $xmlSubjectCodes[$xmlSubId] ?? strtoupper(substr(Str::slug($subName, ''), 0, 6));

            $subject = $existingSubjects->get($lowerSub);
            if (!$subject) {
                $code = $subCode;
                $cIdx = 1;
                while (Subject::where('code', $code)->exists()) {
                    $code = "{$subCode}{$cIdx}";
                    $cIdx++;
                }

                $subject = Subject::create([
                    'name' => $subName,
                    'code' => $code,
                ]);
                $newSubjectsCount++;
                $existingSubjects->put(strtolower($subName), $subject);
            }
            $subjectDbMap[$xmlSubId] = $subject;
        }

        // 9. Hitung Total JP dan Simpan Alokasi SKBM
        $assignmentHours = [];
        $cardsByGroup = [];
        $targetClassDbIds = array_map(fn($c) => $c->id, $classDbMap);

        foreach ($xml->cards->card as $card) {
            $lid = (string)$card['lessonid'];
            if (!isset($smkLessons[$lid])) continue;

            $l = $smkLessons[$lid];
            $dayCode = (string)$card['days'];
            $dayName = $daysMap[$dayCode] ?? 'monday';
            $period = (int)$card['period'];

            $cids = array_filter(explode(',', (string)$l['classids']));
            $tids = array_filter(explode(',', (string)$l['teacherids']));
            $subXmlId = (string)$l['subjectid'];

            foreach ($cids as $xmlCid) {
                if (!isset($classDbMap[$xmlCid])) continue;
                $dbClass = $classDbMap[$xmlCid];
                $dbSubject = $subjectDbMap[$subXmlId] ?? null;
                if (!$dbSubject) continue;

                foreach ($tids as $xmlTid) {
                    $dbTeacher = $teacherDbMap[$xmlTid] ?? null;
                    if (!$dbTeacher) continue;

                    $key = "{$dbClass->id}_{$dbSubject->id}_{$dbTeacher->id}";
                    $assignmentHours[$key] = ($assignmentHours[$key] ?? 0) + 1;

                    $groupKey = "{$dbClass->id}_{$dbSubject->name}_{$dbTeacher->id}_{$dayName}";
                    $cardsByGroup[$groupKey][] = $period;
                }
            }
        }

        $assignmentCount = 0;
        foreach ($assignmentHours as $key => $hours) {
            [$classId, $subjectId, $teacherId] = explode('_', $key);

            TeachingAssignment::updateOrCreate(
                [
                    'academic_class_id' => $classId,
                    'subject_id' => $subjectId,
                ],
                [
                    'teacher_id' => $teacherId,
                    'total_hours' => $hours,
                    'max_hours_per_day' => min(3, $hours),
                ]
            );

            $class = AcademicClass::withoutGlobalScopes()->find($classId);
            if ($class) {
                $class->subjects()->syncWithoutDetaching([$subjectId]);
            }
            $assignmentCount++;
        }

        // 10. Terapkan ke Tabel Schedules Resmi jika diaktifkan
        $scheduleCount = 0;
        if ($applySchedules) {
            Schedule::whereIn('class_id', $targetClassDbIds)->delete();

            foreach ($cardsByGroup as $groupKey => $periods) {
                [$classId, $subjectName, $teacherId, $dayName] = explode('_', $groupKey, 4);
                sort($periods);

                $chunks = [];
                $cur = [$periods[0]];
                for ($i = 1; $i < count($periods); $i++) {
                    if ($periods[$i] === end($cur) + 1) {
                        $cur[] = $periods[$i];
                    } else {
                        $chunks[] = $cur;
                        $cur = [$periods[$i]];
                    }
                }
                $chunks[] = $cur;

                foreach ($chunks as $chunk) {
                    $startP = (string)$chunk[0];
                    $endP = (string)end($chunk);

                    $startTime = ($xmlPeriods[$startP]['start'] ?? '07:30') . ':00';
                    $endTime = ($xmlPeriods[$endP]['end'] ?? '08:50') . ':00';

                    Schedule::create([
                        'class_id' => $classId,
                        'teacher_id' => $teacherId,
                        'subject' => $subjectName,
                        'day' => $dayName,
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                    ]);
                    $scheduleCount++;
                }
            }
        }

        // 11. Perbarui Setting Jam Belajar
        $lessonHoursConfig = [];
        $daysList = ['monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'];
        foreach ($daysList as $d) {
            $slots = [];
            foreach ($xmlPeriods as $pNum => $times) {
                $slots[] = [
                    'label' => "Jam ke-{$pNum}",
                    'start' => $times['start'],
                    'end' => $times['end'],
                ];
            }
            $lessonHoursConfig[$d] = $slots;
        }
        $lessonHoursConfig['friday'] = [];
        Setting::set('lesson_hours_by_day', json_encode($lessonHoursConfig));

        return [
            'success' => true,
            'message' => 'Import aSc TimeTables berhasil diselesaikan!',
            'stats' => [
                'scope' => strtoupper($scope),
                'classes_count' => count($classDbMap),
                'teachers_count' => count($teacherDbMap),
                'subjects_count' => count($subjectDbMap),
                'assignments_count' => $assignmentCount,
                'schedules_count' => $scheduleCount,
            ]
        ];
    }
}
