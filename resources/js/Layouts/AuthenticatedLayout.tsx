import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import LogoutButton from '@/Components/LogoutButton';
import { Link, usePage, router } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState, useEffect } from 'react';
import ThemeToggle from '@/Components/ThemeToggle';
import SystemClock from '@/Components/SystemClock';
import usePWA from '@/hooks/usePWA';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { props } = usePage();
    const flash = props.flash as any;
    const user = props.auth.user as any; 
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { vapid_public_key } = props as any;
    const {
        isOnline,
        isInstallable,
        installApp,
        isSubscribed,
        subscriptionLoading,
        subscribe,
        unsubscribe
    } = usePWA(vapid_public_key);

    const [locationPermissionState, setLocationPermissionState] = useState<'granted' | 'prompt' | 'denied'>('prompt');
    const [showPermissionModal, setShowPermissionModal] = useState(false);

    // Request Location Permission
    // NOTE: This only triggers the OS permission prompt — NOT used for attendance coordinates.
    // Using low-accuracy + large cache to avoid GPS hardware contention with AttendanceScanner.
    const handleRequestLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (_position) => {
                    setLocationPermissionState('granted');
                },
                (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        setLocationPermissionState('denied');
                        alert("Akses lokasi ditolak. Silakan aktifkan izin lokasi di pengaturan browser Anda.");
                    } else {
                        alert("Gagal mengakses lokasi: " + error.message);
                    }
                },
                // Low accuracy is sufficient for a permission prompt.
                // Large maximumAge avoids a second GPS cold-start on devices with slow GPS (e.g. Infonix).
                { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
            );
        } else {
            alert("Browser Anda tidak mendukung Geolocation.");
        }
    };

    // Request Notification Permission
    const handleRequestNotification = async () => {
        const success = await subscribe();
        if (success) {
            // isSubscribed will automatically change via hook
        }
    };

    // Dismiss Permission Modal
    const handleDismissModal = () => {
        sessionStorage.setItem('dismiss_permission_modal', 'true');
        setShowPermissionModal(false);
    };

    // Check permissions status
    useEffect(() => {
        const checkPermissions = async () => {
            // 1. Geolocation permission state
            if ('permissions' in navigator) {
                try {
                    const result = await navigator.permissions.query({ name: 'geolocation' });
                    setLocationPermissionState(result.state as any);
                    
                    // Listen for changes
                    result.onchange = () => {
                        setLocationPermissionState(result.state as any);
                    };
                } catch (e) {}
            }

            // 2. Determine if modal needs to be shown
            const hasNotificationGranted = Notification.permission === 'granted';
            
            let hasGeoGranted = false;
            if ('permissions' in navigator) {
                try {
                    const result = await navigator.permissions.query({ name: 'geolocation' });
                    hasGeoGranted = result.state === 'granted';
                } catch (e) {}
            }

            const dismissed = sessionStorage.getItem('dismiss_permission_modal') === 'true';

            if ((!hasNotificationGranted || !hasGeoGranted) && !dismissed) {
                // Delay slightly for smooth page entry
                const timer = setTimeout(() => setShowPermissionModal(true), 1500);
                return () => clearTimeout(timer);
            }
        };

        checkPermissions();
    }, [isSubscribed]);

    // Auto close modal if both permissions are granted
    useEffect(() => {
        if (Notification.permission === 'granted' && locationPermissionState === 'granted') {
            setShowPermissionModal(false);
        }
    }, [locationPermissionState]);
    
    // Sidebar collapse state (Desktop)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sidebarCollapsed') === 'true';
        }
        return false;
    });

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    }, [sidebarCollapsed]);
    
    // Toast state management
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const notifications = props.notifications as any;

    const handleBellClick = () => {
        if (notifications?.unreadCount > 0) {
            router.patch(route('notifications.markAllAsRead'), {}, {
                preserveScroll: true,
                preserveState: true,
            });
        }
    };

    useEffect(() => {
        if (flash.success) {
            setToast({ message: flash.success, type: 'success' });
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
        if (flash.error) {
            setToast({ message: flash.error, type: 'error' });
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash.success, flash.error]);

    // Helpers to check current user roles
    // Normalize: roles can be strings (from getRoleNames) or objects (from Eloquent eager load)
    const rawRoles = user.roles || [];
    const userRoles: string[] = rawRoles.map((r: string | { name: string }) =>
        typeof r === 'string' ? r : r?.name ?? ''
    );
    const isSuperAdmin = userRoles.includes('Super Admin');
    const isAdmin = isSuperAdmin;
    const isPimpinan = userRoles.includes('Kepala Sekolah') || userRoles.includes('Pimpinan');
    const isGuru = userRoles.includes('Guru') || userRoles.includes('Guru/Dosen');
    const isWaliKelas = userRoles.includes('Wali Kelas');
    const isStaff = userRoles.includes('Staff/TU');
    const isBendahara = userRoles.includes('Bendahara');
    const isKaprog = userRoles.includes('Kepala Program');
    const isLaboran = userRoles.includes('Laboran Komputer');
    const isPengawasMalam = userRoles.includes('Pengawas Malam');
    // isTeacher: Pengawas Malam masuk, tapi nanti dibatasi di item-item tertentu
    const isTeacher = isGuru || isWaliKelas || isAdmin || isPengawasMalam;
    const isWaliOrAdmin = isWaliKelas || isAdmin;
    // hasDataAccess: Laboran Komputer masuk, tapi dibatasi di item tertentu
    const hasDataAccess = isAdmin || isStaff || isLaboran;

    // Grouped nav structure
    const navGroups = [
        {
            group: 'Beranda',
            show: true,
            items: [
                {
                    label: 'Dashboard',
                    href: route('dashboard'),
                    active: route().current('dashboard'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>),
                },
                {
                    label: 'Pengumuman',
                    href: route('admin.announcements.index'),
                    active: route().current('admin.announcements.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>),
                },
                {
                    label: 'Drive Saya',
                    href: route('drive.index'),
                    active: route().current('drive.*'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>),
                },
            ],
        },
        {
            group: 'KBM & Akademik',
            // Laboran & Pengawas Malam tidak butuh grup KBM penuh —
            // Pengawas Malam hanya butuh Belajar Malam (ada di sini)
            show: !isLaboran,
            items: [
                {
                    label: 'Jurnal Mengajar',
                    href: route('teacher.agendas.index'),
                    active: route().current('teacher.agendas.*'),
                    show: !isBendahara && !(isPimpinan && !isGuru) && !isPengawasMalam && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" /></svg>),
                },
                {
                    label: 'Asesmen Harian',
                    href: route('teacher.assessments.index'),
                    active: route().current('teacher.assessments.*'),
                    show: isTeacher && !isPengawasMalam && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>),
                },
                {
                    label: 'Asesmen Akhir (ASAS/ASAT)',
                    href: route('teacher.final-assessments.index'),
                    active: route().current('teacher.final-assessments.*'),
                    show: (isGuru || isWaliKelas || isAdmin) && !isPengawasMalam,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>),
                },
                {
                    label: 'Bimbingan Siswa',
                    href: route('teacher.consultations.index'),
                    active: route().current('teacher.consultations.*'),
                    show: isTeacher && !isPengawasMalam && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>),
                },
                {
                    label: 'Rekapitulasi',
                    href: route('admin.reports.index'),
                    active: route().current('admin.reports.index') || route().current('admin.reports.attendance.*') || route().current('admin.reports.assessments.*'),
                    show: (isAdmin || isPimpinan || isKaprog) && !isPengawasMalam,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>),
                },
                {
                    label: 'Laporan Wali Kelas',
                    href: route('teacher.my-students.index'),
                    active: route().current('teacher.my-students.*'),
                    show: isWaliOrAdmin && !isPengawasMalam,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>),
                },
                {
                    label: 'Resume Akademik',
                    href: route('admin.reports.student-resume'),
                    active: route().current('admin.reports.student-resume'),
                    show: (isAdmin || isPimpinan) && !isPengawasMalam,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L19 14" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" /></svg>),
                },
                {
                    label: 'Belajar Malam',
                    href: route('teacher.evening-studies.index'),
                    active: route().current('teacher.evening-studies.*'),
                    // Pengawas Malam: HANYA ini yang tampil di grup ini
                    show: isGuru || isWaliKelas || isSuperAdmin || isPengawasMalam,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>),
                },
            ],
        },
        {
            group: 'Kepegawaian',
            // Pengawas Malam tidak butuh grup ini sama sekali
            show: !isPengawasMalam,
            items: [
                {
                    label: 'Presensi Pegawai',
                    href: route('attendances.scanner'),
                    active: route().current('attendances.scanner'),
                    // Laboran Komputer boleh akses presensi harian
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
                },
                {
                    label: 'Riwayat Absensi Saya',
                    href: route('attendances.history'),
                    active: route().current('attendances.history'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                },
                {
                    label: 'Pengajuan Izin',
                    href: route('user.permissions.index'),
                    active: route().current('user.permissions.*'),
                    show: true,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>),
                },
                {
                    label: 'Approval Perizinan',
                    href: route('admin.approvals.index'),
                    active: route().current('admin.approvals.*'),
                    show: (isAdmin || isPimpinan) && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>),
                },
                {
                    label: 'Rekap Absensi Pegawai',
                    href: route('admin.attendances.index'),
                    active: route().current('admin.attendances.*'),
                    show: (isAdmin || isPimpinan) && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                },
                {
                    label: 'Event Rapat / Kegiatan',
                    href: route('admin.events.index'),
                    active: route().current('admin.events.*'),
                    show: (isAdmin || isPimpinan || isKaprog || isStaff) && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>),
                },
            ],
        },
        {
            group: 'Keuangan & Administrasi',
            show: isAdmin || isBendahara,
            items: [
                {
                    label: 'Analitik Keuangan',
                    href: route('admin.finance.index'),
                    active: route().current('admin.finance.index'),
                    show: isAdmin || isPimpinan || isBendahara,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>),
                },
                {
                    label: 'Manajemen Tagihan (SPP)',
                    href: route('admin.bills.index'),
                    active: route().current('admin.bills.*'),
                    show: isAdmin || isPimpinan || isBendahara,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>),
                },
                {
                    label: 'Catat Pengeluaran',
                    href: route('admin.finance.expenses.index'),
                    active: route().current('admin.finance.expenses.*'),
                    show: isAdmin || isBendahara,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>),
                },
                {
                    label: 'Kategori Keuangan',
                    href: route('admin.finance.categories.index'),
                    active: route().current('admin.finance.categories.*'),
                    show: isAdmin || isBendahara,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" /></svg>),
                },
            ],
        },
        {
            group: 'Data Master',
            // Laboran Komputer tidak butuh Data Master
            show: hasDataAccess && !isLaboran,
            items: [
                {
                    label: 'Tahun Ajaran',
                    href: route('admin.academic-years.index'),
                    active: route().current('admin.academic-years.*'),
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>),
                },
                {
                    label: 'Data Siswa',
                    href: route('admin.students.index'),
                    active: route().current('admin.students.*'),
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>),
                },
                {
                    label: 'Data Kelas',
                    href: route('admin.classes.index'),
                    active: route().current('admin.classes.*'),
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>),
                },
                {
                    label: 'Mata Pelajaran',
                    href: route('admin.subjects.index'),
                    active: route().current('admin.subjects.*'),
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>),
                },
                {
                    label: 'Jam Pelajaran',
                    href: route('admin.lesson-hours.index'),
                    active: route().current('admin.lesson-hours.*'),
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                },
                {
                    label: 'Jadwal Pelajaran',
                    href: route('admin.schedules.index'),
                    active: route().current('admin.schedules.*'),
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>),
                },
                {
                    label: 'Auto Generator Jadwal',
                    href: route('admin.schedule-generator.index'),
                    active: route().current('admin.schedule-generator.*'),
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>),
                },
            ],
        },
        {
            group: 'Sarpras & Inventaris',
            // Laboran Komputer boleh masuk grup ini (Lab + Tiket)
            // Pengawas Malam tidak butuh grup ini
            show: hasDataAccess && !isPengawasMalam,
            items: [
                {
                    label: 'Kelola Barang',
                    href: route('admin.inventory.index'),
                    active: route().current('admin.inventory.*'),
                    // Laboran tidak butuh manajemen barang umum
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>),
                },
                {
                    label: 'Scanner Barcode',
                    href: route('admin.inventory.scanner'),
                    active: route().current('admin.inventory.scanner'),
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>),
                },
                {
                    label: 'Log Transaksi',
                    href: route('admin.inventory.logs'),
                    active: route().current('admin.inventory.logs'),
                    show: hasDataAccess && !isLaboran,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>),
                },
                {
                    label: 'Lab Komputer & PC',
                    href: route('admin.computer-labs.index'),
                    active: route().current('admin.computer-labs.*') || route().current('admin.computer-units.*'),
                    // Laboran Komputer boleh akses Lab Komputer
                    show: hasDataAccess,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>),
                },
                {
                    label: 'Tiket Kerusakan',
                    href: route('admin.computer-issues.index'),
                    active: route().current('admin.computer-issues.*'),
                    // Laboran Komputer boleh akses tiket kerusakan
                    show: hasDataAccess,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>),
                },
            ],
        },
        {
            group: 'Sistem & Pengaturan',
            show: isAdmin || isSuperAdmin,
            items: [
                {
                    label: 'Data Pengguna',
                    href: route('admin.users.index'),
                    active: route().current('admin.users.*'),
                    show: isSuperAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
                },
                {
                    label: 'Lokasi Geofence',
                    href: route('admin.geofences.index'),
                    active: route().current('admin.geofences.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>),
                },
                {
                    label: 'Notifikasi & Gateway',
                    href: route('admin.settings.notifications.index'),
                    active: route().current('admin.settings.notifications.*'),
                    show: isSuperAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>),
                },
                {
                    label: 'Pengaturan Sekolah',
                    href: route('admin.settings.index'),
                    active: route().current('admin.settings.*'),
                    show: isAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
                },
                {
                    label: 'Manajemen Drive',
                    href: route('admin.drive.index'),
                    active: route().current('admin.drive.*'),
                    show: isSuperAdmin,
                    icon: (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>),
                },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {/* OVERLAY (mobile only) */}
            <div
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300"
                style={{
                    opacity: sidebarOpen ? 1 : 0,
                    pointerEvents: sidebarOpen ? 'auto' : 'none',
                    visibility: sidebarOpen ? 'visible' : 'hidden',
                }}
            />

            {/* SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/60 transition-all duration-300 transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} flex flex-col shadow-2xl lg:shadow-none`}>
                {/* Logo Area */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-700/60 flex-shrink-0 overflow-hidden">
                    <Link href={route('dashboard')} className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                        <img src="/images/logo-salira.png" alt="SALIRA Logo" className="h-8 w-8 flex-shrink-0" />
                        {!sidebarCollapsed && (
                            <span className="text-xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                SALIRA
                            </span>
                        )}
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
                    {navGroups.map((group) => {
                        const visibleItems = group.items.filter(i => i.show);
                        if (!group.show || visibleItems.length === 0) return null;
                        return (
                            <div key={group.group} className="mb-1">
                                {!sidebarCollapsed ? (
                                    <p className="px-4 pt-4 pb-1.5 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.15em] truncate">
                                        {group.group}
                                    </p>
                                ) : (
                                    <div className="h-4" />
                                )}
                                <div className="px-2 space-y-0.5">
                                    {visibleItems.map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                                                item.active
                                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <span className={`flex-shrink-0 ${item.active ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {item.icon}
                                            </span>
                                            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                                            {!sidebarCollapsed && item.active && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}


                </nav>

                {/* Footer User Profile */}
                <div className="border-t border-slate-100 dark:border-slate-700/60 p-4 flex-shrink-0">
                    <div className="flex items-center gap-3 px-2 py-1.5">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt="User Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-slate-600" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm flex-shrink-0">
                                {user.name.charAt(0)}
                            </div>
                        )}
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{userRoles.join(', ') || 'Staff'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Force transform 0 on Desktop */}
            <style>{`
                @media (min-width: 1024px) {
                    aside { transform: translateX(0) !important; }
                }
            `}</style>

            {/* MAIN CONTENT */}
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
                {/* TOP HEADER */}
                <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700/60">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>

                    {/* Sidebar Toggle — desktop only */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-all hover:scale-110 active:scale-95"
                        title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {sidebarCollapsed ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        )}
                    </button>

                    <div className="lg:hidden flex items-center gap-2">
                        <img src="/images/logo-salira.png" alt="SALIRA Logo" className="h-7 w-auto" />
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">SALIRA</span>
                    </div>

                    {header && (
                        <div className="hidden lg:block flex-1 text-slate-700 dark:text-slate-200 font-semibold">
                            {header}
                        </div>
                    )}

                    <div className="flex-1 lg:flex-none" />

                    <div className="flex items-center gap-2">
                        {!subscriptionLoading && (
                            <button
                                onClick={isSubscribed ? unsubscribe : subscribe}
                                className={`p-2 rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${
                                    isSubscribed 
                                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50' 
                                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                }`}
                                title={isSubscribed ? "Matikan Notifikasi Push" : "Aktifkan Notifikasi Push"}
                            >
                                {isSubscribed ? (
                                    <svg className="w-5 h-5 animate-swing" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                )}
                            </button>
                        )}

                        <Dropdown>
                            <Dropdown.Trigger>
                                <button onClick={handleBellClick} className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    {notifications?.unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                        </span>
                                    )}
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content align="right" width="80" contentClasses="py-1 bg-white dark:bg-slate-800 shadow-xl rounded-xl">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <h3 className="text-sm font-bold">Notifikasi</h3>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{notifications?.unreadCount || 0} Baru</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications?.recent && notifications.recent.length > 0 ? (
                                        notifications.recent.map((notif: any) => (
                                            <Link key={notif.id} href={route('notifications.redirect', notif.id)} className="block p-4 border-b hover:bg-slate-50 transition-colors">
                                                <p className="text-sm">{notif.data?.message}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-slate-400">Tidak ada notifikasi</div>
                                    )}
                                </div>
                            </Dropdown.Content>
                        </Dropdown>

                        <ThemeToggle />

                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="User Avatar" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                            {user.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="hidden sm:block text-left leading-tight">
                                        <div className="text-sm font-semibold">{user.name}</div>
                                        <div className="text-xs text-slate-400 capitalize">{userRoles[0] || 'Staff'}</div>
                                    </div>
                                    <svg className="hidden sm:block w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                <LogoutButton action={route('logout')} className="block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 transition duration-150 ease-in-out hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800">Log Out</LogoutButton>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    {children}
                </main>

                {toast && (
                    <div className="fixed bottom-6 right-6 z-[100] animate-bounce-in">
                        <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 border-2 ${
                            toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'
                        }`}>
                            <span className="font-bold">{toast.message}</span>
                            <button onClick={() => setToast(null)} className="ml-4 p-1 hover:bg-white/20 rounded-full">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                        </div>
                    </div>
                )}

                {!isOnline && (
                    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-bounce-in">
                        <div className="bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-rose-500">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider">Mode Offline Aktif</span>
                            <span className="text-xs font-medium text-rose-100">Koneksi internet terputus.</span>
                        </div>
                    </div>
                )}

                {showPermissionModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700 animate-slide-up relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
                            <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-24 h-24 bg-violet-500/10 rounded-full blur-xl"></div>
                            
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100/50 dark:border-emerald-900/30 shadow-inner animate-pulse">
                                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>

                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">Izin Akses Diperlukan</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 px-2">
                                    Aplikasi SALIRA memerlukan akses Lokasi (GPS) dan Notifikasi untuk fitur presensi dan pemberitahuan sistem.
                                </p>

                                <div className="w-full space-y-4 mb-6">
                                    {/* Notifikasi Push */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-750 dark:text-slate-300">Notifikasi Push</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                Notification.permission === 'granted'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                            }`}>
                                                {Notification.permission === 'granted' ? 'DIIZINKAN' : 'BELUM DIIZINKAN'}
                                            </span>
                                        </div>
                                        {Notification.permission !== 'granted' && (
                                            <button
                                                onClick={handleRequestNotification}
                                                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 active:scale-95"
                                            >
                                                Minta Izin Notifikasi
                                            </button>
                                        )}
                                    </div>

                                    {/* Lokasi Presensi */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-750 dark:text-slate-300">Lokasi Presensi (GPS)</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                locationPermissionState === 'granted'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                            }`}>
                                                {locationPermissionState === 'granted' ? 'DIIZINKAN' : 'BELUM DIIZINKAN'}
                                            </span>
                                        </div>
                                        {locationPermissionState !== 'granted' && (
                                            <button
                                                onClick={handleRequestLocation}
                                                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 active:scale-95"
                                            >
                                                Minta Akses Lokasi (GPS)
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleDismissModal}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-305 transition-colors py-1 hover:underline"
                                >
                                    Tutup & Ingatkan Nanti
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in { animation: bounce-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

                @keyframes fade-in {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }

                @keyframes slide-up {
                    0% { transform: translateY(20px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

                @keyframes swing {
                    0% { transform: rotate(0); }
                    15% { transform: rotate(15deg); }
                    30% { transform: rotate(-10deg); }
                    45% { transform: rotate(5deg); }
                    60% { transform: rotate(-5deg); }
                    75% { transform: rotate(2deg); }
                    100% { transform: rotate(0); }
                }
                .animate-swing {
                    animation: swing 1s ease-in-out infinite;
                    transform-origin: top center;
                }
            `}</style>
        </div>
    );
}
