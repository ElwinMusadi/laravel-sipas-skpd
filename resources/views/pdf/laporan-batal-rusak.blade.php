@extends('pdf.laporan-sistem-layout')

@section('title', 'Laporan Sistem Batal/Rusak SKPD')

@section('subtitle')
    <p>Hanya Nomerator Batal/Rusak pada BAP yang telah selesai administratif yang ditampilkan.</p>
@endsection

@section('content')
    <section class="metrics">
        <div class="metric"><span class="metric-label">TOTAL BATAL/RUSAK</span><span class="metric-value">{{ number_format($summary['total'], 0, ',', '.') }}</span></div>
        @foreach ($summary['reasons'] as $reason)
            <div class="metric"><span class="metric-label">{{ mb_strtoupper($reason['label']) }}</span><span class="metric-value">{{ number_format($reason['total'], 0, ',', '.') }}</span></div>
        @endforeach
    </section>

    <h2>Rekap per Loket</h2>
    @if ($loketRecaps === [])
        <div class="empty">Belum ada data Batal/Rusak SKPD pada periode ini.</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>Loket</th>
                    @foreach ($summary['reasons'] as $reason)
                        <th class="number">{{ $reason['label'] }}</th>
                    @endforeach
                    <th class="number">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($loketRecaps as $recap)
                    <tr>
                        <td>{{ $recap['loket'] }}</td>
                        @foreach ($summary['reasons'] as $reason)
                            <td class="number">{{ number_format($recap['reasons'][$reason['reason']] ?? 0, 0, ',', '.') }}</td>
                        @endforeach
                        <td class="number">{{ number_format($recap['total'], 0, ',', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td>Total</td>
                    @foreach ($summary['reasons'] as $reason)
                        <td class="number">{{ number_format($reason['total'], 0, ',', '.') }}</td>
                    @endforeach
                    <td class="number">{{ number_format($summary['total'], 0, ',', '.') }}</td>
                </tr>
            </tfoot>
        </table>
    @endif

    <h2>Detail Batal/Rusak</h2>
    @if ($cancellations->isEmpty())
        <div class="empty">Belum ada data Batal/Rusak SKPD pada periode ini.</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>Nomor Dokumen BAP</th>
                    <th>Loket</th>
                    <th>Nomerator</th>
                    <th>Alasan</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($cancellations as $cancellation)
                    <tr>
                        <td>{{ $cancellation->bap->service_date->format('d-m-Y') }}</td>
                        <td>{{ $cancellation->bap->document_number }}</td>
                        <td>{{ $cancellation->bap->loket->name }}</td>
                        <td class="range">{{ sprintf('%07d', $cancellation->numerator) }}</td>
                        <td>{{ $cancellation->reason->label() }}</td>
                        <td>{{ $cancellation->description ?? '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
@endsection

@section('footer', 'Laporan Sistem ini dihasilkan saat diminta dari data BAP final. Batal/Rusak termasuk dalam total SKPD terpakai pada Laporan Pemakaian.')
