<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\AscTimetableImporterService;

class ImportAscTimetableSmk extends Command
{
    protected $signature = 'schedule:import-asc {file=111.xml} {--scope=smk : Filter scope: smk atau all} {--no-apply : Jangan terapkan ke tabel schedules resmi}';
    protected $description = 'Import Master Guru, Mapel, SKBM dan Jadwal dari aSc TimeTables XML';

    public function handle(AscTimetableImporterService $importer)
    {
        $filePath = $this->argument('file');
        if (!file_exists($filePath)) {
            $filePath = base_path($filePath);
        }

        if (!file_exists($filePath)) {
            $this->error("File XML tidak ditemukan di: {$filePath}");
            return 1;
        }

        $scope = $this->option('scope') ?: 'smk';
        $apply = !$this->option('no-apply');

        $this->info("=== MEMULAI IMPORT aSc TIMETABLES ===");
        $this->info("File: {$filePath}");
        $this->info("Scope: " . strtoupper($scope));
        $this->info("Terapkan ke Schedules: " . ($apply ? "YA" : "TIDAK"));

        $result = $importer->import($filePath, $scope, $apply);

        if (!$result['success']) {
            $this->error("Gagal: " . $result['message']);
            return 1;
        }

        $stats = $result['stats'];
        $this->info("\n✅ " . $result['message']);
        $this->line("  - Kelas Terpetakan: " . $stats['classes_count']);
        $this->line("  - Guru Tersinkron: " . $stats['teachers_count']);
        $this->line("  - Mapel Tersinkron: " . $stats['subjects_count']);
        $this->line("  - Alokasi SKBM: " . $stats['assignments_count']);
        $this->line("  - Jadwal Resmi (Schedules): " . $stats['schedules_count']);

        return 0;
    }
}
