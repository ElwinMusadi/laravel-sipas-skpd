import { Head, Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    ClipboardCheck,
    ClipboardList,
    PackagePlus,
    Plus,
} from 'lucide-react';
import type { ReactNode } from 'react';
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

export default function Dashboard({ dashboard: dashboardData }: Props) {
    const { auth } = usePage().props;
    const permissions = auth.permissions;
    const quickActions: ReactNode[] = [];

    if (permissions.createBap) {
        quickActions.push(
            <Button key="create-bap" asChild>
                <Link href={createBap()}>
                    <Plus />
                    Buat BAP
                </Link>
            </Button>,
        );
    }

    if (permissions.viewBapVerificationsPhase1) {
        quickActions.push(
            <Button key="phase-1" asChild>
                <Link href={bapVerificationsIndex()}>
                    <ClipboardList />
                    Antrean Verifikasi Tahap 1
                </Link>
            </Button>,
        );
    }

    if (permissions.viewBapVerificationsPhase2) {
        quickActions.push(
            <Button key="phase-2" asChild>
                <Link href={bapVerificationsPhaseTwoIndex()}>
                    <ClipboardList />
                    Antrean Verifikasi Tahap 2
                </Link>
            </Button>,
        );
    }

    if (permissions.viewBapAdministrations) {
        quickActions.push(
            <Button key="receipts" asChild>
                <Link href={bapAdministrationsIndex()}>
                    <ClipboardCheck />
                    Terima BAP
                </Link>
            </Button>,
        );
    }

    if (permissions.manageSkpdInventory) {
        quickActions.push(
            <Button key="allocation" variant="outline" asChild>
                <Link href={createAllocation()}>
                    <PackagePlus />
                    Buat alokasi
                </Link>
            </Button>,
        );
    }

    if (permissions.viewLaporanPemakaian) {
        quickActions.push(
            <Button key="report" variant="outline" asChild>
                <Link href={laporanPemakaianIndex()}>
                    <BarChart3 />
                    Laporan Pemakaian
                </Link>
            </Button>,
        );
    }

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
                    actions={quickActions.length > 0 ? quickActions : null}
                />

                <DashboardMetrics metrics={dashboardData.metrics} />

                <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
