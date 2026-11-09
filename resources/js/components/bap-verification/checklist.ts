import type {
    ChecklistComparison,
    ChecklistDefinition,
    ChecklistInput,
    VerificationResultValue,
} from '@/components/bap-verification/types';
import { formatQuantity, formatRange } from '@/components/inventory/format';

export function emptyChecklistInput(
    definition: ChecklistDefinition,
): ChecklistInput {
    return {
        type: definition.type,
        is_attested: false,
        actual_quantity: '',
        actual_numerator_start: '',
        actual_numerator_end: '',
    };
}

export function parsePhysicalNumber(value: string): number | null {
    if (!/^\d+$/.test(value)) {
        return null;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) ? number : null;
}

/**
 * Compares what the verifier counted with the system value of one item.
 */
export function compareChecklistItem(
    definition: ChecklistDefinition,
    input: ChecklistInput | undefined,
): ChecklistComparison {
    const current = input ?? emptyChecklistInput(definition);

    if (definition.type === 'numerator') {
        const actualStart = parsePhysicalNumber(current.actual_numerator_start);
        const actualEnd = parsePhysicalNumber(current.actual_numerator_end);
        const isReversed =
            actualStart !== null &&
            actualEnd !== null &&
            actualEnd < actualStart;
        const isComplete =
            actualStart !== null && actualEnd !== null && !isReversed;
        const actualQuantity = isComplete ? actualEnd - actualStart + 1 : null;

        return {
            ...current,
            label: definition.label,
            unit: 'set',
            expected_value: formatRange(
                definition.expected_numerator_start ?? 0,
                definition.expected_numerator_end ?? 0,
            ),
            actual_value:
                actualStart === null || actualEnd === null
                    ? 'Belum diisi'
                    : formatRange(actualStart, actualEnd),
            difference:
                actualQuantity === null
                    ? null
                    : actualQuantity - definition.expected_quantity,
            matches: isComplete
                ? actualStart === definition.expected_numerator_start &&
                  actualEnd === definition.expected_numerator_end
                : null,
            is_complete: isComplete,
            issue: isReversed
                ? 'Nomerator akhir lebih kecil dari Nomerator awal.'
                : null,
        };
    }

    const unit = definition.type === 'tindisan_sets' ? 'set' : 'SKPD';
    const actualQuantity = parsePhysicalNumber(current.actual_quantity);
    const difference =
        actualQuantity === null
            ? null
            : actualQuantity - definition.expected_quantity;

    return {
        ...current,
        label: definition.label,
        unit,
        expected_value: `${formatQuantity(definition.expected_quantity)} ${unit}`,
        actual_value:
            actualQuantity === null
                ? 'Belum diisi'
                : `${formatQuantity(actualQuantity)} ${unit}`,
        difference,
        matches: actualQuantity === null ? null : difference === 0,
        is_complete: actualQuantity !== null,
        issue: null,
    };
}

/**
 * Every reason the result cannot be submitted yet, in the order the verifier
 * should resolve them. An empty list means the form is ready.
 */
export function submitBlockers(
    comparisons: ChecklistComparison[],
    result: VerificationResultValue,
    discrepancyNotes: Partial<Record<string, string>>,
): string[] {
    const blockers: string[] = [];
    const labels = (items: ChecklistComparison[]): string =>
        items.map((item) => item.label).join(', ');
    const missingValues = comparisons.filter((item) => !item.is_complete);
    const unattested = comparisons.filter((item) => !item.is_attested);
    const mismatches = comparisons.filter((item) => item.matches === false);

    if (missingValues.length > 0) {
        blockers.push(
            `Nilai fisik belum diisi atau belum valid: ${labels(missingValues)}.`,
        );
    }

    if (unattested.length > 0) {
        blockers.push(
            `Belum dicentang telah diperiksa: ${labels(unattested)}.`,
        );
    }

    if (result === 'passed' && mismatches.length > 0) {
        blockers.push(
            `${mismatches.length} item memiliki selisih. Pilih “Ada selisih” untuk meminta klarifikasi.`,
        );
    }

    if (
        result === 'discrepancy' &&
        missingValues.length === 0 &&
        mismatches.length === 0
    ) {
        blockers.push(
            'Tidak ada selisih antara nilai sistem dan nilai fisik. Pilih “Lulus verifikasi”.',
        );
    }

    if (result === 'discrepancy') {
        const missingNotes = mismatches.filter(
            (item) => (discrepancyNotes[item.type] ?? '').trim() === '',
        );

        if (missingNotes.length > 0) {
            blockers.push(
                `Catatan verifier belum diisi untuk: ${labels(missingNotes)}.`,
            );
        }
    }

    return blockers;
}
