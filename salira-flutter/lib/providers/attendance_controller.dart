import 'package:cross_file/cross_file.dart';

import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/models.dart';
import '../services/api_services.dart';

/// Padanan hook `useAttendance`. Dibuat per-layar (bukan global).
class AttendanceController extends ChangeNotifier {
  AttendanceData? today;
  List<AttendanceData> history = [];

  bool isLoadingToday = true;
  bool isLoadingHistory = true;
  bool isRefreshing = false;
  bool isFetchingMore = false;
  String? error;

  int _currentPage = 1;
  int _lastPage = 1;

  bool get isLoading => isLoadingToday || isLoadingHistory;

  Future<void> fetchToday() async {
    isLoadingToday = true;
    notifyListeners();
    try {
      today = await AttendanceService.today();
      error = null;
    } catch (e) {
      error = errorMessage(e, 'Gagal memuat status hari ini');
    } finally {
      isLoadingToday = false;
      notifyListeners();
    }
  }

  Future<void> fetchHistory({int page = 1, bool refresh = false}) async {
    if (refresh) {
      isRefreshing = true;
    } else if (page == 1) {
      isLoadingHistory = true;
    } else {
      isFetchingMore = true;
    }
    notifyListeners();

    try {
      final res = await AttendanceService.history(page);
      history = (page == 1 || refresh) ? res.data : [...history, ...res.data];
      _currentPage = res.currentPage;
      _lastPage = res.lastPage;
      error = null;
    } catch (e) {
      error = errorMessage(e, 'Gagal memuat riwayat presensi');
    } finally {
      isLoadingHistory = false;
      isRefreshing = false;
      isFetchingMore = false;
      notifyListeners();
    }
  }

  Future<void> refreshAll() async {
    await Future.wait([fetchToday(), fetchHistory(refresh: true)]);
  }

  Future<void> loadMore() async {
    if (_currentPage < _lastPage && !isFetchingMore && !isLoadingHistory) {
      await fetchHistory(page: _currentPage + 1);
    }
  }

  Future<void> submitCheckIn({double? latitude, double? longitude, XFile? photo}) async {
    await AttendanceService.checkIn(latitude: latitude, longitude: longitude, photo: photo);
    await refreshAll();
  }
}
