<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Jadwal Kelas - {{ $school_name }}</title>
    <style>
        @page {
            size: 11in 8.5in landscape; /* Letter Landscape */
            margin: 8mm 12mm 6mm 12mm;
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
            margin-bottom: 10px;
        }
        .school-title {
            font-size: 18pt;
            font-weight: bold;
            margin: 0;
            line-height: 1.15;
            letter-spacing: 0.5px;
        }
        .entity-name {
            font-size: 16pt;
            font-weight: bold;
            margin: 3px 0 0 0;
            line-height: 1.15;
        }
        table.timetable {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 2px solid #000;
        }
        table.timetable th, table.timetable td {
            border: 1px solid #000;
            padding: 3px 2px;
            text-align: center;
            vertical-align: middle;
            word-wrap: break-word;
        }
        table.timetable thead th {
            font-size: 14pt;
            font-weight: bold;
            height: 32px;
            border-bottom: 2px solid #000;
            background-color: #fff;
        }
        .slot-col {
            width: 70px;
            border-right: 2px solid #000 !important;
            background-color: #fff;
        }
        .slot-num {
            font-size: 15pt;
            font-weight: bold;
            line-height: 1;
        }
        .slot-time {
            font-size: 7pt;
            color: #000;
            margin-top: 2px;
            font-family: Arial, sans-serif;
        }
        .cell-content {
            padding: 2px 3px;
            min-height: 35px;
        }
        .cell-subject {
            font-size: 10pt;
            font-weight: bold;
            line-height: 1.15;
            color: #000;
        }
        .cell-teacher {
            font-size: 8pt;
            color: #111;
            margin-top: 3px;
            line-height: 1.1;
        }
        .cell-room {
            font-size: 6.5pt;
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
    @foreach($classes as $class)
    <div class="page-container">
        <div class="header">
            <h1 class="school-title">{{ $school_name }}</h1>
            <h2 class="entity-name">{{ $class->name }}</h2>
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
                            $cell = $matrix[$class->id][$day][$sIdx] ?? ['type' => 'empty', 'rowspan' => 1];
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
