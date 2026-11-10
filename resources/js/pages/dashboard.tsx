import { Head, Link, usePage, type InertiaLinkProps } from '@inertiajs/react';
import {
    BarChart3,
    ClipboardCheck,
    ClipboardList,
    PackagePlus,
    Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import type { DashboardPresentationData } from '@/components/dashboard/dashboard-data';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { MyWork } from '@/components/dashboard/my-work';
import { RecentBaps } from '@/components/dashboard/recent-baps';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { index as bapAdministrationsIndex } from '@/routes/bap-administrations';
import { index as bapVerificationsIndex } from '@/routes/bap-verifications';
import { index as bapVerificationsPhaseTwoIndex } from '@/routes/bap-verifications-phase-2';
import { create as createBap } from '@/routes/baps';
import { index as laporanPemakaianIndex } from '@/routes/laporan-pemakaian';
import { create as createAllocation } from '@/routes/skpd/allocations';

type Props = { dashboard: DashboardPresentationData };

/**
 * A role-based shortcut in the page header; the first one is the primary
 * action and the rest are outlined so one button stands out.
 */
type QuickAction = {
    key: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon: LucideIcon;
    label: string;
};

export default function Dashboard({ dashboard: dashboardData }: Props) {
    const { auth } = usePage().props;
    const permissions = auth.permissions;
    const availableActions: (QuickAction | false)[] = [
        permissions.createBap && {
            key: 'create-bap',
            href: createBap(),
            icon: Plus,
            label: 'Buat BAP',
        },
        permissions.viewBapVerificationsPhase1 && {
            key: 'phase-1',
            href: bapVerificationsIndex(),
            icon: ClipboardList,
            label: 'Antrean Verifikasi Tahap 1',
        },
        permissions.viewBapVerificationsPhase2 && {
            key: 'phase-2',
            href: bapVerificationsPhaseTwoIndex(),
            icon: ClipboardList,
            label: 'Antrean Verifikasi Tahap 2',
        },
        permissions.viewBapAdministrations && {
            key: 'receipts',
            href: bapAdministrationsIndex(),
            icon: ClipboardCheck,
            label: 'Terima BAP',
        },
        permissions.manageSkpdInventory && {
            key: 'allocation',
            href: createAllocation(),
            icon: PackagePlus,
            label: 'Buat alokasi',
        },
        permissions.viewLaporanPemakaian && {
            key: 'report',
            href: laporanPemakaianIndex(),
            icon: BarChart3,
            label: 'Laporan Pemakaian',
        },
    ];
    const quickActions = availableActions.filter(
        (action): action is QuickAction => action !== false,
    );

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title={`Selamat datang, ${auth.user?.name ?? 'Pengguna'}`}
                    description="Prioritaskan BAP SKPD yang membutuhkan tindak lanjut."
                    meta={
                        <p className="text-muted-foreground text-xs">
                            UPTD Pendapatan Daerah Wilayah Kota Kupang
                        </p>
                    }
                    actions={
                        quickActions.length > 0
                            ? quickActions.map((action, actionIndex) => (
                                  <Button
                                      key={action.key}
                                      variant={
                                          actionIndex === 0
                                              ? 'default'
                                              : 'outline'
                                      }
                                      asChild
                                  >
                                      <Link href={action.href}>
                                          <action.icon />
                                          {action.label}
                                      </Link>
                                  </Button>
                              ))
                            : null
                    }
                />

                <DashboardMetrics metrics={dashboardData.metrics} />

                <section className="grid gap-4">
                    <MyWork items={dashboardData.workItems} />
                    <RecentBaps items={dashboardData.recentBaps} />
                </section>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
