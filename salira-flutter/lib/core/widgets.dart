import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/theme.dart';
import '../models/models.dart';

String todayIso() => DateFormat('yyyy-MM-dd').format(DateTime.now());

String formatDateId(DateTime d, [String pattern = 'EEE, dd MMM yyyy']) =>
    DateFormat(pattern, 'id_ID').format(d);

void showSnack(BuildContext context, String msg, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.error : AppColors.secondary,
      behavior: SnackBarBehavior.floating,
    ));
}

Future<bool> confirmDialog(BuildContext context, String message,
    {String confirmLabel = 'Hapus'}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Konfirmasi'),
      content: Text(message),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal')),
        TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(confirmLabel,
                style: const TextStyle(color: AppColors.error))),
      ],
    ),
  );
  return ok ?? false;
}

/// Bottom sheet pilihan dengan pencarian (pengganti `SelectorModal`).
Future<SimpleItem?> showSelectorSheet(
  BuildContext context, {
  required String title,
  required List<SimpleItem> items,
  int? selectedId,
}) {
  return showModalBottomSheet<SimpleItem>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => _SelectorSheet(
        title: title, items: items, selectedId: selectedId),
  );
}

class _SelectorSheet extends StatefulWidget {
  final String title;
  final List<SimpleItem> items;
  final int? selectedId;
  const _SelectorSheet(
      {required this.title, required this.items, this.selectedId});

  @override
  State<_SelectorSheet> createState() => _SelectorSheetState();
}

class _SelectorSheetState extends State<_SelectorSheet> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final filtered = widget.items
        .where((i) => i.name.toLowerCase().contains(_q.toLowerCase()))
        .toList();
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 12),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: Column(
          children: [
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: AppColors.outlineVariant,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                  child: Text(widget.title,
                      style: const TextStyle(
                          fontSize: 17, fontWeight: FontWeight.w800))),
              IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: AppColors.outline)),
            ]),
            TextField(
              decoration: const InputDecoration(
                  hintText: 'Cari...', prefixIcon: Icon(Icons.search)),
              onChanged: (v) => setState(() => _q = v),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: filtered.isEmpty
                  ? const Center(
                      child: Text('Tidak ada hasil',
                          style: TextStyle(color: AppColors.outline)))
                  : ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (_, i) {
                        final it = filtered[i];
                        final sel = it.id == widget.selectedId;
                        return ListTile(
                          title: Text(it.name,
                              style: TextStyle(
                                  fontWeight:
                                      sel ? FontWeight.w700 : FontWeight.w500,
                                  color: sel
                                      ? AppColors.primary
                                      : AppColors.onSurface)),
                          trailing: sel
                              ? const Icon(Icons.check_circle,
                                  color: AppColors.primary)
                              : null,
                          tileColor:
                              sel ? AppColors.primaryFixed.withValues(alpha: .4) : null,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          onTap: () => Navigator.pop(context, it),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Label huruf kapital kecil di atas field form.
class FormLabel extends StatelessWidget {
  final String text;
  final bool required;
  const FormLabel(this.text, {super.key, this.required = false});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 14, bottom: 6),
        child: Text.rich(TextSpan(children: [
          TextSpan(
              text: text.toUpperCase(),
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: .6,
                  color: AppColors.onSurfaceVariant)),
          if (required)
            const TextSpan(
                text: ' *', style: TextStyle(color: AppColors.error)),
        ])),
      );
}

/// Field yang membuka dropdown / picker saat di-tap.
class SelectField extends StatelessWidget {
  final String? value;
  final String placeholder;
  final VoidCallback onTap;
  final IconData icon;
  const SelectField({
    super.key,
    required this.value,
    required this.placeholder,
    required this.onTap,
    this.icon = Icons.expand_more,
  });

  @override
  Widget build(BuildContext context) => InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.outlineVariant),
          ),
          child: Row(children: [
            Expanded(
              child: Text(
                (value == null || value!.isEmpty) ? placeholder : value!,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    color: (value == null || value!.isEmpty)
                        ? AppColors.outline
                        : AppColors.onSurface),
              ),
            ),
            Icon(icon, size: 20, color: AppColors.onSurfaceVariant),
          ]),
        ),
      );
}

/// Field tanggal (YYYY-MM-DD) dengan date picker.
class DateField extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  final String placeholder;
  const DateField({
    super.key,
    required this.value,
    required this.onChanged,
    this.placeholder = 'Pilih tanggal',
  });

  @override
  Widget build(BuildContext context) => SelectField(
        value: value,
        placeholder: placeholder,
        icon: Icons.calendar_today_outlined,
        onTap: () async {
          final initial = DateTime.tryParse(value) ?? DateTime.now();
          final d = await showDatePicker(
            context: context,
            initialDate: initial,
            firstDate: DateTime(2020),
            lastDate: DateTime(2100),
          );
          if (d != null) onChanged(DateFormat('yyyy-MM-dd').format(d));
        },
      );
}

class ErrorBox extends StatelessWidget {
  final String message;
  const ErrorBox(this.message, {super.key});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: AppColors.errorContainer,
            borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          const Icon(Icons.error_outline, size: 18, color: AppColors.error),
          const SizedBox(width: 8),
          Expanded(
              child: Text(message,
                  style: const TextStyle(
                      color: AppColors.error, fontSize: 13))),
        ]),
      );
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;
  final Color color;
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.text,
    this.color = AppColors.outlineVariant,
  });

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 32),
        child: Column(children: [
          Icon(icon, size: 56, color: color),
          const SizedBox(height: 12),
          Text(title,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface)),
          const SizedBox(height: 6),
          Text(text,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.onSurfaceVariant)),
        ]),
      );
}

class BannerStat {
  final String label;
  final String value;
  final Color? color;
  const BannerStat(this.label, this.value, [this.color]);
}

/// Banner gradasi biru dengan 3 statistik (dipakai Presensi, Jurnal, Penilaian).
class GradientBanner extends StatelessWidget {
  final String tag;
  final String title;
  final String desc;
  final List<BannerStat> stats;
  const GradientBanner({
    super.key,
    required this.tag,
    required this.title,
    required this.desc,
    required this.stats,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.primaryContainer],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
                color: AppColors.primary.withValues(alpha: .25),
                blurRadius: 14,
                offset: const Offset(0, 6)),
          ],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.assignment_ind, size: 16, color: AppColors.surface),
            const SizedBox(width: 6),
            Text(tag,
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: .6,
                    color: AppColors.primaryFixed)),
          ]),
          const SizedBox(height: 4),
          Text(title,
              style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Colors.white)),
          const SizedBox(height: 2),
          Text(desc,
              style: const TextStyle(
                  fontSize: 12, color: AppColors.primaryFixed)),
          const SizedBox(height: 14),
          Row(children: [
            for (var i = 0; i < stats.length; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .15),
                      borderRadius: BorderRadius.circular(12)),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(stats[i].label,
                            style: const TextStyle(
                                fontSize: 10, color: AppColors.primaryFixed)),
                        const SizedBox(height: 2),
                        Text(stats[i].value,
                            style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: stats[i].color ?? Colors.white)),
                      ]),
                ),
              ),
            ],
          ]),
        ]),
      );
}

/// Header halaman tab: judul + tombol aksi.
class TabHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  const TabHeader({super.key, required this.title, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) => Container(
        color: AppColors.surface,
        padding: EdgeInsets.fromLTRB(
            16, MediaQuery.of(context).padding.top + 8, 16, 8),
        child: Row(children: [
          Expanded(
              child: Text(title,
                  style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppColors.onSurface))),
          if (actionLabel != null)
            FilledButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.add, size: 18),
              label: Text(actionLabel!),
              style: FilledButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10)),
            ),
        ]),
      );
}

/// Kartu putih standar.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final Color? accent;
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.accent,
  });

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: padding,
        decoration: BoxDecoration(
          color: AppColors.surfaceLowest,
          borderRadius: BorderRadius.circular(16),
          border: accent == null
              ? null
              : Border(left: BorderSide(color: accent!, width: 4)),
          boxShadow: [
            BoxShadow(
                color: const Color(0xFF0F172A).withValues(alpha: .05),
                blurRadius: 10,
                offset: const Offset(0, 2)),
          ],
        ),
        child: child,
      );
}

Color attendanceStatusColor(String status) {
  switch (status.toLowerCase()) {
    case 'hadir':
      return AppColors.secondary;
    case 'terlambat':
      return AppColors.amber;
    case 'izin':
      return AppColors.primary;
    case 'sakit':
      return AppColors.tertiary;
    case 'alpha':
      return AppColors.error;
    default:
      return AppColors.outline;
  }
}
