<?php

namespace App\Http\Controllers;

use App\Concerns\ServesLaporanSistem;
use App\Exports\SkpdLaporanBatalRusakExport;
use App\Models\BapCancellation;
use App\SkpdLaporanBatalRusakQuery;
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

class SkpdLaporanBatalRusakController extends Controller
{
    use ServesLaporanSistem;

    public function index(Request $request): Response
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Inertia::render('laporan-batal-rusak/index', [
            'cancellations' => $report
                ->detailQuery()
                ->paginate(15)
                ->withQueryString()
                ->through(fn (BapCancellation $cancellation): array => $this->cancellationData($cancellation)),
            'filters' => $report->filters(),
            'lokets' => $this->loketOptions(),
            'summary' => $report->summary(),
            'loket_recaps' => $report->loketRecaps(),
        ]);
    }

    public function pdf(Request $request): HttpResponse
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Pdf::loadView('pdf.laporan-batal-rusak', [
            'appName' => (string) config('app.name', 'SIPAS-SKPD'),
            'cancellations' => $report->detailQuery()->get(),
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
                'Title' => 'Laporan Sistem Batal/Rusak SKPD',
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
            new SkpdLaporanBatalRusakExport($report),
            $report->excelFilename(),
            ExcelWriter::XLSX,
        );
    }

    /**
     * @return array{id: int, bap_id: int, service_date: string, document_number: string, loket: string, numerator: int, reason: string, reason_label: string, description: string|null}
     */
    private function cancellationData(BapCancellation $cancellation): array
    {
        return [
            'id' => $cancellation->id,
            'bap_id' => $cancellation->bap_id,
            'service_date' => $cancellation->bap->service_date->toDateString(),
            'document_number' => $cancellation->bap->document_number,
            'loket' => $cancellation->bap->loket->name,
            'numerator' => $cancellation->numerator,
            'reason' => $cancellation->reason->value,
            'reason_label' => $cancellation->reason->label(),
            'description' => $cancellation->description,
        ];
    }

    private function report(Request $request): SkpdLaporanBatalRusakQuery
    {
        return new SkpdLaporanBatalRusakQuery($this->laporanPeriod($request));
    }
}
