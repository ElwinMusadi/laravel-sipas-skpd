import type { BapStatus } from '@/components/bap/bap-status-badge';

export type ChecklistType =
    | 'usage_quantity'
    | 'numerator'
    | 'tindisan_sets'
    | 'cancellation'
    | 'online';

export type ChecklistDefinition = {
    type: ChecklistType;
    label: string;
    expected_quantity: number;
    actual_quantity: number | null;
    quantity_difference: number | null;
    expected_numerator_start: number | null;
    expected_numerator_end: number | null;
    actual_numerator_start: number | null;
    actual_numerator_end: number | null;
    is_attested: boolean;
};

export type VerificationDiscrepancy = {
    type: ChecklistType;
    label: string;
    expected_value: string;
    actual_value: string;
    difference: number | null;
    notes: string;
};

export type Verification = {
    id: number;
    verifier: string;
    status: 'in_progress' | 'completed';
    result: 'passed' | 'discrepancy' | null;
    notes: string | null;
    started_at: string;
    completed_at: string | null;
    clarification_requested: boolean;
    discrepancies: VerificationDiscrepancy[];
};

export type VerificationStage = {
    value: 'phase_1' | 'phase_2';
    label: string;
    verifier_label: string;
    is_phase_two: boolean;
};

export type VerificationBap = {
    id: number;
    document_number: string;
    service_date: string;
    loket: string;
    created_by: string;
    submitted_at: string | null;
    status: BapStatus;
    numerator_start: number;
    numerator_end: number;
    total_usage: number;
    online_usage_count: number;
    segments: {
        id: number;
        allocation_id: number;
        box_number: string;
        numerator_start: number;
        numerator_end: number;
        quantity: number;
    }[];
    cancellations: {
        id: number;
        numerator: number;
        reason: string;
        reason_label: string;
        description: string | null;
        created_by: string;
    }[];
};

export type VerificationResultValue = 'passed' | 'discrepancy';

/** One checklist row as typed by the verifier; numbers stay strings until submit. */
export type ChecklistInput = {
    type: ChecklistType;
    is_attested: boolean;
    actual_quantity: string;
    actual_numerator_start: string;
    actual_numerator_end: string;
};

export type ChecklistComparison = ChecklistInput & {
    label: string;
    unit: string;
    expected_value: string;
    actual_value: string;
    /** Physical minus system quantity. */
    difference: number | null;
    /** `null` while the physical value is missing. */
    matches: boolean | null;
    is_complete: boolean;
    /** Why a filled-in value cannot be compared yet, e.g. a reversed range. */
    issue: string | null;
};
