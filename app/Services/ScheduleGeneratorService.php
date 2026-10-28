<?php

namespace App\Services;

use App\Models\AcademicClass;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\TeacherUnavailability;
use App\Models\TeacherScheduleConstraint;
use App\Models\Schedule;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ScheduleGeneratorService
{
    protected array $lessonHoursByDay = [];
    protected array $unavailabilities = []; // [teacher_id][day][slot_index] => true
    protected array $teacherConstraints = []; // [teacher_id] => ['max_days_per_week' => ?int, 'max_hours_per_day' => ?int]

    public function __construct()
    {
        $rawHours = Setting::get('lesson_hours_by_day', '{}');
        $this->lessonHoursByDay = json_decode($rawHours, true) ?: [];
    }

    /**
     * Jalankan generator jadwal otomatis.
     *
     * @param array $classIds Kelas yang ingin dijadwalkan (kosong = semua kelas yang punya alokasi)
     * @param int $maxAttempts Batas iterasi pencarian solusi
     * @return array [
     *     'success' => bool,
     *     'schedules' => array, // Daftar jadwal yang siap disimpan
     *     'placed_count' => int,
     *     'total_count' => int,
     *     'unplaced' => array,
     *     'conflicts' => array,
     *     'stats' => array,
     * ]
     */
    public function generate(array $classIds = [], int $maxAttempts = 5000): array
    {
        // 1. Ambil data alokasi mengajar
        $assignmentsQuery = TeachingAssignment::with(['academicClass', 'subject', 'teacher']);
        if (!empty($classIds)) {
            $assignmentsQuery->whereIn('academic_class_id', $classIds);
        }
        $assignments = $assignmentsQuery->get();

        if ($assignments->isEmpty()) {
            return [
                'success' => false,
                'message' => 'Belum ada data Alokasi Mengajar Guru (SKBM) yang diinputkan.',
                'schedules' => [],
                'placed_count' => 0,
                'total_count' => 0,
                'unplaced' => [],
                'conflicts' => [],
            ];
        }

        // 2. Ambil data ketidaksediaan guru & batasan kuota mengajar
        $this->loadUnavailabilities();
        $this->loadTeacherConstraints();

        // 3. Pecah setiap alokasi menjadi chunk/sesi pertemuan
        $sessions = $this->decomposeAssignmentsToSessions($assignments);
        $totalSessions = count($sessions);

        if ($totalSessions === 0) {
            return [
                'success' => false,
                'message' => 'Total jam pelajaran pada alokasi adalah 0.',
                'schedules' => [],
                'placed_count' => 0,
                'total_count' => 0,
                'unplaced' => [],
                'conflicts' => [],
            ];
        }

        // 4. Hitung kapasitas mingguan dan peringatan beban berlebih
        $maxWeeklyHours = 0;
        foreach ($this->lessonHoursByDay as $d => $slots) {
            $maxWeeklyHours += count($slots);
        }

        $teacherHours = [];
        $teacherNames = [];
        foreach ($assignments as $a) {
            $teacherHours[$a->teacher_id] = ($teacherHours[$a->teacher_id] ?? 0) + $a->total_hours;
            $teacherNames[$a->teacher_id] = $a->teacher ? $a->teacher->name : "Guru #{$a->teacher_id}";
        }

        $capacityWarnings = [];
        foreach ($teacherHours as $tId => $hours) {
            if ($hours > $maxWeeklyHours) {
                $capacityWarnings[] = "Guru {$teacherNames[$tId]} dibebani {$hours} JP/minggu, melebihi jam operasional sekolah ({$maxWeeklyHours} JP/minggu).";
            }
        }

        // Urutkan sesi: sesi dengan batasan hari khusus diletakkan pertama kali,
        // lalu durasi terbesar & guru dengan jam terpadat (MRV heuristic)
        usort($sessions, function ($a, $b) {
            $aDaysCount = !empty($a['allowed_days']) ? count($a['allowed_days']) : 99;
            $bDaysCount = !empty($b['allowed_days']) ? count($b['allowed_days']) : 99;

            if ($aDaysCount !== $bDaysCount) {
                return $aDaysCount <=> $bDaysCount;
            }
            if ($b['duration'] !== $a['duration']) {
                return $b['duration'] <=> $a['duration'];
            }
            return $b['teacher_load'] <=> $a['teacher_load'];
        });

        // 5a. Tahap 1: Greedy Best-Fit Pass (Sangat cepat dan andal untuk beban tinggi)
        $greedyClassGrid = [];
        $greedyTeacherGrid = [];
        $greedyRoomGrid = [];
        $greedyPlaced = [];

        $unplacedSessions = [];

        foreach ($sessions as $session) {
            $candidateSlots = $this->getCandidateSlotsForSession($session, $greedyClassGrid, $greedyTeacherGrid, $greedyRoomGrid);
            if (!empty($candidateSlots)) {
                $bestSlot = $candidateSlots[0];
                $this->placeSessionInGrid(
                    $session,
                    $bestSlot['day'],
                    $bestSlot['start_slot'],
                    $greedyClassGrid,
                    $greedyTeacherGrid,
                    $greedyRoomGrid,
                    $greedyPlaced
                );
            } else {
                $unplacedSessions[] = $session;
            }
        }

        // 5b. Tahap 2: Ripple Swap (Local Search) untuk sesi yang terbentrok guru / slot
        if (!empty($unplacedSessions)) {
            $stillUnplaced = [];
            foreach ($unplacedSessions as $session) {
                $swapped = $this->attemptRippleSwap($session, $greedyClassGrid, $greedyTeacherGrid, $greedyRoomGrid, $greedyPlaced);
                if (!$swapped) {
                    $stillUnplaced[] = $session;
                }
            }
            $unplacedSessions = $stillUnplaced;
        }

        // 5c. Tahap 3: Flexible Fallback Splitting untuk sesi > 1 JP yang belum tertempatkan
        if (!empty($unplacedSessions)) {
            $stillUnplaced = [];
            foreach ($unplacedSessions as $session) {
                if ($session['duration'] > 1) {
                    $subCount = $session['duration'];
                    $subSessions = [];
                    for ($k = 0; $k < $subCount; $k++) {
                        $sub = $session;
                        $sub['id'] = $session['id'] . "_sub_" . $k;
                        $sub['duration'] = 1;
                        $subSessions[] = $sub;
                    }

                    $allPlaced = true;
                    $tempPlaced = [];
                    foreach ($subSessions as $sub) {
                        $candidates = $this->getCandidateSlotsForSession($sub, $greedyClassGrid, $greedyTeacherGrid, $greedyRoomGrid);
                        if (!empty($candidates)) {
                            $bestSlot = $candidates[0];
                            $this->placeSessionInGrid($sub, $bestSlot['day'], $bestSlot['start_slot'], $greedyClassGrid, $greedyTeacherGrid, $greedyRoomGrid, $greedyPlaced);
                            $tempPlaced[] = $sub;
                        } else {
                            $allPlaced = false;
                            break;
                        }
                    }

                    if (!$allPlaced) {
                        foreach ($tempPlaced as $sub) {
                            $this->removeSessionFromGrid($sub['id'], $greedyClassGrid, $greedyTeacherGrid, $greedyRoomGrid, $greedyPlaced);
                        }
                        $stillUnplaced[] = $session;
                    }
                } else {
                    $stillUnplaced[] = $session;
                }
            }
            $unplacedSessions = $stillUnplaced;
        }

        // 5d. Tahap 4: Recursive Backtracking (jika masih diperlukan)
        if (count($greedyPlaced) === $totalSessions) {
            $finalPlaced = $greedyPlaced;
            $success = true;
            $steps = $totalSessions;
        } elseif (empty($unplacedSessions)) {
            $finalPlaced = $greedyPlaced;
            $success = true;
            $steps = count($greedyPlaced);
        } else {
            $classGrid = [];
            $teacherGrid = [];
            $roomGrid = [];
            $placedSessions = [];
            $steps = 0;
            $bestPlaced = $greedyPlaced;

            $success = $this->backtrack(
                $sessions,
                0,
                $classGrid,
                $teacherGrid,
                $roomGrid,
                $placedSessions,
                $steps,
                $maxAttempts,
                $bestPlaced
            );
            $finalPlaced = $success ? $placedSessions : $bestPlaced;
        }

        $unplaced = [];
        $placedOriginalIds = [];
        foreach ($finalPlaced as $p) {
            $sid = (string) $p['session_id'];
            if (str_contains($sid, '_sub_')) {
                $placedOriginalIds[explode('_sub_', $sid)[0]] = true;
            } else {
                $placedOriginalIds[$sid] = true;
            }
        }

        foreach ($sessions as $s) {
            if (!isset($placedOriginalIds[(string)$s['id']])) {
                $unplaced[] = [
                    'class_name' => $s['class_name'],
                    'subject_name' => $s['subject_name'],
                    'teacher_name' => $s['teacher_name'],
                    'duration' => $s['duration'] . ' JP',
                ];
            }
        }

        $placedCount = count($placedOriginalIds);
        $success = empty($unplaced);

        // 6. Transformasi ke format objek Schedule (siap simpan atau preview)
        $formattedSchedules = $this->formatPlacedSchedules($finalPlaced);

        $message = $success
            ? 'Jadwal berhasil digenerate 100% tanpa bentrok!'
            : 'Jadwal berhasil digenerate dengan penempatan maksimal (' . $placedCount . ' dari ' . $totalSessions . ' sesi).';

        if (!empty($capacityWarnings)) {
            $message .= ' Perhatian: ' . implode(' ', $capacityWarnings);
        }

        return [
            'success' => $success,
            'message' => $message,
            'schedules' => $formattedSchedules,
            'placed_count' => $placedCount,
            'total_count' => $totalSessions,
            'unplaced' => $unplaced,
            'capacity_warnings' => $capacityWarnings,
            'stats' => [
                'steps' => $steps,
                'efficiency' => round(($placedCount / $totalSessions) * 100, 1) . '%',
            ],
        ];
    }

    /**
     * Algoritma Backtracking dengan Heuristik Slot
     */
    protected function backtrack(
        array &$sessions,
        int $index,
        array &$classGrid,
        array &$teacherGrid,
        array &$roomGrid,
        array &$placedSessions,
        int &$steps,
        int $maxAttempts,
        array &$bestPlaced
    ): bool {
        $steps++;

        if (count($placedSessions) > count($bestPlaced)) {
            $bestPlaced = $placedSessions;
        }

        if ($index >= count($sessions)) {
            return true; // Semua sesi berhasil ditempatkan
        }

        if ($steps >= $maxAttempts) {
            return false; // Melebihi batas pencarian
        }

        $session = $sessions[$index];
        $candidateSlots = $this->getCandidateSlotsForSession($session, $classGrid, $teacherGrid, $roomGrid);

        foreach ($candidateSlots as $slot) {
            $day = $slot['day'];
            $startSlot = $slot['start_slot'];
            $duration = $session['duration'];

            // Terapkan penempatan
            for ($i = 0; $i < $duration; $i++) {
                $classGrid[$session['class_id']][$day][$startSlot + $i] = $session['id'];
                $teacherGrid[$session['teacher_id']][$day][$startSlot + $i] = $session['id'];
                if (!empty($session['room'])) {
                    $roomGrid[$session['room']][$day][$startSlot + $i] = $session['id'];
                }
            }

            $placedItem = [
                'session_id' => $session['id'],
                'class_id' => $session['class_id'],
                'class_name' => $session['class_name'],
                'teacher_id' => $session['teacher_id'],
                'teacher_name' => $session['teacher_name'],
                'subject_id' => $session['subject_id'],
                'subject_name' => $session['subject_name'],
                'room' => $session['room'] ?? null,
                'day' => $day,
                'start_slot' => $startSlot,
                'end_slot' => $startSlot + $duration - 1,
                'duration' => $duration,
            ];

            $placedSessions[] = $placedItem;

            if ($this->backtrack($sessions, $index + 1, $classGrid, $teacherGrid, $roomGrid, $placedSessions, $steps, $maxAttempts, $bestPlaced)) {
                return true;
            }

            // Batalkan penempatan (Backtrack)
            array_pop($placedSessions);
            for ($i = 0; $i < $duration; $i++) {
                unset($classGrid[$session['class_id']][$day][$startSlot + $i]);
                unset($teacherGrid[$session['teacher_id']][$day][$startSlot + $i]);
                if (!empty($session['room'])) {
                    unset($roomGrid[$session['room']][$day][$startSlot + $i]);
                }
            }
        }

        return false;
    }

    /**
     * Cari semua slot valid untuk sebuah sesi di semua hari KBM
     */
    protected function getCandidateSlotsForSession(array $session, array &$classGrid, array &$teacherGrid, array &$roomGrid = []): array
    {
        $validSlots = [];
        $duration = $session['duration'];
        $classId = $session['class_id'];
        $teacherId = $session['teacher_id'];
        $subjectId = $session['subject_id'];

        // Cek hari apa saja yang sudah memiliki mata pelajaran ini untuk kelas yang sama
        $daysWithSameSubject = [];
        // Cek hari apa saja guru sudah mengajar
        $daysWithTeacher = [];

        foreach ($classGrid[$classId] ?? [] as $d => $slots) {
            foreach ($slots as $slId) {
                // Sederhanakan: hindari mapel sama di hari yang sama jika memungkinkan
                $daysWithSameSubject[$d] = true;
            }
        }

        foreach ($this->lessonHoursByDay as $day => $slots) {
            // Jika ada pembatasan hari khusus (misal: hanya Sabtu atau Minggu)
            if (!empty($session['allowed_days']) && !in_array($day, $session['allowed_days'])) {
                continue;
            }

            // Batasan kuota hari maksimal mengajar guru (max_days_per_week)
            $maxDays = $this->teacherConstraints[$teacherId]['max_days_per_week'] ?? null;
            if ($maxDays !== null) {
                $teacherDays = $teacherGrid[$teacherId] ?? [];
                $isExistingDay = !empty($teacherDays[$day]);
                if (!$isExistingDay) {
                    $activeDaysCount = 0;
                    foreach ($teacherDays as $dName => $daySlots) {
                        if (!empty($daySlots)) {
                            $activeDaysCount++;
                        }
                    }
                    if ($activeDaysCount >= $maxDays) {
                        continue; // Melebihi batas maksimal hari mengajar guru
                    }
                }
            }

            // Batasan kuota JP maksimal per hari bagi guru (max_hours_per_day)
            $maxDaily = $this->teacherConstraints[$teacherId]['max_hours_per_day'] ?? null;
            if ($maxDaily !== null) {
                $currentDailyHours = count($teacherGrid[$teacherId][$day] ?? []);
                if (($currentDailyHours + $duration) > $maxDaily) {
                    continue; // Melebihi beban maksimal JP per hari bagi guru ini
                }
            }

            $slotCount = count($slots);
            if ($slotCount < $duration) {
                continue;
            }

            for ($start = 0; $start <= ($slotCount - $duration); $start++) {
                $possible = true;

                for ($offset = 0; $offset < $duration; $offset++) {
                    $curr = $start + $offset;

                    // 1. Bentrok Kelas
                    if (isset($classGrid[$classId][$day][$curr])) {
                        $possible = false;
                        break;
                    }

                    // 2. Bentrok Guru
                    if (isset($teacherGrid[$teacherId][$day][$curr])) {
                        $possible = false;
                        break;
                    }

                    // 3. Guru Tidak Bersedia
                    if ($this->isTeacherUnavailable($teacherId, $day, $curr)) {
                        $possible = false;
                        break;
                    }

                    // 4. Bentrok Ruangan / Lab
                    if (!empty($session['room']) && isset($roomGrid[$session['room']][$day][$curr])) {
                        $possible = false;
                        break;
                    }
                }

                if ($possible) {
                    $score = 0;
                    $end = $start + $duration - 1;

                    // Beri bobot/skor: preferensi hari yang belum ada mapel ini
                    if (!isset($daysWithSameSubject[$day])) {
                        $score += 10;
                    }
                    // Jam pagi lebih diprioritaskan
                    $score += max(0, 10 - $start);

                    // ANTI-FRAGMENTATION HEURISTICS
                    $classOccupied = $classGrid[$classId][$day] ?? [];

                    // 1. Berada di awal hari (jam ke-1)
                    if ($start === 0) {
                        $score += 25;
                    }

                    // 2. Berada tepat di akhir hari (menutup slot terakhir)
                    if ($end === ($slotCount - 1)) {
                        $score += 25;
                    }

                    // 3. Menempel rapat dengan sesi pelajaran yang sudah ada di kelas (mencegah jam kosong)
                    $hasLeftNeighbor = isset($classOccupied[$start - 1]);
                    $hasRightNeighbor = isset($classOccupied[$end + 1]);
                    if ($hasLeftNeighbor) $score += 35;
                    if ($hasRightNeighbor) $score += 35;

                    // 4. Penalti berat jika meninggalkan celah 1 JP terisolasi
                    if ($start >= 2 && !isset($classOccupied[$start - 1]) && isset($classOccupied[$start - 2])) {
                        $score -= 60; // Menyisakan 1 slot kosong terisolasi di ($start - 1)
                    } elseif ($start === 1 && !isset($classOccupied[0])) {
                        $score -= 60; // Menyisakan 1 slot kosong terisolasi di jam pertama
                    }

                    if (($end <= $slotCount - 3) && !isset($classOccupied[$end + 1]) && isset($classOccupied[$end + 2])) {
                        $score -= 60; // Menyisakan 1 slot kosong terisolasi di ($end + 1)
                    } elseif ($end === $slotCount - 2 && !isset($classOccupied[$slotCount - 1])) {
                        $score -= 60; // Menyisakan 1 slot kosong terisolasi di jam terakhir
                    }

                    // 5. Bonus konsolidasi hari guru: prioritaskan hari yang memang sudah ada jadwal guru ini
                    // agar jadwal guru terkumpul dan tidak terpecah-pecah ke terlalu banyak hari
                    if (!empty($teacherGrid[$teacherId][$day])) {
                        $score += 20;
                    }

                    $validSlots[] = [
                        'day' => $day,
                        'start_slot' => $start,
                        'score' => $score,
                    ];
                }
            }
        }

        // Urutkan slot berdasarkan skor terbaik
        usort($validSlots, fn($a, $b) => $b['score'] <=> $a['score']);

        return $validSlots;
    }

    /**
     * Cek apakah guru berhalangan pada hari dan slot tertentu
     */
    protected function isTeacherUnavailable(int $teacherId, string $day, int $slotIndex): bool
    {
        // Berhalangan sepanjang hari
        if (!empty($this->unavailabilities[$teacherId][$day]['all'])) {
            return true;
        }

        // Berhalangan pada slot spesifik
        if (!empty($this->unavailabilities[$teacherId][$day][$slotIndex])) {
            return true;
        }

        return false;
    }

    /**
     * Muat data ketidaksediaan guru ke dalam memori
     */
    protected function loadUnavailabilities(): void
    {
        $this->unavailabilities = [];
        $records = TeacherUnavailability::all();

        foreach ($records as $r) {
            if ($r->slot_index === null) {
                $this->unavailabilities[$r->teacher_id][$r->day]['all'] = true;
            } else {
                $this->unavailabilities[$r->teacher_id][$r->day][$r->slot_index] = true;
            }
        }
    }

    /**
     * Muat data batasan beban guru (kuota maksimal hari & jam per hari)
     */
    protected function loadTeacherConstraints(): void
    {
        $this->teacherConstraints = [];
        $records = TeacherScheduleConstraint::all();

        foreach ($records as $r) {
            $this->teacherConstraints[$r->teacher_id] = [
                'max_days_per_week' => $r->max_days_per_week ? (int) $r->max_days_per_week : null,
                'max_hours_per_day' => $r->max_hours_per_day ? (int) $r->max_hours_per_day : null,
            ];
        }
    }

    /**
     * Pecah setiap TeachingAssignment menjadi blok sesi pertemuan (misal 4 JP -> 2x2 JP)
     */
    protected function decomposeAssignmentsToSessions($assignments): array
    {
        $sessions = [];
        $teacherTotalHours = [];

        foreach ($assignments as $a) {
            $tId = $a->teacher_id;
            $teacherTotalHours[$tId] = ($teacherTotalHours[$tId] ?? 0) + $a->total_hours;
        }

        $sessionCounter = 1;

        foreach ($assignments as $a) {
            $remaining = (int) $a->total_hours;
            $maxPerDay = max(1, (int) ($a->max_hours_per_day ?: 2));
            $room = $a->room ?: \App\Services\AscTimetableImporterService::inferLabRoom($a->academicClass->name ?? '', $a->subject->name ?? '');

            while ($remaining > 0) {
                // Tentukan durasi blok pertemuan ini
                $dur = ($remaining >= $maxPerDay) ? $maxPerDay : $remaining;
                $remaining -= $dur;

                $sessions[] = [
                    'id' => $sessionCounter++,
                    'assignment_id' => $a->id,
                    'class_id' => $a->academic_class_id,
                    'class_name' => $a->academicClass->name ?? "Kelas #{$a->academic_class_id}",
                    'teacher_id' => $a->teacher_id,
                    'teacher_name' => $a->teacher->name ?? "Guru #{$a->teacher_id}",
                    'subject_id' => $a->subject_id,
                    'subject_name' => $a->subject->name ?? "Mapel #{$a->subject_id}",
                    'room' => $room,
                    'duration' => $dur,
                    'allowed_days' => $a->allowed_days ?: [],
                    'teacher_load' => $teacherTotalHours[$a->teacher_id] ?? 0,
                ];
            }
        }

        return $sessions;
    }

    /**
     * Format sesi terpasang menjadi daftar jadwal dengan waktu mulai dan selesai riil
     */
    protected function formatPlacedSchedules(array $placedSessions): array
    {
        $result = [];

        foreach ($placedSessions as $item) {
            $day = $item['day'];
            $startSlot = $item['start_slot'];
            $endSlot = $item['end_slot'];

            $daySlots = $this->lessonHoursByDay[$day] ?? [];
            $startTime = $daySlots[$startSlot]['start'] ?? '07:30';
            $endTime = $daySlots[$endSlot]['end'] ?? '08:45';
            $slotLabel = ($startSlot === $endSlot)
                ? ($daySlots[$startSlot]['label'] ?? "Jam ke-" . ($startSlot + 1))
                : ($daySlots[$startSlot]['label'] ?? "Jam ke-" . ($startSlot + 1)) . " - " . ($daySlots[$endSlot]['label'] ?? "Jam ke-" . ($endSlot + 1));

            $result[] = [
                'class_id' => $item['class_id'],
                'class_name' => $item['class_name'],
                'teacher_id' => $item['teacher_id'],
                'teacher_name' => $item['teacher_name'],
                'subject' => $item['subject_name'],
                'subject_id' => $item['subject_id'],
                'room' => $item['room'] ?? null,
                'day' => $day,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'start_slot' => $startSlot,
                'end_slot' => $endSlot,
                'duration' => $item['duration'],
                'slot_label' => $slotLabel,
            ];
        }

        return $result;
    }

    /**
     * Terapkan hasil generate ke tabel resmi `schedules`
     *
     * @param array $schedulesData Hasil jadwal yang telah diformat
     * @param array $classIds Kelas yang ingin digantikan jadwalnya
     * @return int Jumlah jadwal yang berhasil disimpan
     */
    public function applyToOfficialSchedules(array $schedulesData, array $classIds = []): int
    {
        return DB::transaction(function () use ($schedulesData, $classIds) {
            // Hapus jadwal lama untuk kelas terpilih (jika ada)
            $deleteQuery = Schedule::query();
            if (!empty($classIds)) {
                $deleteQuery->whereIn('class_id', $classIds);
            }
            $deleteQuery->delete();

            $insertedCount = 0;
            foreach ($schedulesData as $item) {
                Schedule::create([
                    'class_id' => $item['class_id'],
                    'teacher_id' => $item['teacher_id'],
                    'subject' => $item['subject'],
                    'room' => $item['room'] ?? null,
                    'day' => $item['day'],
                    'start_time' => (strlen($item['start_time']) === 5 ? $item['start_time'] . ':00' : $item['start_time']),
                    'end_time' => (strlen($item['end_time']) === 5 ? $item['end_time'] . ':00' : $item['end_time']),
                ]);
                $insertedCount++;
            }

            return $insertedCount;
        });
    }

    /**
     * Tempatkan sesi ke dalam grid kelas, guru, ruangan, dan daftar hasil
     */
    protected function placeSessionInGrid(
        array $session,
        string $day,
        int $startSlot,
        array &$classGrid,
        array &$teacherGrid,
        array &$roomGrid,
        array &$placedSessions
    ): void {
        $duration = $session['duration'];
        for ($i = 0; $i < $duration; $i++) {
            $classGrid[$session['class_id']][$day][$startSlot + $i] = $session['id'];
            $teacherGrid[$session['teacher_id']][$day][$startSlot + $i] = $session['id'];
            if (!empty($session['room'])) {
                $roomGrid[$session['room']][$day][$startSlot + $i] = $session['id'];
            }
        }

        $placedSessions[] = [
            'session_id' => $session['id'],
            'class_id' => $session['class_id'],
            'class_name' => $session['class_name'],
            'teacher_id' => $session['teacher_id'],
            'teacher_name' => $session['teacher_name'],
            'subject_id' => $session['subject_id'],
            'subject_name' => $session['subject_name'],
            'room' => $session['room'] ?? null,
            'day' => $day,
            'start_slot' => $startSlot,
            'end_slot' => $startSlot + $duration - 1,
            'duration' => $duration,
        ];
    }

    /**
     * Hapus penempatan sesi dari grid
     */
    protected function removeSessionFromGrid(
        int|string $sessionId,
        array &$classGrid,
        array &$teacherGrid,
        array &$roomGrid,
        array &$placedSessions
    ): void {
        foreach ($placedSessions as $k => $p) {
            if ($p['session_id'] == $sessionId) {
                $day = $p['day'];
                $startSlot = $p['start_slot'];
                $duration = $p['duration'];
                for ($i = 0; $i < $duration; $i++) {
                    unset($classGrid[$p['class_id']][$day][$startSlot + $i]);
                    unset($teacherGrid[$p['teacher_id']][$day][$startSlot + $i]);
                    if (!empty($p['room'])) {
                        unset($roomGrid[$p['room']][$day][$startSlot + $i]);
                    }
                }
                unset($placedSessions[$k]);
                $placedSessions = array_values($placedSessions);
                break;
            }
        }
    }

    /**
     * Pergeseran cerdas 1-langkah (Ripple Swap) untuk membuka ruang bagi sesi yang belum tertempatkan
     */
    protected function attemptRippleSwap(
        array $session,
        array &$classGrid,
        array &$teacherGrid,
        array &$roomGrid,
        array &$placedSessions
    ): bool {
        $classId = $session['class_id'];
        $teacherId = $session['teacher_id'];
        $duration = $session['duration'];

        foreach ($this->lessonHoursByDay as $day => $slots) {
            if (!empty($session['allowed_days']) && !in_array($day, $session['allowed_days'])) {
                continue;
            }

            $slotCount = count($slots);
            if ($slotCount < $duration) {
                continue;
            }

            for ($start = 0; $start <= ($slotCount - $duration); $start++) {
                // Cek apakah guru dan lab bebas pada rentang slot ini
                $teacherAndRoomFree = true;
                for ($o = 0; $o < $duration; $o++) {
                    $curr = $start + $o;
                    if (isset($teacherGrid[$teacherId][$day][$curr]) || $this->isTeacherUnavailable($teacherId, $day, $curr)) {
                        $teacherAndRoomFree = false;
                        break;
                    }
                    if (!empty($session['room']) && isset($roomGrid[$session['room']][$day][$curr])) {
                        $teacherAndRoomFree = false;
                        break;
                    }
                }
                if (!$teacherAndRoomFree) {
                    continue;
                }

                // Cek sesi mana saja di kelas ini yang sedang menempati rentang slot tersebut
                $conflictingSessionIds = [];
                for ($o = 0; $o < $duration; $o++) {
                    $curr = $start + $o;
                    if (isset($classGrid[$classId][$day][$curr])) {
                        $conflictingSessionIds[$classGrid[$classId][$day][$curr]] = true;
                    }
                }

                // Jika hanya ada 1 sesi yang menghalangi, coba pindahkan sesi penghalang tersebut
                if (count($conflictingSessionIds) === 1) {
                    $targetId = array_key_first($conflictingSessionIds);
                    $targetPlaced = null;
                    foreach ($placedSessions as $p) {
                        if ($p['session_id'] == $targetId) {
                            $targetPlaced = $p;
                            break;
                        }
                    }

                    if ($targetPlaced !== null) {
                        $targetSession = [
                            'id' => $targetPlaced['session_id'],
                            'class_id' => $targetPlaced['class_id'],
                            'class_name' => $targetPlaced['class_name'],
                            'teacher_id' => $targetPlaced['teacher_id'],
                            'teacher_name' => $targetPlaced['teacher_name'],
                            'subject_id' => $targetPlaced['subject_id'],
                            'subject_name' => $targetPlaced['subject_name'],
                            'room' => $targetPlaced['room'],
                            'duration' => $targetPlaced['duration'],
                            'allowed_days' => [],
                        ];

                        // 1. Angkat sesi target sementara dari grid
                        $this->removeSessionFromGrid($targetId, $classGrid, $teacherGrid, $roomGrid, $placedSessions);

                        // 2. Tempatkan sesi baru ke slot yang telah dibebaskan terlebih dahulu
                        // sehingga grid terlindungi dan sesi target tidak akan memilih slot yang sama
                        $this->placeSessionInGrid(
                            $session,
                            $day,
                            $start,
                            $classGrid,
                            $teacherGrid,
                            $roomGrid,
                            $placedSessions
                        );

                        // 3. Cari slot alternatif untuk sesi target
                        $targetCandidates = $this->getCandidateSlotsForSession($targetSession, $classGrid, $teacherGrid, $roomGrid);

                        if (!empty($targetCandidates)) {
                            // Target menemukan slot alternatif yang aman dan bebas bentrok!
                            $bestAlternative = reset($targetCandidates);
                            $this->placeSessionInGrid(
                                $targetSession,
                                $bestAlternative['day'],
                                $bestAlternative['start_slot'],
                                $classGrid,
                                $teacherGrid,
                                $roomGrid,
                                $placedSessions
                            );
                            return true;
                        } else {
                            // Rollback: batalkan penempatan sesi baru dan kembalikan target ke slot semula
                            $this->removeSessionFromGrid($session['id'], $classGrid, $teacherGrid, $roomGrid, $placedSessions);
                            $this->placeSessionInGrid(
                                $targetSession,
                                $targetPlaced['day'],
                                $targetPlaced['start_slot'],
                                $classGrid,
                                $teacherGrid,
                                $roomGrid,
                                $placedSessions
                            );
                        }
                    }
                }
            }
        }

        return false;
    }
}
