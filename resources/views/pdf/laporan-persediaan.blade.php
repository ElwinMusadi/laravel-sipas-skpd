@extends('pdf.laporan-sistem-layout')

@section('title', 'Laporan Sistem Persediaan SKPD')

@section('subtitle')
    <p>Posisi persediaan per <strong>{{ $cutoffLabel }}</strong>.@if ($loket !== null) Kolom pusat hanya memperhitungkan alokasi Loket terpilih.@endif</p>
@endsection

@section('content')
    <section class="metrics">
        <div class="metric"><span class="metric-label">TOTAL SET</span><span class="metric-value">{{ number_format($summary['total_sets'], 0, ',', '.') }}</span></div>
        <div class="metric"><span class="metric-label">SISA DI PUSAT</span><span class="metric-value">{{ number_format($summary['central_remaining'], 0, ',', '.') }}</span></div>
        <div class="metric"><span class="metric-label">MENUNGGU HANDOVER</span><span class="metric-value">{{ number_format($summary['pending_quantity'], 0, ',', '.') }}</span></div>
        <div class="metric"><span class="metric-label">SISA DI LOKET</span><span class="metric-value">{{ number_format($summary['loket_remaining'], 0, ',', '.') }}</span></div>
        <div class="metric"><span class="metric-label">TERPAKAI</span><span class="metric-value">{{ number_format($summary['used_quantity'], 0, ',', '.') }}</span></div>
    </section>

    <h2>Persediaan per Loket</h2>
    @if ($loketRecaps === [])
        <div class="empty">Belum ada persediaan SKPD di Loket pada posisi ini.</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>Loket</th>
                    <th class="number">Diterima</th>
                    <th class="number">Menunggu Handover</th>
                    <th class="number">Terpakai</th>
                    <th class="number">Sisa di Loket</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($loketRecaps as $recap)
                    <tr>
                        <td>{{ $recap['loket'] }}</td>
                        <td class="number">{{ number_format($recap['received_quantity'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['pending_quantity'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['used_quantity'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['remaining_quantity'], 0, ',', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h2>Persediaan per Box</h2>
    @if ($boxes === [])
        <div class="empty">Belum ada Box SKPD pada posisi ini.</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>Box</th>
                    <th>Nomerator</th>
                    <th class="number">Total Set</th>
                    <th class="number">Dialokasikan ke Loket</th>
                    <th class="number">Menunggu Handover</th>
                    <th class="number">Terpakai</th>
                    <th class="number">Sisa di Pusat</th>
                    <th class="number">Sisa di Loket</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($boxes as $box)
                    <tr>
                        <td>{{ $box['box_number'] }}</td>
                        <td class="range">{{ sprintf('%07d–%07d', $box['numerator_start'], $box['numerator_end']) }}</td>
                        <td class="number">{{ number_format($box['total_sets'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($box['allocated_quantity'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($box['pending_quantity'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($box['used_quantity'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($box['central_remaining'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($box['loket_remaining'], 0, ',', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2">Total</td>
                    <td class="number">{{ number_format($summary['total_sets'], 0, ',', '.') }}</td>
                    <td class="number">{{ number_format($summary['allocated_quantity'], 0, ',', '.') }}</td>
                    <td class="number">{{ number_format($summary['pending_quantity'], 0, ',', '.') }}</td>
                    <td class="number">{{ number_format($summary['used_quantity'], 0, ',', '.') }}</td>
                    <td class="number">{{ number_format($summary['central_remaining'], 0, ',', '.') }}</td>
                    <td class="number">{{ number_format($summary['loket_remaining'], 0, ',', '.') }}</td>
                </tr>
            </tfoot>
        </table>
    @endif
@endsection

@section('footer', 'Laporan Sistem ini disusun ulang dari data alokasi dan BAP. Alokasi yang ditarik ke pusat dihitung dengan jumlah saat ini, sehingga periode sebelum penarikan menampilkan angka yang sudah berkurang. Alokasi dibatalkan tidak dihitung.')
