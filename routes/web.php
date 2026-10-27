<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Admin Group A: Super Admin, Admin, Pimpinan, Staff/TU
    // Data Siswa (GET read-only untuk Pimpinan, dibatasi di controller)
    Route::middleware(['role:Super Admin|Kepala Sekolah|Staff/TU'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/students', [\App\Http\Controllers\Admin\StudentController::class, 'index'])->name('students.index');
        Route::get('/students/export', [\App\Http\Controllers\Admin\StudentController::class, 'export'])->name('students.export');
        Route::get('/students/template', [\App\Http\Controllers\Admin\StudentController::class, 'template'])->name('students.template');
        Route::get('/students/print-cards/{academic_class_id}', [\App\Http\Controllers\Admin\StudentController::class, 'printCards'])->name('students.print-cards');
        Route::get('/students/{student}/print-card', [\App\Http\Controllers\Admin\StudentController::class, 'printSingleCard'])->name('students.print-single-card');
        
        // Classes (read-only for pimpinan can be restricted similar to students if needed in the future, for now they don't see it per matrix, so it moves to Group B)
    });

    // Admin Group B: Super Admin, Admin, Staff/TU, Laboran Komputer
    // Manajemen Data Operasional
    Route::middleware(['role:Super Admin|Staff/TU|Laboran Komputer'])->prefix('admin')->name('admin.')->group(function () {
        // Students CRUD
        Route::post('/students', [\App\Http\Controllers\Admin\StudentController::class, 'store'])->name('students.store');
        Route::put('/students/{student}', [\App\Http\Controllers\Admin\StudentController::class, 'update'])->name('students.update');
        Route::delete('/students/{student}', [\App\Http\Controllers\Admin\StudentController::class, 'destroy'])->name('students.destroy');
        Route::post('/students/import', [\App\Http\Controllers\Admin\StudentController::class, 'import'])->name('students.import');
        Route::post('/students/import-photos', [\App\Http\Controllers\Admin\StudentController::class, 'importPhotos'])->name('students.import-photos');

        // Classes
        Route::get('/classes', [\App\Http\Controllers\Admin\AcademicClassController::class, 'index'])->name('classes.index');
        Route::post('/classes', [\App\Http\Controllers\Admin\AcademicClassController::class, 'store'])->name('classes.store');
        Route::put('/classes/{class}', [\App\Http\Controllers\Admin\AcademicClassController::class, 'update'])->name('classes.update');
        Route::delete('/classes/{class}', [\App\Http\Controllers\Admin\AcademicClassController::class, 'destroy'])->name('classes.destroy');
        Route::post('/classes/{class}/promote', [\App\Http\Controllers\Admin\AcademicClassController::class, 'promote'])->name('classes.promote');
        Route::get('/classes/export', [\App\Http\Controllers\Admin\AcademicClassController::class, 'export'])->name('classes.export');
        Route::post('/classes/import', [\App\Http\Controllers\Admin\AcademicClassController::class, 'import'])->name('classes.import');
        Route::get('/classes/template', [\App\Http\Controllers\Admin\AcademicClassController::class, 'template'])->name('classes.template');

        // Academic Years & Semesters
        Route::get('/academic-years', [\App\Http\Controllers\Admin\AcademicYearController::class, 'index'])->name('academic-years.index');
        Route::post('/academic-years', [\App\Http\Controllers\Admin\AcademicYearController::class, 'store'])->name('academic-years.store');
        Route::put('/academic-years/{academicYear}', [\App\Http\Controllers\Admin\AcademicYearController::class, 'update'])->name('academic-years.update');
        Route::delete('/academic-years/{academicYear}', [\App\Http\Controllers\Admin\AcademicYearController::class, 'destroy'])->name('academic-years.destroy');
        Route::post('/academic-years/{academicYear}/toggle', [\App\Http\Controllers\Admin\AcademicYearController::class, 'toggleActive'])->name('academic-years.toggle');
        Route::post('/semesters/{semester}/toggle', [\App\Http\Controllers\Admin\AcademicYearController::class, 'toggleSemester'])->name('semesters.toggle');

        // Subjects (Mata Pelajaran)
        Route::get('/subjects', [\App\Http\Controllers\Admin\SubjectController::class, 'index'])->name('subjects.index');
        Route::post('/subjects', [\App\Http\Controllers\Admin\SubjectController::class, 'store'])->name('subjects.store');
        Route::put('/subjects/{subject}', [\App\Http\Controllers\Admin\SubjectController::class, 'update'])->name('subjects.update');
        Route::delete('/subjects/{subject}', [\App\Http\Controllers\Admin\SubjectController::class, 'destroy'])->name('subjects.destroy');
        Route::get('/subjects/export', [\App\Http\Controllers\Admin\SubjectController::class, 'export'])->name('subjects.export');
        Route::get('/subjects/template', [\App\Http\Controllers\Admin\SubjectController::class, 'template'])->name('subjects.template');
        Route::post('/subjects/import', [\App\Http\Controllers\Admin\SubjectController::class, 'import'])->name('subjects.import');

        // Lesson Hours
        Route::get('/lesson-hours', [\App\Http\Controllers\Admin\LessonHourController::class, 'index'])->name('lesson-hours.index');
        Route::post('/lesson-hours', [\App\Http\Controllers\Admin\LessonHourController::class, 'update'])->name('lesson-hours.update');

        // Schedules (Manual CRUD)
        Route::get('/schedules', [\App\Http\Controllers\Admin\ScheduleController::class, 'index'])->name('schedules.index');
        Route::get('/schedules/export-pdf', [\App\Http\Controllers\Admin\SchedulePdfExportController::class, 'exportPdf'])->name('schedules.export-pdf');
        Route::post('/schedules', [\App\Http\Controllers\Admin\ScheduleController::class, 'store'])->name('schedules.store');
        Route::put('/schedules/{schedule}', [\App\Http\Controllers\Admin\ScheduleController::class, 'update'])->name('schedules.update');
        Route::delete('/schedules/{schedule}', [\App\Http\Controllers\Admin\ScheduleController::class, 'destroy'])->name('schedules.destroy');

        // Automatic Schedule Generator
        Route::get('/schedule-generator', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'index'])->name('schedule-generator.index');
        Route::post('/schedule-generator/assignments', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'storeAssignment'])->name('schedule-generator.assignments.store');
        Route::delete('/schedule-generator/assignments/{assignment}', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'destroyAssignment'])->name('schedule-generator.assignments.destroy');
        Route::post('/schedule-generator/auto-populate', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'autoPopulateFromClasses'])->name('schedule-generator.auto-populate');
        Route::post('/schedule-generator/batch-assign', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'batchAssignTeacher'])->name('schedule-generator.batch-assign');
        Route::post('/schedule-generator/clear', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'clearAssignments'])->name('schedule-generator.clear');
        Route::post('/schedule-generator/unavailabilities', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'storeUnavailability'])->name('schedule-generator.unavailabilities.store');
        Route::delete('/schedule-generator/unavailabilities/{unavailability}', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'destroyUnavailability'])->name('schedule-generator.unavailabilities.destroy');
        Route::post('/schedule-generator/constraints', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'storeConstraint'])->name('schedule-generator.constraints.store');
        Route::delete('/schedule-generator/constraints/{constraint}', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'destroyConstraint'])->name('schedule-generator.constraints.destroy');
        Route::post('/schedule-generator/generate', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'runGenerate'])->name('schedule-generator.generate');
        Route::post('/schedule-generator/apply', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'applySchedules'])->name('schedule-generator.apply');
        Route::post('/schedule-generator/import-asc', [\App\Http\Controllers\Admin\ScheduleGeneratorController::class, 'importAsc'])->name('schedule-generator.import-asc');

        // Inventory Management
        Route::prefix('inventory')->name('inventory.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\InventoryController::class, 'index'])->name('index');
            Route::get('/export/excel', [\App\Http\Controllers\Admin\InventoryController::class, 'exportExcel'])->name('export.excel');
            Route::get('/export/pdf', [\App\Http\Controllers\Admin\InventoryController::class, 'exportPdf'])->name('export.pdf');
            Route::post('/', [\App\Http\Controllers\Admin\InventoryController::class, 'store'])->name('store');
            Route::get('/logs', [\App\Http\Controllers\Admin\InventoryController::class, 'logs'])->name('logs');
            Route::get('/scanner', [\App\Http\Controllers\Admin\InventoryBarcodeController::class, 'scanner'])->name('scanner');
            Route::post('/scan', [\App\Http\Controllers\Admin\InventoryBarcodeController::class, 'scan'])->name('scan');
            Route::post('/action', [\App\Http\Controllers\Admin\InventoryBarcodeController::class, 'action'])->name('action');
            Route::post('/categories', [\App\Http\Controllers\Admin\InventoryController::class, 'storeCategory'])->name('categories.store');
            Route::post('/{item}/barcodes', [\App\Http\Controllers\Admin\InventoryBarcodeController::class, 'store'])->name('barcodes.store');
            Route::delete('/barcodes/{barcode}', [\App\Http\Controllers\Admin\InventoryBarcodeController::class, 'destroy'])->name('barcodes.destroy');
            Route::get('/{item}', [\App\Http\Controllers\Admin\InventoryController::class, 'show'])->name('show');
            Route::put('/{item}', [\App\Http\Controllers\Admin\InventoryController::class, 'update'])->name('update');
            Route::delete('/{item}', [\App\Http\Controllers\Admin\InventoryController::class, 'destroy'])->name('destroy');
        });

        // Computer Lab & PC Management
        Route::get('/computer-labs', [\App\Http\Controllers\Admin\ComputerLabController::class, 'index'])->name('computer-labs.index');
        Route::post('/computer-labs', [\App\Http\Controllers\Admin\ComputerLabController::class, 'store'])->name('computer-labs.store');
        Route::get('/computer-labs/{lab}', [\App\Http\Controllers\Admin\ComputerLabController::class, 'show'])->name('computer-labs.show');
        Route::put('/computer-labs/{lab}', [\App\Http\Controllers\Admin\ComputerLabController::class, 'update'])->name('computer-labs.update');
        Route::delete('/computer-labs/{lab}', [\App\Http\Controllers\Admin\ComputerLabController::class, 'destroy'])->name('computer-labs.destroy');
        Route::post('/computer-labs/{lab}/units', [\App\Http\Controllers\Admin\ComputerLabController::class, 'storeUnit'])->name('computer-labs.units.store');
        Route::get('/computer-labs/{lab}/print-qrs', [\App\Http\Controllers\Admin\ComputerLabController::class, 'printQrs'])->name('computer-labs.print-qrs');
        Route::post('/computer-labs/{lab}/send-report', [\App\Http\Controllers\Admin\ComputerLabController::class, 'sendReport'])->name('computer-labs.send-report');
        Route::get('/computer-labs/{lab}/download-report', [\App\Http\Controllers\Admin\ComputerLabController::class, 'downloadReport'])->name('computer-labs.download-report');

        Route::put('/computer-units/{unit}', [\App\Http\Controllers\Admin\ComputerLabController::class, 'updateUnit'])->name('computer-units.update');
        Route::delete('/computer-units/{unit}', [\App\Http\Controllers\Admin\ComputerLabController::class, 'destroyUnit'])->name('computer-units.destroy');

        Route::get('/computer-issues', [\App\Http\Controllers\Admin\ComputerIssueController::class, 'index'])->name('computer-issues.index');
        Route::post('/computer-issues/{issue}/resolve', [\App\Http\Controllers\Admin\ComputerIssueController::class, 'resolve'])->name('computer-issues.resolve');
        Route::post('/computer-issues/{issue}/process', [\App\Http\Controllers\Admin\ComputerIssueController::class, 'process'])->name('computer-issues.process');
    });

    // Admin Group C: Super Admin, Admin, Pimpinan, Bendahara
    // Laporan, Approval, Tagihan, Keuangan, Absensi
    Route::middleware(['role:Super Admin|Kepala Sekolah|Bendahara'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/leader-dashboard', [\App\Http\Controllers\Admin\LeaderDashboardController::class, 'index'])->name('leader-dashboard');
        
        // Approvals (Pimpinan & Admin)
        Route::get('/approvals', [\App\Http\Controllers\Admin\ApprovalController::class, 'index'])->name('approvals.index');
        Route::put('/approvals/{approval}', [\App\Http\Controllers\Admin\ApprovalController::class, 'update'])->name('approvals.update');

        // Attendances (Admin View)
        Route::get('/attendances', [\App\Http\Controllers\Admin\AttendanceController::class, 'index'])->name('attendances.index');
        Route::get('/attendances/export/excel', [\App\Http\Controllers\Admin\AttendanceController::class, 'exportExcel'])->name('attendances.export.excel');
        Route::get('/attendances/export/pdf', [\App\Http\Controllers\Admin\AttendanceController::class, 'exportPdf'])->name('attendances.export.pdf');
    });

    // Reports / Rekapitulasi (Accessible to Super Admin, Kepala Sekolah, Bendahara, and Kepala Program)
    Route::middleware(['role:Super Admin|Kepala Sekolah|Bendahara|Kepala Program'])->prefix('admin')->name('admin.')->group(function () {
        Route::prefix('reports')->name('reports.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\RecapController::class, 'index'])->name('index');
            
            // Attendance
            Route::get('/attendance/data', [\App\Http\Controllers\Admin\RecapController::class, 'attendanceData'])->name('attendance.data');
            Route::get('/attendance/export', [\App\Http\Controllers\Admin\RecapController::class, 'attendanceExport'])->name('attendance.export');
            Route::get('/attendance/pdf', [\App\Http\Controllers\Admin\RecapController::class, 'attendancePdf'])->name('attendance.pdf');
            
            // Attendance per Subject (Mapel)
            Route::get('/attendance-subject/data', [\App\Http\Controllers\Admin\RecapController::class, 'attendanceSubjectData'])->name('attendance-subject.data');
            Route::get('/attendance-subject/export', [\App\Http\Controllers\Admin\RecapController::class, 'attendanceSubjectExport'])->name('attendance-subject.export');
            Route::get('/attendance-subject/pdf', [\App\Http\Controllers\Admin\RecapController::class, 'attendanceSubjectPdf'])->name('attendance-subject.pdf');
            
            // Assessments (Penilaian)
            Route::get('/assessments/data', [\App\Http\Controllers\Admin\RecapController::class, 'assessmentData'])->name('assessments.data');
            Route::get('/assessments/export', [\App\Http\Controllers\Admin\RecapController::class, 'assessmentExport'])->name('assessments.export');
            Route::get('/assessments/pdf', [\App\Http\Controllers\Admin\RecapController::class, 'assessmentPdf'])->name('assessments.pdf');
            
            // Agendas (Jurnal)
            Route::get('/agendas/data', [\App\Http\Controllers\Admin\RecapController::class, 'agendaData'])->name('agendas.data');
            Route::get('/agendas/export', [\App\Http\Controllers\Admin\RecapController::class, 'agendaExport'])->name('agendas.export');
            Route::get('/agendas/pdf', [\App\Http\Controllers\Admin\RecapController::class, 'agendaPdf'])->name('agendas.pdf');
            
            // Consultations (Bimbingan)
            Route::get('/consultations/data', [\App\Http\Controllers\Admin\RecapController::class, 'consultationData'])->name('consultations.data');
            Route::get('/consultations/export', [\App\Http\Controllers\Admin\RecapController::class, 'consultationExport'])->name('consultations.export');
            Route::get('/consultations/pdf', [\App\Http\Controllers\Admin\RecapController::class, 'consultationPdf'])->name('consultations.pdf');

            // Student Resume (Laporan Orang Tua)
            Route::get('/student-resume', [\App\Http\Controllers\Admin\StudentReportController::class, 'resume'])->name('student-resume');
            Route::get('/student-resume/data', [\App\Http\Controllers\Admin\StudentReportController::class, 'resumeData'])->name('student-resume.data');
            Route::get('/student-resume/pdf', [\App\Http\Controllers\Admin\StudentReportController::class, 'resumePdf'])->name('student-resume.pdf');
        });
    });

    // Admin Group C continued: Super Admin, Admin, Pimpinan, Bendahara (Finance/Bills)
    Route::middleware(['role:Super Admin|Kepala Sekolah|Bendahara'])->prefix('admin')->name('admin.')->group(function () {
        // Bills / Financial
        Route::get('/bills', [\App\Http\Controllers\Admin\BillController::class, 'index'])->name('bills.index');
        Route::get('/bills/create', [\App\Http\Controllers\Admin\BillController::class, 'create'])->name('bills.create');
        Route::post('/bills', [\App\Http\Controllers\Admin\BillController::class, 'store'])->name('bills.store');
        Route::post('/bills/sync/{id?}', [\App\Http\Controllers\Admin\BillController::class, 'checkStatus'])->name('bills.sync');
        Route::post('/bills/{bill}/mark-paid', [\App\Http\Controllers\Admin\BillController::class, 'markAsPaidManual'])->name('bills.mark-paid');
        Route::post('/bills/settings', [\App\Http\Controllers\Admin\BillController::class, 'updateSettings'])->name('bills.settings');

        // Finance Analytics
        Route::get('/finance', [\App\Http\Controllers\Admin\FinanceController::class, 'index'])->name('finance.index');
        
        // Finance Categories
        Route::resource('/finance/categories', \App\Http\Controllers\Admin\FinanceCategoryController::class)->names('finance.categories');
        
        // Expenses
        Route::resource('/finance/expenses', \App\Http\Controllers\Admin\ExpenseController::class)->names('finance.expenses');
    });

    // Admin Group D: Super Admin, Admin
    // Konfigurasi Sistem
    Route::middleware(['role:Super Admin'])->prefix('admin')->name('admin.')->group(function () {
        // Settings
        Route::get('/settings', [\App\Http\Controllers\Admin\SettingController::class, 'index'])->name('settings.index');
        Route::post('/settings', [\App\Http\Controllers\Admin\SettingController::class, 'update'])->name('settings.update');
        Route::post('/settings/system-update', [\App\Http\Controllers\Admin\SettingController::class, 'systemUpdate'])->name('settings.system-update');
        Route::get('/settings/update-logs', [\App\Http\Controllers\Admin\SettingController::class, 'updateLogs'])->name('settings.update-logs');
        Route::get('/settings/backup', [\App\Http\Controllers\Admin\SettingController::class, 'backup'])->name('settings.backup');
        Route::post('/settings/restore', [\App\Http\Controllers\Admin\SettingController::class, 'restore'])->name('settings.restore');
        Route::post('/settings/reset', [\App\Http\Controllers\Admin\SettingController::class, 'reset'])->name('settings.reset');

        // Notification Settings (Super Admin Only)
        Route::middleware(['role:Super Admin'])->group(function () {
            Route::get('/settings/notifications', [\App\Http\Controllers\Admin\NotificationSettingController::class, 'index'])->name('settings.notifications.index');
            Route::post('/settings/notifications/matrix', [\App\Http\Controllers\Admin\NotificationSettingController::class, 'updateMatrix'])->name('settings.notifications.matrix');
            Route::post('/settings/notifications/templates', [\App\Http\Controllers\Admin\NotificationSettingController::class, 'updateTemplates'])->name('settings.notifications.templates');
            Route::get('/settings/whatsapp-status', [\App\Http\Controllers\Admin\NotificationSettingController::class, 'whatsappStatus'])->name('settings.whatsapp-status');
            Route::post('/settings/whatsapp-restart', [\App\Http\Controllers\Admin\NotificationSettingController::class, 'restartWhatsapp'])->name('settings.whatsapp-restart');
            Route::post('/settings/notifications/test', [\App\Http\Controllers\Admin\NotificationSettingController::class, 'testSend'])->name('settings.notifications.test');
            Route::post('/settings/notifications/broadcast', [\App\Http\Controllers\Admin\NotificationSettingController::class, 'broadcast'])->name('settings.notifications.broadcast');
        });

        // Geofences
        Route::apiResource('geofences', \App\Http\Controllers\Admin\GeofenceController::class)->except(['show']);
        
        // Announcements
        Route::resource('/announcements', \App\Http\Controllers\Admin\AnnouncementController::class)->names('announcements');
        
        // Users (Super Admin Only)
        Route::middleware(['role:Super Admin'])->group(function () {
            Route::get('users/export', [\App\Http\Controllers\Admin\UserController::class, 'export'])->name('users.export');
            Route::post('users/import', [\App\Http\Controllers\Admin\UserController::class, 'import'])->name('users.import');
            Route::get('users/template', [\App\Http\Controllers\Admin\UserController::class, 'template'])->name('users.template');
            Route::resource('users', \App\Http\Controllers\Admin\UserController::class)->except(['show']);
        });

        // Drive Management
        Route::prefix('drive')->name('drive.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\DriveManagementController::class, 'index'])->name('index');
            Route::delete('/{id}', [\App\Http\Controllers\Admin\DriveManagementController::class, 'destroy'])->name('destroy');
            Route::post('/{id}/revoke-link', [\App\Http\Controllers\Admin\DriveManagementController::class, 'revokeLink'])->name('revoke-link');
        });

    });

    // Event Management (Accessible to Super Admin, Kepala Sekolah, Staff/TU, and Kepala Program)
    Route::middleware(['role:Super Admin|Kepala Sekolah|Staff/TU|Kepala Program'])->prefix('admin')->name('admin.')->group(function () {
        Route::patch('events/{event}/toggle-status', [\App\Http\Controllers\Admin\EventController::class, 'toggleStatus'])->name('events.toggle-status');
        Route::get('events/{event}/export-excel', [\App\Http\Controllers\Admin\EventController::class, 'exportExcel'])->name('events.export-excel');
        Route::get('events/{event}/export-pdf', [\App\Http\Controllers\Admin\EventController::class, 'exportPdf'])->name('events.export-pdf');
        Route::resource('events', \App\Http\Controllers\Admin\EventController::class);
        Route::get('events/{event}/attendances', [\App\Http\Controllers\Admin\EventController::class, 'attendances'])->name('events.attendances');
    });

    // Staff / User Routes
    Route::get('/attendances/scanner', function (Illuminate\Http\Request $request) {
        $todayAttendance = \App\Models\Attendance::where('user_id', $request->user()->id)
            ->whereDate('date', today())
            ->first();
        $geofences = \App\Models\Geofence::where('is_active', true)->get();
        
        return Inertia::render('User/Attendances/Scanner', [
            'todayAttendance' => $todayAttendance,
            'geofences' => $geofences
        ]);
    })->name('attendances.scanner');
    
    Route::post('/attendances/check-in', [\App\Http\Controllers\AttendanceController::class, 'checkIn'])->name('attendances.check-in');
    Route::post('/attendances/check-out', [\App\Http\Controllers\AttendanceController::class, 'checkOut'])->name('attendances.check-out');
    Route::get('/attendances/history', [\App\Http\Controllers\AttendanceController::class, 'history'])->name('attendances.history');
    
    // User Permissions (Izin/Cuti)
    Route::resource('permissions', \App\Http\Controllers\User\PermissionController::class)->names('user.permissions')->only(['index', 'store', 'destroy']);
    
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // Notifications
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/{id}/redirect', [\App\Http\Controllers\NotificationController::class, 'readAndRedirect'])->name('notifications.redirect');
    Route::patch('/notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
    Route::patch('/notifications/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');

    // Teacher Routes
    Route::middleware(['auth', 'role:Super Admin|Guru|Wali Kelas|Pengawas Malam'])->prefix('teacher')->name('teacher.')->group(function () {
        // Evening Study (Belajar Malam)
        Route::get('/evening-studies/students/{classId}', [\App\Http\Controllers\Teacher\EveningStudyController::class, 'getStudents'])->name('evening-studies.students');
        Route::get('/evening-studies/export/excel', [\App\Http\Controllers\Teacher\EveningStudyController::class, 'exportExcel'])->name('evening-studies.export.excel');
        Route::get('/evening-studies/export/pdf', [\App\Http\Controllers\Teacher\EveningStudyController::class, 'exportPdf'])->name('evening-studies.export.pdf');
        Route::resource('evening-studies', \App\Http\Controllers\Teacher\EveningStudyController::class);

        // Class Agendas
        Route::get('/agendas', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'index'])->name('agendas.index');
        Route::get('/agendas/create', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'create'])->name('agendas.create');
        Route::get('/agendas/students/{classId}', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'getStudents'])->name('agendas.students');
        Route::get('/agendas/booked-periods', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'getBookedPeriods'])->name('agendas.booked-periods');
        Route::get('/agendas/{id}', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'show'])->name('agendas.show');
        Route::get('/agendas/{id}/edit', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'edit'])->name('agendas.edit');
        Route::post('/agendas', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'store'])->name('agendas.store');
        Route::get('/agendas/export/excel', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'exportExcel'])->name('agendas.export.excel');
        Route::get('/agendas/export/pdf', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'exportPdf'])->name('agendas.export.pdf');
        Route::put('/agendas/{id}', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'update'])->name('agendas.update');
        Route::delete('/agendas/{id}', [\App\Http\Controllers\Teacher\ClassAgendaController::class, 'destroy'])->name('agendas.destroy');

        // Daily Assessments (Scores)
        Route::get('/assessments/export/excel', [\App\Http\Controllers\Teacher\DailyAssessmentController::class, 'exportExcel'])->name('assessments.export.excel');
        Route::get('/assessments/export/pdf', [\App\Http\Controllers\Teacher\DailyAssessmentController::class, 'exportPdf'])->name('assessments.export.pdf');
        Route::resource('assessments', \App\Http\Controllers\Teacher\DailyAssessmentController::class);

        // Final Assessments — ASAS & ASAT
        Route::get('/final-assessments/export/excel', [\App\Http\Controllers\Teacher\FinalAssessmentController::class, 'exportExcel'])->name('final-assessments.export.excel');
        Route::get('/final-assessments/export/pdf', [\App\Http\Controllers\Teacher\FinalAssessmentController::class, 'exportPdf'])->name('final-assessments.export.pdf');
        Route::get('/final-assessments/students/{classId}', [\App\Http\Controllers\Teacher\FinalAssessmentController::class, 'getStudents'])->name('final-assessments.students');
        Route::resource('final-assessments', \App\Http\Controllers\Teacher\FinalAssessmentController::class);
        
        // Student Guidance (Guru Wali / Guru BK / Wali Kelas / Guru)
        // Note: as per implementation plan, Guru/Dosen and Wali Kelas both have access to bimbingan
        Route::get('/consultations', [\App\Http\Controllers\Teacher\ConsultationController::class, 'index'])->name('consultations.index');
        Route::post('/consultations', [\App\Http\Controllers\Teacher\ConsultationController::class, 'store'])->name('consultations.store');
        Route::put('/consultations/{consultation}', [\App\Http\Controllers\Teacher\ConsultationController::class, 'update'])->name('consultations.update');
        Route::delete('/consultations/{consultation}', [\App\Http\Controllers\Teacher\ConsultationController::class, 'destroy'])->name('consultations.destroy');
        Route::get('/consultations/export/excel', [\App\Http\Controllers\Teacher\ConsultationController::class, 'exportExcel'])->name('consultations.export.excel');
        Route::get('/consultations/export/pdf', [\App\Http\Controllers\Teacher\ConsultationController::class, 'exportPdf'])->name('consultations.export.pdf');
        Route::get('/consultations/students/{classId}', [\App\Http\Controllers\Teacher\ConsultationController::class, 'getStudents'])->name('consultations.students');
    });

    // Wali Kelas Specific Routes (Resume & Kirim Laporan)
    Route::middleware(['auth', 'role:Super Admin|Wali Kelas'])->prefix('teacher')->name('teacher.')->group(function () {
        Route::get('/my-students', [\App\Http\Controllers\Teacher\StudentResumeController::class, 'index'])->name('my-students.index');
        Route::get('/my-students/{student}/resume', [\App\Http\Controllers\Teacher\StudentResumeController::class, 'show'])->name('my-students.resume');
        Route::get('/my-students/{student}/resume-data', [\App\Http\Controllers\Teacher\StudentResumeController::class, 'data'])->name('my-students.resume-data');
        Route::get('/my-students/{student}/resume-pdf', [\App\Http\Controllers\Teacher\StudentResumeController::class, 'pdf'])->name('my-students.resume-pdf');
        Route::post('/my-students/{student}/send-report', [\App\Http\Controllers\Teacher\StudentResumeController::class, 'sendReport'])->name('my-students.send-report');
        Route::post('/my-students/send-bulk-report', [\App\Http\Controllers\Teacher\StudentResumeController::class, 'sendBulkReport'])->name('my-students.send-bulk-report');
    });
});

// Telegram Webhook
Route::post('/webhook/telegram', [\App\Http\Controllers\TelegramController::class, 'handle']);

// Midtrans Webhook (S2S)
Route::post('/webhook/midtrans', [\App\Http\Controllers\Webhook\MidtransController::class, 'handle']);

// Public Invoice Page
Route::get('/invoice/{bill_number}', [\App\Http\Controllers\InvoiceController::class, 'show'])->name('invoice.show');
Route::get('/invoice/{bill_number}/pdf', [\App\Http\Controllers\InvoiceController::class, 'downloadPdf'])->name('invoice.pdf');
Route::post('/invoice/{bill_number}/prepare-payment', [\App\Http\Controllers\InvoiceController::class, 'preparePayment'])->name('invoice.prepare-payment');

// Public Drive Link
Route::get('/drive/p/{token}', [\App\Http\Controllers\PublicDriveController::class, 'download'])->name('drive.public.download');
Route::get('/drive/f/{token}', [\App\Http\Controllers\PublicDriveFolderController::class, 'show'])->name('drive.public.folder');
Route::get('/drive/f/{token}/download/{file_id}', [\App\Http\Controllers\PublicDriveFolderController::class, 'downloadFile'])->name('drive.public.folder.download');

// Public Computer Issue Report (Scan QR PC)
Route::get('/public/computer-issues/report', [\App\Http\Controllers\Admin\ComputerIssueController::class, 'reportForm'])->name('public.computer-issues.report');
Route::post('/public/computer-issues/report', [\App\Http\Controllers\Admin\ComputerIssueController::class, 'storeIssue'])->name('public.computer-issues.report.store');

// Student Portal Routes
Route::prefix('portal')->name('portal.')->group(function () {
    Route::middleware('guest:student')->group(function () {
        Route::get('/login', [\App\Http\Controllers\Portal\StudentAuthController::class, 'showLoginForm'])->name('login');
        Route::post('/login', [\App\Http\Controllers\Portal\StudentAuthController::class, 'login']);
    });

    // Public Presence Scanner (Kiosk Mode)
    Route::get('/attendance/scanner', [\App\Http\Controllers\Portal\PresenceScannerController::class, 'index'])->name('attendance.scanner');
    Route::post('/attendance/scan', [\App\Http\Controllers\Portal\PresenceScannerController::class, 'scan'])->name('attendance.scan');

    Route::middleware(['auth:student', \App\Http\Middleware\PreventBackNavigation::class])->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\Portal\PortalController::class, 'dashboard'])->name('dashboard');
        Route::get('/bills', [\App\Http\Controllers\Portal\PortalController::class, 'bills'])->name('bills');
        Route::get('/attendance', [\App\Http\Controllers\Portal\PortalController::class, 'attendance'])->name('attendance');
        Route::get('/scores', [\App\Http\Controllers\Portal\PortalController::class, 'scores'])->name('scores');
        Route::get('/id-card', [\App\Http\Controllers\Portal\PortalController::class, 'idCard'])->name('id-card');
        
        // Presence Scanner (Old location - removed as it's now public)

        
        Route::get('/profile', [\App\Http\Controllers\Portal\ProfileController::class, 'edit'])->name('profile.edit');
        Route::put('/profile', [\App\Http\Controllers\Portal\ProfileController::class, 'update'])->name('profile.update');

        Route::get('/report', [\App\Http\Controllers\Portal\PortalController::class, 'reportPdf'])->name('report');

        // Permissions (Izin/Sakit)
        Route::get('/permissions', [\App\Http\Controllers\Portal\StudentPermissionController::class, 'index'])->name('permissions.index');
        Route::post('/permissions', [\App\Http\Controllers\Portal\StudentPermissionController::class, 'store'])->name('permissions.store');
        Route::delete('/permissions/{permission}', [\App\Http\Controllers\Portal\StudentPermissionController::class, 'destroy'])->name('permissions.destroy');

        // Notifications
        Route::get('/notifications', [\App\Http\Controllers\Portal\PortalController::class, 'notifications'])->name('notifications.index');
        Route::patch('/notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
        Route::patch('/notifications/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');

        Route::post('/logout', [\App\Http\Controllers\Portal\StudentAuthController::class, 'destroy'])->name('logout');
    });
});

Route::middleware(['auth:web,student'])->group(function () {
    Route::post('/api/push-subscriptions', [\App\Http\Controllers\PushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
    Route::post('/api/push-subscriptions/unsubscribe', [\App\Http\Controllers\PushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');
    
    // Drive Routes (Personal & Shared)
    Route::prefix('drive')->name('drive.')->group(function () {
        Route::get('/', [\App\Http\Controllers\DriveController::class, 'index'])->name('index');
        Route::post('/', [\App\Http\Controllers\DriveController::class, 'store'])->name('store');
        Route::get('/{id}/download', [\App\Http\Controllers\DriveController::class, 'download'])->name('download');
        Route::put('/{id}', [\App\Http\Controllers\DriveController::class, 'update'])->name('update');
        Route::delete('/{id}', [\App\Http\Controllers\DriveController::class, 'destroy'])->name('destroy');
        
        // Drive Folders
        Route::prefix('folders')->name('folders.')->group(function () {
            Route::get('/{id?}', [\App\Http\Controllers\DriveFolderController::class, 'index'])->name('index');
            Route::post('/', [\App\Http\Controllers\DriveFolderController::class, 'store'])->name('store');
            Route::put('/{id}', [\App\Http\Controllers\DriveFolderController::class, 'update'])->name('update');
            Route::post('/{id}/move', [\App\Http\Controllers\DriveFolderController::class, 'move'])->name('move');
            Route::delete('/{id}', [\App\Http\Controllers\DriveFolderController::class, 'destroy'])->name('destroy');
            Route::post('/{id}/share', [\App\Http\Controllers\DriveFolderShareController::class, 'store'])->name('share.store');
            Route::delete('/{id}/share/{shareId}', [\App\Http\Controllers\DriveFolderShareController::class, 'destroy'])->name('share.destroy');
            Route::post('/{id}/public-link', [\App\Http\Controllers\DriveFolderShareController::class, 'generatePublicLink'])->name('public-link.generate');
            Route::delete('/{id}/public-link', [\App\Http\Controllers\DriveFolderShareController::class, 'revokePublicLink'])->name('public-link.revoke');
        });

        // Drive Shares & Public Links
        Route::post('/{id}/share', [\App\Http\Controllers\DriveShareController::class, 'store'])->name('share.store');
        Route::delete('/{id}/share/{shareId}', [\App\Http\Controllers\DriveShareController::class, 'destroy'])->name('share.destroy');
        Route::post('/{id}/public-link', [\App\Http\Controllers\DriveShareController::class, 'generatePublicLink'])->name('public-link.generate');
        Route::delete('/{id}/public-link', [\App\Http\Controllers\DriveShareController::class, 'revokePublicLink'])->name('public-link.revoke');
    });
});

// Public Event Attendance Submit
Route::post('/event-attendance', [\App\Http\Controllers\Auth\EventAttendanceController::class, 'store'])->name('event-attendance.store');

require __DIR__.'/auth.php';
