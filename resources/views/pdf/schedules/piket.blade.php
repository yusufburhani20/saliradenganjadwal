<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Jadwal Piket Guru - {{ $school_name }}</title>
    <style>
        @page {
            size: 11in 8.5in landscape; /* Letter Landscape */
            margin: 6mm 6mm 5mm 6mm;
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
            font-size: 15pt;
            font-weight: bold;
            margin: 0;
            line-height: 1.1;
            letter-spacing: 0.5px;
        }
        .entity-name {
            font-size: 13pt;
            font-weight: bold;
            margin: 2px 0 0 0;
            line-height: 1.1;
        }
        table.timetable {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 2px solid #000;
        }
        table.timetable th, table.timetable td {
            border: 1px solid #000;
            padding: 1px 1px;
            text-align: center;
            vertical-align: middle;
            word-wrap: break-word;
            overflow: hidden;
        }
        table.timetable thead th {
            font-size: 6.5pt;
            font-weight: bold;
            height: 26px;
            border-bottom: 2px solid #000;
            background-color: #fff;
            padding: 2px 0;
            line-height: 1.1;
        }
        .slot-col {
            width: 38px;
            border-right: 2px solid #000 !important;
            background-color: #fff;
        }
        .slot-num {
            font-size: 12pt;
            font-weight: bold;
            line-height: 1;
        }
        .slot-time {
            font-size: 5pt;
            color: #000;
            margin-top: 1px;
            font-family: Arial, sans-serif;
        }
        .cell-content {
            padding: 1px;
            min-height: 28px;
            line-height: 1.05;
        }
        .cell-subject {
            font-size: 6.2pt;
            font-weight: bold;
            color: #000;
            margin-bottom: 1px;
        }
        .cell-teacher {
            font-size: 5.2pt;
            color: #111;
            line-height: 1.05;
        }
        .cell-room {
            font-size: 4.8pt;
            font-weight: bold;
            color: #333;
            text-align: right;
            margin-top: 1px;
        }
        .cell-empty {
            background-color: #fff;
        }
        .footer-table {
            width: 100%;
            margin-top: 5px;
            font-size: 7.5pt;
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
    @foreach($active_days as $day)
    <div class="page-container">
        <div class="header">
            <h1 class="school-title">{{ $school_name }}</h1>
            <h2 class="entity-name">Jadwal Kelas / Piket Harian - Hari {{ $day_labels[$day] ?? ucfirst($day) }}</h2>
        </div>

        <table class="timetable">
            <thead>
                <tr>
                    <th class="slot-col">Jam</th>
                    @foreach($classes as $class)
                    <th>{{ $class->name }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach($slots as $sIdx => $slot)
                <tr>
                    <td class="slot-col">
                        <div class="slot-num">{{ $sIdx + 1 }}</div>
                        <div class="slot-time">{{ $slot['start'] }}-{{ $slot['end'] }}</div>
                    </td>

                    @foreach($classes as $class)
                        @php
                            $cell = $matrix[$day][$class->id][$sIdx] ?? ['type' => 'empty', 'rowspan' => 1];
                        @endphp

                        @if($cell['type'] === 'skip')
                            {{-- Cell is covered by previous rowspan --}}
                        @elseif($cell['type'] === 'item')
                            <td rowspan="{{ $cell['rowspan'] }}" class="cell-content">
                                <div class="cell-subject">{{ $cell['schedule']->subject }}</div>
                                <div class="cell-teacher">{{ $cell['schedule']->teacher->name ?? '-' }}</div>
                                @if(!empty($cell['room']))
                                    <div class="cell-room">{{ $cell['room'] }}</div>
                                @endif
                            </td>
                        @else
                            <td class="cell-empty"></td>
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
                        Jadwal Mulai Berlaku: {{ $valid_date }}
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
