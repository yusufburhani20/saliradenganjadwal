<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Jadwal Guru - {{ $school_name }}</title>
    <style>
        @page {
            size: a4 landscape;
            margin: 8mm 10mm 6mm 10mm;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
            color: #000;
            margin: 0;
            padding: 0;
            background: #fff;
        }
        .page-container {
            page-break-after: always;
            position: relative;
        }
        .page-container:last-child {
            page-break-after: avoid;
        }
        .header {
            text-align: center;
            margin-bottom: 6px;
        }
        .school-title {
            font-size: 16pt;
            font-weight: bold;
            margin: 0;
            line-height: 1.15;
            letter-spacing: 0.5px;
        }
        .entity-name {
            font-size: 14pt;
            font-weight: bold;
            font-style: italic;
            margin: 2px 0 0 0;
            line-height: 1.15;
        }
        table.timetable {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 1.5pt solid #000;
        }
        table.timetable th, table.timetable td {
            border: 1pt solid #000;
            text-align: center;
            vertical-align: middle;
            word-wrap: break-word;
            empty-cells: show;
        }
        table.timetable thead th {
            font-size: 13pt;
            font-weight: bold;
            height: 28pt;
            border-bottom: 2pt solid #000;
            background-color: #f8f9fa;
        }
        table.timetable tbody tr {
            height: 48pt;
        }
        table.timetable tbody td {
            height: 48pt;
        }
        .slot-col {
            width: 65px;
            border-right: 2pt solid #000 !important;
            background-color: #f8f9fa;
        }
        .slot-num {
            font-size: 16pt;
            font-weight: bold;
            line-height: 1;
        }
        .slot-time {
            font-size: 7.5pt;
            color: #000;
            margin-top: 2px;
            font-family: Arial, sans-serif;
            white-space: nowrap;
        }
        .cell-content {
            padding: 2px 4px;
        }
        .cell-subject {
            font-size: 10pt;
            font-weight: bold;
            line-height: 1.15;
            color: #000;
        }
        .cell-class {
            font-size: 9pt;
            font-weight: bold;
            color: #111;
            margin-top: 3px;
            line-height: 1.1;
        }
        .cell-room {
            font-size: 7pt;
            font-weight: bold;
            text-align: right;
            margin-top: 2px;
            color: #333;
        }
        .cell-empty {
            background-color: #fff;
        }
        .footer-table {
            width: 100%;
            margin-top: 6px;
            font-size: 8pt;
            color: #333;
        }
        .footer-left {
            text-align: left;
        }
        .footer-right {
            text-align: right;
            font-weight: bold;
        }
    </style>
</head>
<body>
    @foreach($teachers as $teacher)
    <div class="page-container">
        <div class="header">
            <h1 class="school-title">{{ $school_name }}</h1>
            <h2 class="entity-name">{{ $teacher->name }}</h2>
        </div>

        <table class="timetable">
            <thead>
                <tr>
                    <th class="slot-col"></th>
                    @foreach($active_days as $day)
                    <th>{{ $day_labels[$day] ?? ucfirst($day) }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach($slots as $sIdx => $slot)
                <tr>
                    <td class="slot-col">
                        <div class="slot-num">{{ $sIdx + 1 }}</div>
                        <div class="slot-time">{{ $slot['start'] }} - {{ $slot['end'] }}</div>
                    </td>

                    @foreach($active_days as $day)
                        @php
                            $cell = $matrix[$teacher->id][$day][$sIdx] ?? ['type' => 'empty', 'rowspan' => 1];
                        @endphp

                        @if($cell['type'] === 'skip')
                            {{-- Cell is covered by previous rowspan --}}
                        @elseif($cell['type'] === 'item')
                            <td rowspan="{{ $cell['rowspan'] }}" class="cell-content">
                                <div class="cell-subject">{{ $cell['schedule']->subject }}</div>
                                <div class="cell-class">{{ $cell['schedule']->academicClass->name ?? '-' }}</div>
                                @if(!empty($cell['room']))
                                    <div class="cell-room">{{ $cell['room'] }}</div>
                                @endif
                            </td>
                        @else
                            <td class="cell-empty">&nbsp;</td>
                        @endif
                    @endforeach
                </tr>
                @endforeach
            </tbody>
        </table>

        <table class="footer-table">
            <tr>
                <td class="footer-left">
                    @if(!empty($valid_date))
                        @if(stripos($valid_date, 'berlaku') !== false)
                            {{ $valid_date }}
                        @else
                            Jadwal Mulai Berlaku pada Tanggal {{ $valid_date }}
                        @endif
                    @else
                        Tahun Ajaran {{ $academic_year ?? '' }} &bull; Dicetak: {{ $printed_at ?? date('d/m/Y') }}
                    @endif
                </td>
                <td class="footer-right">{{ $school_name }}</td>
            </tr>
        </table>
    </div>
    @endforeach
</body>
</html>
