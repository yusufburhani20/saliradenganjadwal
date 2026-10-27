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
        Schema::create('teacher_schedule_constraints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('max_days_per_week')->nullable(); // Maksimal hari hadir mengajar dlm seminggu (1-6)
            $table->unsignedTinyInteger('max_hours_per_day')->nullable(); // Maksimal JP per hari bagi guru ini
            $table->timestamps();

            $table->unique('teacher_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_schedule_constraints');
    }
};
