@extends('pdf.laporan-sistem-layout')

@section('title', 'Laporan Sistem Distribusi SKPD')

@section('subtitle')
    <p>Berdasarkan tanggal alokasi dari pusat ke Loket. Didistribusikan tidak termasuk alokasi dibatalkan dan dikembalikan ke pusat.</p>
@endsection

@section('content')
    <section class="metrics">
        <div class="metric"><span class="metric-label">DIDISTRIBUSIKAN</span><span class="metric-value">{{ number_format($summary['distributed_sets'], 0, ',', '.') }} set</span></div>
        @foreach ($summary['statuses'] as $status)
            <div class="metric"><span class="metric-label">{{ mb_strtoupper($status['label']) }}</span><span class="metric-value">{{ number_format($status['total_sets'], 0, ',', '.') }} set</span></div>
        @endforeach
    </section>

    <h2>Rekap per Status</h2>
    <table>
        <thead>
            <tr>
                <th>Status</th>
                <th class="number">Jumlah Alokasi</th>
                <th class="number">Jumlah Set</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($summary['statuses'] as $status)
                <tr>
                    <td>{{ $status['label'] }}</td>
                    <td class="number">{{ number_format($status['total_allocations'], 0, ',', '.') }}</td>
                    <td class="number">{{ number_format($status['total_sets'], 0, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td>Didistribusikan</td>
                <td class="number">{{ number_format($summary['distributed_allocations'], 0, ',', '.') }}</td>
                <td class="number">{{ number_format($summary['distributed_sets'], 0, ',', '.') }}</td>
            </tr>
        </tfoot>
    </table>

    <h2>Rekap per Loket</h2>
    @if ($loketRecaps === [])
        <div class="empty">Belum ada distribusi SKPD pada periode ini.</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>Loket</th>
                    <th class="number">Alokasi</th>
                    <th class="number">Set Didistribusikan</th>
                    <th class="number">Menunggu Handover</th>
                    <th class="number">Diterima Loket</th>
                    <th class="number">Dibatalkan</th>
                    <th class="number">Dikembalikan ke Pusat</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($loketRecaps as $recap)
                    <tr>
                        <td>{{ $recap['loket'] }}</td>
                        <td class="number">{{ number_format($recap['distributed_allocations'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['distributed_sets'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['pending_sets'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['received_sets'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['cancelled_sets'], 0, ',', '.') }}</td>
                        <td class="number">{{ number_format($recap['returned_sets'], 0, ',', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h2>Detail Alokasi</h2>
    @if ($allocations->isEmpty())
        <div class="empty">Belum ada distribusi SKPD pada periode ini.</div>
    @else
        <table>
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>Box</th>
                    <th>Loket</th>
                    <th>Nomerator</th>
                    <th class="number">Set</th>
                    <th>Status</th>
                    <th>Dibuat Oleh</th>
                    <th>Diterima Oleh</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($allocations as $allocation)
                    <tr>
                        <td>{{ \Carbon\CarbonImmutable::parse(\App\SkpdLaporanDistribusiQuery::allocationDate($allocation))->format('d-m-Y') }}</td>
                        <td>{{ $allocation->skpdBox->box_number }}</td>
                        <td>{{ $allocation->loket->name }}</td>
                        <td class="range">{{ sprintf('%07d–%07d', $allocation->numerator_start, $allocation->numerator_end) }}</td>
                        <td class="number">{{ number_format($allocation->quantity, 0, ',', '.') }}</td>
                        <td>{{ $allocation->status->label() }}</td>
                        <td>{{ $allocation->creator->name }}</td>
                        <td>
                            @if ($allocation->acceptor !== null)
                                {{ $allocation->acceptor->name }}<br>
                                <span>{{ \App\Support\LaporanPeriod::businessTime($allocation->accepted_at)?->format('d-m-Y H:i') }} WITA</span>
                            @else
                                —
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
@endsection

@section('footer', 'Laporan Sistem ini dihasilkan saat diminta dari data alokasi SKPD. Alokasi yang ditarik sebagian dicatat dengan range terpakai saat ini.')
