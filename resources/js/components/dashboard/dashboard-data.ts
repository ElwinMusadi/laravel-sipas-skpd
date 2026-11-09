import type { BapStatus } from '@/components/bap/bap-status-badge';

/**
 * Work-item urgency category; BAP rows use the real BapStatus instead.
 */
export type DashboardStatus =
    | 'draft'
    | 'waiting'
    | 'in_progress'
    | 'discrepancy'
    | 'completed';

export type DashboardMetric = {
    id: 'today' | 'waiting' | 'in_progress' | 'discrepancy';
    label: string;
    value: number;
    description: string;
};

export type DashboardWorkItem = {
    id: string;
    title: string;
    count: number;
    status: DashboardStatus;
    description: string;
    href?: string;
};

export type RecentBap = {
    id: number;
    documentNumber: string;
    loket: string;
    serviceDate: string;
    submittedAt: string | null;
    status: BapStatus;
};

export type DashboardPresentationData = {
    metrics: readonly DashboardMetric[];
    workItems: readonly DashboardWorkItem[];
    recentBaps: readonly RecentBap[];
};
