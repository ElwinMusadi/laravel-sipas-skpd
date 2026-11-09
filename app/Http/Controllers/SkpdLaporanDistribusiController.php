<?php

namespace App\Http\Controllers;

use App\Concerns\ServesLaporanSistem;
use App\Exports\SkpdLaporanDistribusiExport;
use App\Models\SkpdAllocation;
use App\SkpdLaporanDistribusiQuery;
use App\Support\BusinessDate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Excel as ExcelWriter;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SkpdLaporanDistribusiController extends Controller
{
    use ServesLaporanSistem;

    public function index(Request $request): Response
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Inertia::render('laporan-distribusi/index', [
            'allocations' => $report
                ->detailQuery()
                ->paginate(15)
                ->withQueryString()
                ->through(fn (SkpdAllocation $allocation): array => $this->allocationData($allocation)),
            'filters' => $report->filters(),
            'lokets' => $this->loketOptions(),
            'summary' => $report->summary(),
            'loket_recaps' => $report->loketRecaps(),
        ]);
    }

    /**
     * Stream every row for the current filters inline, so "Cetak PDF" opens
     * a printable document in a new tab instead of a paginated screen.
     */
    public function pdf(Request $request): HttpResponse
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Pdf::loadView('pdf.laporan-distribusi', [
            'appName' => (string) config('app.name', 'SIPAS-SKPD'),
            'allocations' => $report->detailQuery()->get(),
            'generatedAt' => BusinessDate::now(),
            'logoDataUri' => $this->logoDataUri(),
            'loket' => $report->selectedLoketName(),
            'period' => $report->periodLabel(),
            'summary' => $report->summary(),
            'loketRecaps' => $report->loketRecaps(),
        ])
            ->setPaper('a4', 'landscape')
            ->setWarnings(false)
            ->addInfo([
                'Title' => 'Laporan Sistem Distribusi SKPD',
                'Author' => 'SIPAS-SKPD',
            ])
            ->stream($report->pdfFilename());
    }

    public function xlsx(Request $request): BinaryFileResponse
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Excel::download(
            new SkpdLaporanDistribusiExport($report),
            $report->excelFilename(),
            ExcelWriter::XLSX,
        );
    }

    /**
     * @return array{id: int, allocation_date: string, box_number: string, loket: string, numerator_start: int, numerator_end: int, quantity: int, status: string, status_label: string, created_by: string, accepted_by: string|null, accepted_at: string|null}
     */
    private function allocationData(SkpdAllocation $allocation): array
    {
        return [
            'id' => $allocation->id,
            'allocation_date' => SkpdLaporanDistribusiQuery::allocationDate($allocation),
            'box_number' => $allocation->skpdBox->box_number,
            'loket' => $allocation->loket->name,
            'numerator_start' => $allocation->numerator_start,
            'numerator_end' => $allocation->numerator_end,
            'quantity' => $allocation->quantity,
            'status' => $allocation->status->value,
            'status_label' => $allocation->status->label(),
            'created_by' => $allocation->creator->name,
            'accepted_by' => $allocation->acceptor?->name,
            'accepted_at' => $allocation->accepted_at?->toIso8601String(),
        ];
    }

    private function report(Request $request): SkpdLaporanDistribusiQuery
    {
        return new SkpdLaporanDistribusiQuery($this->laporanPeriod($request));
    }
}
