<?php

namespace App\Http\Controllers;

use App\Exports\SkpdLaporanPemakaianExport;
use App\Models\Bap;
use App\Models\Loket;
use App\Models\User;
use App\SkpdLaporanPemakaianQuery;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Excel as ExcelWriter;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SkpdLaporanPemakaianController extends Controller
{
    public function index(Request $request): Response
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Inertia::render('laporan-pemakaian/index', [
            'baps' => $report
                ->detailQuery()
                ->paginate(15)
                ->withQueryString()
                ->through(fn (Bap $bap): array => $this->bapData($bap)),
            'filters' => $report->filters(),
            'lokets' => Loket::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Loket $loket): array => [
                    'id' => $loket->id,
                    'name' => $loket->name,
                ])
                ->all(),
            'summary' => $report->summary(),
            'loket_recaps' => $report->loketRecaps(),
        ]);
    }

    public function pdf(Request $request): HttpResponse
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Pdf::loadView('pdf.laporan-pemakaian', [
            'appName' => (string) config('app.name', 'SIPAS-SKPD'),
            'baps' => $report->detailQuery()->get(),
            'generatedAt' => now(),
            'logoDataUri' => $this->logoDataUri(),
            'loket' => $report->selectedLoketName(),
            'period' => $report->periodLabel(),
            'summary' => $report->summary(),
            'loketRecaps' => $report->loketRecaps(),
        ])
            ->setPaper('a4', 'landscape')
            ->setWarnings(false)
            ->addInfo([
                'Title' => 'Laporan Sistem Pemakaian SKPD',
                'Author' => 'SIPAS-SKPD',
            ])
            ->download($report->pdfFilename());
    }

    public function excel(Request $request): BinaryFileResponse
    {
        $this->actor($request);

        Gate::authorize('view-laporan-pemakaian');

        $report = $this->report($request);

        return Excel::download(
            new SkpdLaporanPemakaianExport($report),
            $report->excelFilename(),
            ExcelWriter::XLSX,
        );
    }

    /**
     * @return array{id: int, number: string, service_date: string, loket: string, numerator_start: int, numerator_end: int, total_usage: int, online_usage_count: int, cancellation_count: int}
     */
    private function bapData(Bap $bap): array
    {
        return [
            'id' => $bap->id,
            'number' => $bap->document_number,
            'service_date' => $bap->service_date->toDateString(),
            'loket' => $bap->loket->name,
            'numerator_start' => $bap->numerator_start,
            'numerator_end' => $bap->numerator_end,
            'total_usage' => $bap->total_usage,
            'online_usage_count' => $bap->online_usage_count,
            'cancellation_count' => $bap->cancellations_count,
        ];
    }

    private function logoDataUri(): ?string
    {
        $path = public_path('images/logo-pemprov-ntt.png');

        if (! is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            return null;
        }

        return 'data:image/png;base64,'.base64_encode($contents);
    }

    private function report(Request $request): SkpdLaporanPemakaianQuery
    {
        $filters = $request->validate([
            'month' => ['nullable', 'integer', 'between:1,12'],
            'year' => ['nullable', 'integer', 'between:2000,9999'],
            'loket' => ['nullable', 'integer', 'exists:lokets,id'],
        ]);

        return new SkpdLaporanPemakaianQuery(
            isset($filters['month']) ? (int) $filters['month'] : now()->month,
            isset($filters['year']) ? (int) $filters['year'] : now()->year,
            isset($filters['loket']) ? (int) $filters['loket'] : null,
        );
    }

    private function actor(Request $request): User
    {
        $actor = $request->user();

        abort_unless($actor instanceof User, 403);

        return $actor;
    }
}
