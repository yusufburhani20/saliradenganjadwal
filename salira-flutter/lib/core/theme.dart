import 'package:flutter/material.dart';

/// Palet warna - sama dengan DESIGN.md pada versi React Native.
class AppColors {
  AppColors._();

  static const primary = Color(0xFF006194);
  static const primaryDark = Color(0xFF004A73);
  static const primaryContainer = Color(0xFF007BB9);
  static const onPrimary = Color(0xFFFFFFFF);
  static const primaryFixed = Color(0xFFCCE5FF);
  static const onPrimaryFixed = Color(0xFF001D31);
  static const onPrimaryFixedVariant = Color(0xFF004B73);
  static const secondary = Color(0xFF006C49);
  static const secondaryContainer = Color(0xFF6CF8BB);
  static const onSecondaryContainer = Color(0xFF00714D);
  static const tertiary = Color(0xFF825100);
  static const tertiaryFixed = Color(0xFFFFDDB8);
  static const onTertiaryFixedVariant = Color(0xFF653E00);
  static const error = Color(0xFFBA1A1A);
  static const errorContainer = Color(0xFFFFDAD6);
  static const surface = Color(0xFFFAF8FF);
  static const surfaceLowest = Color(0xFFFFFFFF);
  static const surfaceLow = Color(0xFFF2F3FF);
  static const surfaceContainer = Color(0xFFEAEDFF);
  static const surfaceHigh = Color(0xFFE2E7FF);
  static const surfaceHighest = Color(0xFFDAE2FD);
  static const onSurface = Color(0xFF131B2E);
  static const onSurfaceVariant = Color(0xFF3F4850);
  static const outline = Color(0xFF707881);
  static const outlineVariant = Color(0xFFBFC7D2);
  static const violet = Color(0xFF7C3AED);
  static const amber = Color(0xFFF59E0B);
}

class AppTheme {
  AppTheme._();

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      secondary: AppColors.secondary,
      error: AppColors.error,
      surface: AppColors.surface,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.surface,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceLow,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFEFF6FF),
        height: 64,
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
