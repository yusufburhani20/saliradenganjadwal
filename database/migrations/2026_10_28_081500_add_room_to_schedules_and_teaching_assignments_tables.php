<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('schedules') && !Schema::hasColumn('schedules', 'room')) {
            Schema::table('schedules', function (Blueprint $table) {
                $table->string('room', 50)->nullable()->after('subject');
            });
        }

        if (Schema::hasTable('teaching_assignments') && !Schema::hasColumn('teaching_assignments', 'room')) {
            Schema::table('teaching_assignments', function (Blueprint $table) {
                $table->string('room', 50)->nullable()->after('allowed_days');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('schedules') && Schema::hasColumn('schedules', 'room')) {
            Schema::table('schedules', function (Blueprint $table) {
                $table->dropColumn('room');
            });
        }

        if (Schema::hasTable('teaching_assignments') && Schema::hasColumn('teaching_assignments', 'room')) {
            Schema::table('teaching_assignments', function (Blueprint $table) {
                $table->dropColumn('room');
            });
        }
    }
};
