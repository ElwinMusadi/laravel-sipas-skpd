<?php

namespace App\Http\Controllers;

use App\BapStatus;
use App\Models\Bap;
use App\Models\BapCancellation;
use App\Models\Loket;
use App\Models\User;
use App\Support\BusinessDate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SkpdBukuKendaliController extends Controller
{
    public function index(Request $request): Response
    {
        $this->actor($request);

        Gate::authorize('view-buku-kendali');

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:50'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'loket' => ['nullable', 'integer', 'exists:lokets,id'],
        ]);
        $startDate = $filters['start_date'] ?? BusinessDate::now()->startOfMonth()->toDateString();
        $endDate = $filters['end_date'] ?? BusinessDate::today();
        $search = trim((string) ($filters['search'] ?? ''));

        $query = $this->completedBapQuery(
            $startDate,
            $endDate,
            isset($filters['loket']) ? (int) $filters['loket'] : null,
            $search,
        );
        $summary = $this->summaryData(clone $query);

        return Inertia::render('buku-kendali/index', [
            'baps' => $query
                ->with(['loket:id,name', 'receivedBy:id,name'])
                ->withCount('cancellations')
                ->orderByDesc('service_date')
                ->orderByDesc('id')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (Bap $bap): array => $this->bapData($bap)),
            'filters' => [
                'search' => $search,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'loket' => isset($filters['loket']) ? (int) $filters['loket'] : null,
            ],
            'lokets' => Loket::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Loket $loket): array => [
                    'id' => $loket->id,
                    'name' => $loket->name,
                ])
                ->all(),
            'summary' => $summary,
        ]);
    }

    /**
     * @return Builder<Bap>
     */
    private function completedBapQuery(
        string $startDate,
        string $endDate,
        ?int $loketId,
        string $search,
    ): Builder {
        $query = Bap::query()
            ->where('status', BapStatus::Completed->value)
            ->whereDate('service_date', '>=', $startDate)
            ->whereDate('service_date', '<=', $endDate);

        if ($loketId !== null) {
            $query->where('loket_id', $loketId);
        }

        if ($search !== '') {
            $numericSearch = ltrim($search, '#');

            $query->where(function (Builder $query) use ($search, $numericSearch): void {
                $query->whereHas(
                    'loket',
                    fn (Builder $loketQuery): Builder => $loketQuery->where(
                        'name',
                        'like',
                        "%{$search}%",
                    ),
                );

                if (ctype_digit($numericSearch)) {
                    $number = (int) $numericSearch;

                    $query
                        ->orWhere('id', $number)
                        ->orWhere(function (Builder $rangeQuery) use ($number): void {
                            $rangeQuery
                                ->where('numerator_start', '<=', $number)
                                ->where('numerator_end', '>=', $number);
                        });
                }
            });
        }

        return $query;
    }

    /**
     * @param  Builder<Bap>  $query
     * @return array{total_baps: int, total_usage: int, total_online: int, total_cancellations: int}
     */
    private function summaryData(Builder $query): array
    {
        $summary = (clone $query)
            ->toBase()
            ->selectRaw('count(*) as total_baps')
            ->selectRaw('coalesce(sum(total_usage), 0) as total_usage')
            ->selectRaw('coalesce(sum(online_usage_count), 0) as total_online')
            ->first();
        $totalCancellations = BapCancellation::query()
            ->whereIn('bap_id', (clone $query)->select('id'))
            ->count();

        return [
            'total_baps' => (int) ($summary->total_baps ?? 0),
            'total_usage' => (int) ($summary->total_usage ?? 0),
            'total_online' => (int) ($summary->total_online ?? 0),
            'total_cancellations' => $totalCancellations,
        ];
    }

    /**
     * @return array{id: int, number: string, service_date: string, loket: string, numerator_start: int, numerator_end: int, total_usage: int, online_usage_count: int, cancellation_count: int, received_by: string|null, received_at: string|null, status: string}
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
            'received_by' => $bap->receivedBy?->name,
            'received_at' => $bap->received_at?->toIso8601String(),
            'status' => $bap->status->value,
        ];
    }

    private function actor(Request $request): User
    {
        $actor = $request->user();

        abort_unless($actor instanceof User, 403);

        return $actor;
    }
}
