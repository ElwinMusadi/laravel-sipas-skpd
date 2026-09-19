<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 16mm 12mm 14mm; }
        * { box-sizing: border-box; }
        body { color: #1f2937; font-family: DejaVu Sans, sans-serif; font-size: 9px; line-height: 1.45; }
        h1, h2, p { margin: 0; }
        .identity { border-bottom: 2px solid #b7791f; display: table; padding-bottom: 10px; width: 100%; }
        .identity-logo, .identity-copy, .identity-meta { display: table-cell; vertical-align: middle; }
        .identity-logo { width: 54px; }
        .identity-logo img { height: 46px; object-fit: contain; width: 46px; }
        .identity-copy { padding-left: 8px; }
        .identity-copy strong { color: #92400e; display: block; font-size: 13px; }
        .identity-copy span { color: #4b5563; display: block; font-size: 8px; }
        .identity-meta { color: #4b5563; font-size: 7.5px; text-align: right; width: 150px; }
        .report-heading { margin: 14px 0 9px; }
        .report-heading h1 { font-size: 14px; letter-spacing: .03em; text-transform: uppercase; }
        .report-heading p { color: #4b5563; margin-top: 3px; }
        .metrics { display: table; margin: 10px 0 14px; table-layout: fixed; width: 100%; }
        .metric { border: 1px solid #d1d5db; display: table-cell; padding: 7px 8px; width: 25%; }
        .metric + .metric { border-left: 0; }
        .metric-label { color: #4b5563; display: block; font-size: 7.5px; }
        .metric-value { color: #111827; display: block; font-size: 14px; font-weight: bold; margin-top: 2px; }
        h2 { border-bottom: 1px solid #d1d5db; font-size: 10px; margin: 14px 0 6px; padding-bottom: 4px; text-transform: uppercase; }
        table { border-collapse: collapse; width: 100%; }
        thead { display: table-header-group; }
        th { background: #fef3c7; color: #78350f; font-size: 7.5px; font-weight: bold; text-align: left; }
        th, td { border: 1px solid #d1d5db; padding: 5px; vertical-align: top; }
        td.number, th.number { text-align: right; white-space: nowrap; }
        td.range { font-family: DejaVu Sans Mono, monospace; font-size: 8px; white-space: nowrap; }
        tfoot td { background: #f9fafb; font-weight: bold; }
        tr { page-break-inside: avoid; }
        .empty { border: 1px solid #d1d5db; color: #4b5563; padding: 10px; }
        .footer { border-top: 1px solid #d1d5db; color: #6b7280; font-size: 7px; margin-top: 14px; padding-top: 6px; }
    </style>
</head>
<body>
    <header class="identity">
        @if ($logoDataUri !== null)
            <div class="identity-logo">
                <img src="{{ $logoDataUri }}" alt="Lambang Pemprov Nusa Tenggara Timur">
            </div>
        @endif
        <div class="identity-copy">
            <strong>SIPAS-SKPD</strong>
            <span>Sistem Informasi Pengelolaan Administrasi SKPD</span>
            <span>UPTD Pendapatan Daerah Wilayah Kota Kupang</span>
        </div>
        <div class="identity-meta">
            <div>{{ $appName }}</div>
            <div>Dibuat: {{ $generatedAt->format('d-m-Y H:i') }}</div>
        </div>
    </header>

    <section class="report-heading">
        <h1>Laporan Sistem Pemakaian SKPD</h1>
        <p>Periode: <strong>{{ $period }}</strong>@if ($loket !== null) · Loket: <strong>{{ $loket }}</strong>@endif</p>
        <p>Hanya BAP yang telah selesai administratif yang ditampilkan.</p>
    </section>

    <section class="metrics">
        <div class="metric"><span class="metric-label">TOTAL BAP</span><span class="metric-value">{{ number_format($summary['total_baps'], 0, ',', '.') }}</span></div>
        <div class="metric"><span class="metric-label">SKPD TERPAKAI</span><span class="metric-value">{{ number_format($summary['total_usage'], 0, ',', '.') }}</span></div>
        <div class="metric"><span class="metric-label">ONLINE</span><span class="metric-value">{{ number_format($summary['total_online'], 0, ',', '.') }}</span></div>
        <div class="metric"><span class="metric-label">BATAL/RUSAK</span><span class="metric-value">{{ number_format($summary['total_cancellations'], 0, ',', '.') }}</span></div>
    </section>

    <h2>Rekap per Loket</h2>
    @if ($loketRecaps === [])
        <div class="empty">Belum ada data pemakaian SKPD pada periode ini.</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>Loket</th>
                    <th class="number">BAP</th>
                    <th class="number">Terpakai</th>
                    <th class="number">Online</th>
                    <th class="number">Batal/Rusak</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($loketRecaps as $recap)
                    <tr>
                        <td>{{ $recap['loket'] }}</td>
                        <td class="number">{{ number_format($recap['total_baps'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['total_usage'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['total_online'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['total_cancellations'], 0, ',', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td>Total</td>
                    <td class="number">{{ number_format($summary['total_baps'], 0, ',', '.') }}</td>
                    <td class="number">{{ number_format($summary['total_usage'], 0, ',', '.') }}</td>
                    <td class="number">{{ number_format($summary['total_online'], 0, ',', '.') }}</td>
                    <td class="number">{{ number_format($summary['total_cancellations'], 0, ',', '.') }}</td>
                </tr>
            </tfoot>
        </table>
    @endif

    <h2>Detail BAP</h2>
    @if ($baps->isEmpty())
        <div class="empty">Belum ada data pemakaian SKPD pada periode ini.</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>BAP</th>
                    <th>Loket</th>
                    <th>Nomerator</th>
                    <th class="number">Terpakai</th>
                    <th class="number">Online</th>
                    <th class="number">Batal/Rusak</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($baps as $bap)
                    <tr>
                        <td>{{ $bap->service_date->format('d-m-Y') }}</td>
                        <td>#{{ $bap->id }}</td>
                        <td>{{ $bap->loket->name }}</td>
                        <td class="range">{{ sprintf('%07d–%07d', $bap->numerator_start, $bap->numerator_end) }}</td>
                        <td class="number">{{ number_format($bap->total_usage, 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($bap->online_usage_count, 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($bap->cancellations_count, 0, ',', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <footer class="footer">
        Laporan Sistem ini dihasilkan saat diminta dari data BAP final. Batal/Rusak dan Online termasuk dalam total SKPD terpakai. Bukan format dokumen administrasi resmi.
    </footer>
</body>
</html>
