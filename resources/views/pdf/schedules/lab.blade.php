<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Jadwal Lab Komputer - {{ $school_name }}</title>
    <style>
        @page {
            size: 11in 8.5in landscape; /* Letter Landscape matching aSc */
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
        .top-code {
            font-size: 8pt;
            color: #000;
            margin-bottom: 2px;
            font-family: monospace;
        }
        .header {
            text-align: center;
            margin-bottom: 8px;
        }
        .school-title {
            font-size: 18pt;
            font-weight: bold;
            margin: 0;
            line-height: 1.15;
            letter-spacing: 0.5px;
        }
        .entity-name {
            font-size: 18pt;
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
        .cell-class {
            font-size: 10pt;
            font-weight: bold;
            line-height: 1.15;
            color: #000;
        }
        .cell-subject {
            font-size: 9.5pt;
            font-weight: bold;
            color: #111;
            margin-top: 2px;
            line-height: 1.15;
        }
        .cell-teacher {
            font-size: 8pt;
            color: #222;
            margin-top: 2px;
            line-height: 1.1;
        }
        .cell-empty {
            background-color: #fff;
        }
        .footer-table {
            width: 100%;
            margin-top: 4px;
            font-size: 8pt;
            color: #000;
        }
        .footer-left {
            text-align: left;
        }
        .footer-right {
            text-align: right;
        }
    </style>
</head>
<body>
    @foreach($labs as $labName)
    <div class="page-container">
        <div class="top-code">Slogutis | AT4RE</div>
        
        <div class="header">
            <h1 class="school-title">{{ $school_name }}</h1>
            <h2 class="entity-name">{{ $labName }}</h2>
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
                            $cell = $matrix[$labName][$day][$sIdx] ?? ['type' => 'empty', 'rowspan' => 1];
                        @endphp

                        @if($cell['type'] === 'skip')
                            {{-- Cell is covered by previous rowspan --}}
                        @elseif($cell['type'] === 'item')
                            <td rowspan="{{ $cell['rowspan'] }}" class="cell-content">
                                <div class="cell-class">{{ $cell['schedule']->academicClass->name ?? '-' }}</div>
                                <div class="cell-subject">{{ $cell['schedule']->subject }}</div>
                                <div class="cell-teacher">{{ $cell['schedule']->teacher->name ?? '-' }}</div>
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
                <td class="footer-left">Jadwal Mulai Berlaku pada Tanggal {{ $valid_date ?? date('d F Y') }}</td>
                <td class="footer-right">aSc Timetables</td>
            </tr>
        </table>
    </div>
    @endforeach
</body>
</html>
