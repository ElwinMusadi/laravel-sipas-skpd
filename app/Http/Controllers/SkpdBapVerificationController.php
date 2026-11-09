<?php

namespace App\Http\Controllers;

use App\Actions\SkpdVerification\CompleteBapVerification;
use App\Actions\SkpdVerification\StartBapVerification;
use App\Actions\SkpdVerification\TakeOverBapVerification;
use App\BapVerificationChecklistType;
use App\BapVerificationResult;
use App\BapVerificationStage;
use App\BapVerificationStatus;
use App\Http\Requests\SkpdVerification\CompleteBapVerificationRequest;
use App\Models\Bap;
use App\Models\BapVerification;
use App\Models\BapVerificationChecklistItem;
use App\Models\BapVerificationDiscrepancy;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SkpdBapVerificationController extends Controller
{
    public function index(Request $request): Response
    {
        return $this->indexForStage($request, BapVerificationStage::Phase1);
    }

    public function indexPhase2(Request $request): Response
    {
        return $this->indexForStage($request, BapVerificationStage::Phase2);
    }

    public function show(Bap $bap, Request $request): Response
    {
        return $this->showForStage($bap, $request, BapVerificationStage::Phase1);
    }

    public function showPhase2(Bap $bap, Request $request): Response
    {
        return $this->showForStage($bap, $request, BapVerificationStage::Phase2);
    }

    public function start(Bap $bap, Request $request, StartBapVerification $startVerification): RedirectResponse
    {
        return $this->startForStage($bap, $request, $startVerification, BapVerificationStage::Phase1);
    }

    public function startPhase2(Bap $bap, Request $request, StartBapVerification $startVerification): RedirectResponse
    {
        return $this->startForStage($bap, $request, $startVerification, BapVerificationStage::Phase2);
    }

    public function takeOver(Bap $bap, Request $request, TakeOverBapVerification $takeOverVerification): RedirectResponse
    {
        return $this->takeOverForStage($bap, $request, $takeOverVerification, BapVerificationStage::Phase1);
    }

    public function takeOverPhase2(Bap $bap, Request $request, TakeOverBapVerification $takeOverVerification): RedirectResponse
    {
        return $this->takeOverForStage($bap, $request, $takeOverVerification, BapVerificationStage::Phase2);
    }

    public function complete(
        CompleteBapVerificationRequest $request,
        Bap $bap,
        CompleteBapVerification $completeVerification,
    ): RedirectResponse {
        return $this->completeForStage($request, $bap, $completeVerification, BapVerificationStage::Phase1);
    }

    public function completePhase2(
        CompleteBapVerificationRequest $request,
        Bap $bap,
        CompleteBapVerification $completeVerification,
    ): RedirectResponse {
        return $this->completeForStage($request, $bap, $completeVerification, BapVerificationStage::Phase2);
    }

    private function indexForStage(Request $request, BapVerificationStage $stage): Response
    {
        $this->actor($request);

        Gate::authorize($this->ability($stage, 'view'));

        $stages = $stage === BapVerificationStage::Phase2
            ? [BapVerificationStage::Phase1, BapVerificationStage::Phase2]
            : [BapVerificationStage::Phase1];

        $baps = Bap::query()
            ->with([
                'loket:id,name',
                'creator:id,name',
                'verifications' => function (Relation $query) use ($stages): void {
                    $query
                        ->whereIn('stage', array_map(
                            static fn (BapVerificationStage $verificationStage): string => $verificationStage->value,
                            $stages,
                        ))
                        ->with('verifier:id,name')
                        ->orderByDesc('attempt');
                },
            ])
            ->whereIn('status', $stage->queueBapStatuses())
            ->when($stage === BapVerificationStage::Phase2, function ($query): void {
                $query->whereHas('verifications', function ($verificationQuery): void {
                    $verificationQuery
                        ->where('stage', BapVerificationStage::Phase1)
                        ->where('status', BapVerificationStatus::Completed)
                        ->where('result', BapVerificationResult::Passed);
                });
            })
            ->orderBy('submitted_at')
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(function (Bap $bap) use ($stage): array {
                $verification = $this->verificationFromCollection($bap, $stage);
                $phaseOneVerification = $this->verificationFromCollection($bap, BapVerificationStage::Phase1);

                return [
                    'id' => $bap->id,
                    'document_number' => $bap->document_number,
                    'service_date' => $bap->service_date->toDateString(),
                    'loket' => $bap->loket->name,
                    'numerator_start' => $bap->numerator_start,
                    'numerator_end' => $bap->numerator_end,
                    'total_usage' => $bap->total_usage,
                    'online_usage_count' => $bap->online_usage_count,
                    'status' => $bap->status->value,
                    'created_by' => $bap->creator->name,
                    'submitted_at' => $bap->submitted_at?->toIso8601String(),
                    'verification' => $verification === null ? null : [
                        'verifier' => $verification->verifier->name,
                        'started_at' => $verification->started_at->toIso8601String(),
                    ],
                    'phase_one_verification' => $phaseOneVerification === null ? null : [
                        'verifier' => $phaseOneVerification->verifier->name,
                        'result' => $phaseOneVerification->result?->value,
                        'completed_at' => $phaseOneVerification->completed_at?->toIso8601String(),
                    ],
                ];
            });

        return Inertia::render('bap-verifications/index', [
            'baps' => $baps,
            'verification_stage' => $this->stageData($stage),
        ]);
    }

    private function showForStage(Bap $bap, Request $request, BapVerificationStage $stage): Response
    {
        $actor = $this->actor($request);

        Gate::authorize($this->ability($stage, 'view'));

        $bap->load([
            'loket:id,name',
            'creator:id,name',
            'usageSegments' => function (Relation $query): void {
                $query
                    ->with('skpdAllocation.skpdBox:id,box_number')
                    ->orderBy('numerator_start');
            },
            'cancellations' => function (Relation $query): void {
                $query
                    ->with('creator:id,name')
                    ->orderBy('numerator');
            },
        ]);
        $verification = $this->verificationForStage($bap, $stage);
        $phaseOneVerification = $stage === BapVerificationStage::Phase2
            ? $this->verificationForStage($bap, BapVerificationStage::Phase1)
            : null;

        return Inertia::render('bap-verifications/show', [
            'bap' => [
                'id' => $bap->id,
                'document_number' => $bap->document_number,
                'service_date' => $bap->service_date->toDateString(),
                'loket' => $bap->loket->name,
                'created_by' => $bap->creator->name,
                'submitted_at' => $bap->submitted_at?->toIso8601String(),
                'status' => $bap->status->value,
                'numerator_start' => $bap->numerator_start,
                'numerator_end' => $bap->numerator_end,
                'total_usage' => $bap->total_usage,
                'online_usage_count' => $bap->online_usage_count,
                'segments' => $bap->usageSegments
                    ->map(fn ($segment): array => [
                        'id' => $segment->id,
                        'allocation_id' => $segment->skpd_allocation_id,
                        'box_number' => $segment->skpdAllocation->skpdBox->box_number,
                        'numerator_start' => $segment->numerator_start,
                        'numerator_end' => $segment->numerator_end,
                        'quantity' => $segment->quantity,
                    ])
                    ->values()
                    ->all(),
                'cancellations' => $bap->cancellations
                    ->map(fn ($cancellation): array => [
                        'id' => $cancellation->id,
                        'numerator' => $cancellation->numerator,
                        'reason' => $cancellation->reason->value,
                        'reason_label' => $cancellation->reason->label(),
                        'description' => $cancellation->description,
                        'created_by' => $cancellation->creator->name,
                    ])
                    ->values()
                    ->all(),
            ],
            'verification_stage' => $this->stageData($stage),
            'verification' => $this->verificationData($verification),
            'phase_one_verification' => $this->verificationData($phaseOneVerification),
            'checklist' => $this->checklistData($bap, $verification),
            'can' => [
                'start' => $actor->can($this->ability($stage, 'start'), $bap),
                'complete' => $actor->can($this->ability($stage, 'complete'))
                    && $verification?->status === BapVerificationStatus::InProgress
                    && $verification->verifier_id === $actor->id,
                'take_over' => $actor->can($this->ability($stage, 'take-over'), $bap)
                    && $verification?->status === BapVerificationStatus::InProgress
                    && $verification->verifier_id !== $actor->id,
            ],
        ]);
    }

    private function startForStage(
        Bap $bap,
        Request $request,
        StartBapVerification $startVerification,
        BapVerificationStage $stage,
    ): RedirectResponse {
        $startVerification->handle($this->actor($request), $bap, $stage);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$stage->label()} dimulai. Catat hasil pemeriksaan fisik sebelum menyelesaikan verifikasi.",
        ]);

        return to_route($this->routeName($stage, 'show'), $bap);
    }

    private function takeOverForStage(
        Bap $bap,
        Request $request,
        TakeOverBapVerification $takeOverVerification,
        BapVerificationStage $stage,
    ): RedirectResponse {
        $takeOverVerification->handle($this->actor($request), $bap, $stage);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$stage->label()} berhasil diambil alih. Lanjutkan pemeriksaan fisik dan selesaikan verifikasi.",
        ]);

        return to_route($this->routeName($stage, 'show'), $bap);
    }

    private function completeForStage(
        CompleteBapVerificationRequest $request,
        Bap $bap,
        CompleteBapVerification $completeVerification,
        BapVerificationStage $stage,
    ): RedirectResponse {
        $verification = $completeVerification->handle(
            $this->actor($request),
            $bap,
            $stage,
            $request->verificationAttributes(),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $verification->result === BapVerificationResult::Passed
                ? $stage === BapVerificationStage::Phase1
                    ? 'Verifikasi Tahap 1 lulus dan BAP masuk antrean Verifikasi Tahap 2.'
                    : 'Verifikasi Tahap 2 lulus. BAP siap menjadi input proses Bendahara Barang berikutnya.'
                : 'Selisih dicatat dan BAP dikirim ke kebutuhan klarifikasi.',
        ]);

        return to_route($this->routeName($stage, 'show'), $bap);
    }

    private function verificationForStage(Bap $bap, BapVerificationStage $stage): ?BapVerification
    {
        return BapVerification::query()
            ->where('bap_id', $bap->id)
            ->where('stage', $stage)
            ->with([
                'verifier:id,name',
                'checklistItems' => fn (Relation $query): Relation => $query->orderBy('type'),
                'discrepancies' => fn (Relation $query): Relation => $query->orderBy('type'),
                'clarificationRequest',
            ])
            ->orderByDesc('attempt')
            ->first();
    }

    private function verificationFromCollection(Bap $bap, BapVerificationStage $stage): ?BapVerification
    {
        return $bap->verifications->first(
            fn (BapVerification $verification): bool => $verification->stage === $stage,
        );
    }

    /**
     * @return array{id: int, attempt: int, verifier: string, status: string, result: string|null, notes: string|null, started_at: string, completed_at: string|null, discrepancies: list<array{type: string, label: string, expected_value: string, actual_value: string, difference: int|null, notes: string}>, clarification_requested: bool}|null
     */
    private function verificationData(?BapVerification $verification): ?array
    {
        if ($verification === null) {
            return null;
        }

        return [
            'id' => $verification->id,
            'attempt' => $verification->attempt,
            'verifier' => $verification->verifier->name,
            'status' => $verification->status->value,
            'result' => $verification->result?->value,
            'notes' => $verification->notes,
            'started_at' => $verification->started_at->toIso8601String(),
            'completed_at' => $verification->completed_at?->toIso8601String(),
            'discrepancies' => array_values($verification->discrepancies
                ->map(fn (BapVerificationDiscrepancy $discrepancy): array => [
                    'type' => $discrepancy->type->value,
                    'label' => $discrepancy->type->label(),
                    'expected_value' => $discrepancy->expected_value,
                    'actual_value' => $discrepancy->actual_value,
                    'difference' => $discrepancy->difference,
                    'notes' => $discrepancy->notes,
                ])
                ->values()
                ->all()),
            'clarification_requested' => $verification->clarificationRequest !== null,
        ];
    }

    /**
     * @return list<array{type: string, label: string, expected_quantity: int, actual_quantity: int|null, quantity_difference: int|null, expected_numerator_start: int|null, expected_numerator_end: int|null, actual_numerator_start: int|null, actual_numerator_end: int|null, is_attested: bool}>
     */
    private function checklistData(Bap $bap, ?BapVerification $verification): array
    {
        $items = $verification?->checklistItems->keyBy('type') ?? collect();

        return array_map(function (BapVerificationChecklistType $type) use ($bap, $items): array {
            $item = $items->get($type->value);

            if (! $item instanceof BapVerificationChecklistItem) {
                return [
                    'type' => $type->value,
                    'label' => $type->label(),
                    'expected_quantity' => $this->expectedQuantity($bap, $type),
                    'actual_quantity' => null,
                    'quantity_difference' => null,
                    'expected_numerator_start' => $type->usesNumeratorRange() ? $bap->numerator_start : null,
                    'expected_numerator_end' => $type->usesNumeratorRange() ? $bap->numerator_end : null,
                    'actual_numerator_start' => null,
                    'actual_numerator_end' => null,
                    'is_attested' => false,
                ];
            }

            return [
                'type' => $type->value,
                'label' => $type->label(),
                'expected_quantity' => $item->expected_quantity ?? $this->expectedQuantity($bap, $type),
                'actual_quantity' => $item->actual_quantity,
                'quantity_difference' => $item->quantity_difference,
                'expected_numerator_start' => $item->expected_numerator_start,
                'expected_numerator_end' => $item->expected_numerator_end,
                'actual_numerator_start' => $item->actual_numerator_start,
                'actual_numerator_end' => $item->actual_numerator_end,
                'is_attested' => $item->is_attested,
            ];
        }, BapVerificationChecklistType::cases());
    }

    /**
     * @return array{value: string, label: string, verifier_label: string, is_phase_two: bool}
     */
    private function stageData(BapVerificationStage $stage): array
    {
        return [
            'value' => $stage->value,
            'label' => $stage->label(),
            'verifier_label' => $stage->verifierRole()->label(),
            'is_phase_two' => $stage === BapVerificationStage::Phase2,
        ];
    }

    private function expectedQuantity(Bap $bap, BapVerificationChecklistType $type): int
    {
        return match ($type) {
            BapVerificationChecklistType::UsageQuantity,
            BapVerificationChecklistType::Numerator,
            BapVerificationChecklistType::TindisanSets => $bap->total_usage,
            BapVerificationChecklistType::Cancellation => $bap->cancellations->count(),
            BapVerificationChecklistType::Online => $bap->online_usage_count,
        };
    }

    private function ability(BapVerificationStage $stage, string $action): string
    {
        $prefix = $action === 'view'
            ? 'view-bap-verifications'
            : "{$action}-bap-verification";

        return match ($stage) {
            BapVerificationStage::Phase1 => "{$prefix}-phase-1",
            BapVerificationStage::Phase2 => "{$prefix}-phase-2",
        };
    }

    private function routeName(BapVerificationStage $stage, string $action): string
    {
        return match ($stage) {
            BapVerificationStage::Phase1 => "bap-verifications.{$action}",
            BapVerificationStage::Phase2 => "bap-verifications-phase-2.{$action}",
        };
    }

    private function actor(Request $request): User
    {
        $actor = $request->user();

        abort_unless($actor instanceof User, 403);

        return $actor;
    }
}
