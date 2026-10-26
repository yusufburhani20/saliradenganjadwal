<?php

namespace App\Services;

use App\Models\AcademicClass;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\TeacherUnavailability;
use App\Models\Schedule;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ScheduleGeneratorService
{
    protected array $lessonHoursByDay = [];
    protected array $unavailabilities = []; // [teacher_id][day][slot_index] => true

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

        // 2. Ambil data ketidaksediaan guru
        $this->loadUnavailabilities();

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
        $greedyPlaced = [];

        foreach ($sessions as $session) {
            $candidateSlots = $this->getCandidateSlotsForSession($session, $greedyClassGrid, $greedyTeacherGrid);
            if (!empty($candidateSlots)) {
                $bestSlot = $candidateSlots[0];
                $day = $bestSlot['day'];
                $startSlot = $bestSlot['start_slot'];
                $duration = $session['duration'];

                for ($i = 0; $i < $duration; $i++) {
                    $greedyClassGrid[$session['class_id']][$day][$startSlot + $i] = $session['id'];
                    $greedyTeacherGrid[$session['teacher_id']][$day][$startSlot + $i] = $session['id'];
                }

                $greedyPlaced[] = [
                    'session_id' => $session['id'],
                    'class_id' => $session['class_id'],
                    'class_name' => $session['class_name'],
                    'teacher_id' => $session['teacher_id'],
                    'teacher_name' => $session['teacher_name'],
                    'subject_id' => $session['subject_id'],
                    'subject_name' => $session['subject_name'],
                    'day' => $day,
                    'start_slot' => $startSlot,
                    'end_slot' => $startSlot + $duration - 1,
                    'duration' => $duration,
                ];
            }
        }

        // 5b. Tahap 2: Backtracking Solver
        $classGrid = [];
        $teacherGrid = [];
        $placedSessions = [];
        $steps = 0;
        $bestPlaced = $greedyPlaced; // Gunakan greedy sebagai baseline awal

        if (count($greedyPlaced) === $totalSessions) {
            $finalPlaced = $greedyPlaced;
            $success = true;
            $steps = $totalSessions;
        } else {
            $success = $this->backtrack(
                $sessions,
                0,
                $classGrid,
                $teacherGrid,
                $placedSessions,
                $steps,
                $maxAttempts,
                $bestPlaced
            );
            $finalPlaced = $success ? $placedSessions : $bestPlaced;
        }

        $unplaced = [];
        $placedIds = array_column($finalPlaced, 'session_id');

        foreach ($sessions as $s) {
            if (!in_array($s['id'], $placedIds)) {
                $unplaced[] = [
                    'class_name' => $s['class_name'],
                    'subject_name' => $s['subject_name'],
                    'teacher_name' => $s['teacher_name'],
                    'duration' => $s['duration'] . ' JP',
                ];
            }
        }

        // 6. Transformasi ke format objek Schedule (siap simpan atau preview)
        $formattedSchedules = $this->formatPlacedSchedules($finalPlaced);

        $message = $success && empty($unplaced)
            ? 'Jadwal berhasil digenerate 100% tanpa bentrok!'
            : 'Jadwal berhasil digenerate dengan penempatan maksimal (' . count($finalPlaced) . ' dari ' . $totalSessions . ' sesi).';

        if (!empty($capacityWarnings)) {
            $message .= ' Perhatian: ' . implode(' ', $capacityWarnings);
        }

        return [
            'success' => $success && empty($unplaced),
            'message' => $message,
            'schedules' => $formattedSchedules,
            'placed_count' => count($finalPlaced),
            'total_count' => $totalSessions,
            'unplaced' => $unplaced,
            'capacity_warnings' => $capacityWarnings,
            'stats' => [
                'steps' => $steps,
                'efficiency' => round((count($finalPlaced) / $totalSessions) * 100, 1) . '%',
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
        $candidateSlots = $this->getCandidateSlotsForSession($session, $classGrid, $teacherGrid);

        foreach ($candidateSlots as $slot) {
            $day = $slot['day'];
            $startSlot = $slot['start_slot'];
            $duration = $session['duration'];

            // Terapkan penempatan
            for ($i = 0; $i < $duration; $i++) {
                $classGrid[$session['class_id']][$day][$startSlot + $i] = $session['id'];
                $teacherGrid[$session['teacher_id']][$day][$startSlot + $i] = $session['id'];
            }

            $placedItem = [
                'session_id' => $session['id'],
                'class_id' => $session['class_id'],
                'class_name' => $session['class_name'],
                'teacher_id' => $session['teacher_id'],
                'teacher_name' => $session['teacher_name'],
                'subject_id' => $session['subject_id'],
                'subject_name' => $session['subject_name'],
                'day' => $day,
                'start_slot' => $startSlot,
                'end_slot' => $startSlot + $duration - 1,
                'duration' => $duration,
            ];

            $placedSessions[] = $placedItem;

            if ($this->backtrack($sessions, $index + 1, $classGrid, $teacherGrid, $placedSessions, $steps, $maxAttempts, $bestPlaced)) {
                return true;
            }

            // Batalkan penempatan (Backtrack)
            array_pop($placedSessions);
            for ($i = 0; $i < $duration; $i++) {
                unset($classGrid[$session['class_id']][$day][$startSlot + $i]);
                unset($teacherGrid[$session['teacher_id']][$day][$startSlot + $i]);
            }
        }

        return false;
    }

    /**
     * Cari semua slot valid untuk sebuah sesi di semua hari KBM
     */
    protected function getCandidateSlotsForSession(array $session, array &$classGrid, array &$teacherGrid): array
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
                }

                if ($possible) {
                    // Beri bobot/skor: preferensi hari yang belum ada mapel ini
                    $score = 0;
                    if (!isset($daysWithSameSubject[$day])) {
                        $score += 10;
                    }
                    // Jam pagi lebih diprioritaskan
                    $score += max(0, 10 - $start);

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
                    'day' => $item['day'],
                    'start_time' => (strlen($item['start_time']) === 5 ? $item['start_time'] . ':00' : $item['start_time']),
                    'end_time' => (strlen($item['end_time']) === 5 ? $item['end_time'] . ':00' : $item['end_time']),
                ]);
                $insertedCount++;
            }

            return $insertedCount;
        });
    }
}
