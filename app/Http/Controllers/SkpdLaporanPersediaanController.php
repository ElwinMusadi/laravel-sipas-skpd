<?php

namespace App\Http\Controllers;

use App\Concerns\ServesLaporanSistem;
use App\Exports\SkpdLaporanPersediaanExport;
use App\Models\SkpdBox;
use App\SkpdLaporanPersediaanQuery;
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

class SkpdLaporanPersediaanController extends Controller
{
    use ServesLaporanSistem;

    public function index(Request $request): Response
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Inertia::render('laporan-persediaan/index', [
            'boxes' => $report
                ->detailQuery()
                ->paginate(15)
                ->withQueryString()
                ->through(fn (SkpdBox $box): array => SkpdLaporanPersediaanQuery::boxData($box)),
            'filters' => $report->filters(),
            'lokets' => $this->loketOptions(),
            'position' => [
                'cutoff_at' => $report->cutoff()->toIso8601String(),
                'label' => $report->cutoffLabel(),
                'is_end_of_month' => $report->isEndOfMonthPosition(),
            ],
            'summary' => $report->summary(),
            'loket_recaps' => $report->loketRecaps(),
        ]);
    }

    public function pdf(Request $request): HttpResponse
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Pdf::loadView('pdf.laporan-persediaan', [
            'appName' => (string) config('app.name', 'SIPAS-SKPD'),
            'boxes' => $report->detailQuery()
                ->get()
                ->map(fn (SkpdBox $box): array => SkpdLaporanPersediaanQuery::boxData($box))
                ->all(),
            'cutoffLabel' => $report->cutoffLabel(),
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
                'Title' => 'Laporan Sistem Persediaan SKPD',
                'Author' => 'SIPAS-SKPD',
            ])
            ->download($report->pdfFilename());
    }

    public function xlsx(Request $request): BinaryFileResponse
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Excel::download(
            new SkpdLaporanPersediaanExport($report),
            $report->excelFilename(),
            ExcelWriter::XLSX,
        );
    }

    private function report(Request $request): SkpdLaporanPersediaanQuery
    {
        return new SkpdLaporanPersediaanQuery($this->laporanPeriod($request));
    }
}
