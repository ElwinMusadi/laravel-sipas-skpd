import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Archive,
    ArrowLeftRight,
    BarChart3,
    BookOpenCheck,
    CircleX,
    ClipboardCheck,
    FileText,
    FileX2,
    Hash,
    LayoutDashboard,
    ListChecks,
    MessagesSquare,
    MapPinned,
    Package,
    ShieldCheck,
    Signature,
    Users,
} from 'lucide-react';
import { dashboard } from '@/routes';
import { index as bapAdministrationsIndex } from '@/routes/bap-administrations';
import { index as bapCancellationsIndex } from '@/routes/bap-cancellations';
import { index as bapClarificationsIndex } from '@/routes/bap-clarifications';
import { index as bapVerificationsIndex } from '@/routes/bap-verifications';
import { index as bapVerificationsPhaseTwoIndex } from '@/routes/bap-verifications-phase-2';
import { index as bapsIndex } from '@/routes/baps';
import { index as bukuKendaliIndex } from '@/routes/buku-kendali';
import { index as documentOfficialsIndex } from '@/routes/document-officials';
import { index as laporanBatalRusakIndex } from '@/routes/laporan-batal-rusak';
import { index as laporanDistribusiIndex } from '@/routes/laporan-distribusi';
import { index as laporanPemakaianIndex } from '@/routes/laporan-pemakaian';
import { index as laporanPersediaanIndex } from '@/routes/laporan-persediaan';
import { index as loketsIndex } from '@/routes/lokets';
import { index as skpdAllocationIndex } from '@/routes/skpd/allocations';
import { index as skpdBoxIndex } from '@/routes/skpd/boxes';
import { index as skpdInventoryIndex } from '@/routes/skpd/inventory';
import { index as usersIndex } from '@/routes/users';

type NavigationHref = NonNullable<InertiaLinkProps['href']>;

export type ApplicationPermission =
    | 'manageUsers'
    | 'manageLokets'
    | 'manageDocumentOfficials'
    | 'viewSkpdInventory'
    | 'viewCentralSkpdInventory'
    | 'viewBaps'
    | 'viewBapCancellations'
    | 'viewBapVerificationsPhase1'
    | 'viewBapVerificationsPhase2'
    | 'viewBapClarifications'
    | 'viewBapAdministrations'
    | 'viewBukuKendali'
    | 'viewLaporanPemakaian';

/**
 * A sidebar link. Its title matches the page heading it opens.
 */
export type ApplicationNavigationItem = {
    title: string;
    icon: LucideIcon;
    href: NavigationHref;
    requiredPermission?: ApplicationPermission;
};

export type ApplicationNavigationGroup = {
    title: string;
    items: readonly ApplicationNavigationItem[];
};

export const applicationNavigation: readonly ApplicationNavigationGroup[] = [
    {
        title: 'Dashboard',
        items: [
            {
                title: 'Dashboard',
                icon: LayoutDashboard,
                href: dashboard(),
            },
        ],
    },
    {
        title: 'Operasional',
        items: [
            {
                title: 'BAP SKPD',
                icon: FileText,
                href: bapsIndex(),
                requiredPermission: 'viewBaps',
            },
            {
                title: 'Riwayat Batal/Rusak',
                icon: FileX2,
                href: bapCancellationsIndex(),
                requiredPermission: 'viewBapCancellations',
            },
            {
                title: 'Klarifikasi',
                icon: MessagesSquare,
                href: bapClarificationsIndex(),
                requiredPermission: 'viewBapClarifications',
            },
        ],
    },
    {
        title: 'SKPD',
        items: [
            {
                title: 'Persediaan SKPD',
                icon: Hash,
                href: skpdInventoryIndex(),
                requiredPermission: 'viewSkpdInventory',
            },
            {
                title: 'Box SKPD',
                icon: Archive,
                href: skpdBoxIndex(),
                requiredPermission: 'viewCentralSkpdInventory',
            },
            {
                title: 'Distribusi / Alokasi',
                icon: ArrowLeftRight,
                href: skpdAllocationIndex(),
                requiredPermission: 'viewSkpdInventory',
            },
            {
                title: 'Buku Kendali',
                icon: BookOpenCheck,
                href: bukuKendaliIndex(),
                requiredPermission: 'viewBukuKendali',
            },
        ],
    },
    {
        // Approval Kasie per tahap is deferred, not cancelled; add its
        // items here once the pages exist.
        title: 'Verifikasi',
        items: [
            {
                title: 'Verifikasi Tahap 1',
                icon: ListChecks,
                href: bapVerificationsIndex(),
                requiredPermission: 'viewBapVerificationsPhase1',
            },
            {
                title: 'Verifikasi Tahap 2',
                icon: ShieldCheck,
                href: bapVerificationsPhaseTwoIndex(),
                requiredPermission: 'viewBapVerificationsPhase2',
            },
        ],
    },
    {
        title: 'Laporan',
        items: [
            {
                title: 'Pemakaian',
                icon: BarChart3,
                href: laporanPemakaianIndex(),
                requiredPermission: 'viewLaporanPemakaian',
            },
            {
                title: 'Batal/Rusak',
                icon: CircleX,
                href: laporanBatalRusakIndex(),
                requiredPermission: 'viewLaporanPemakaian',
            },
            {
                title: 'Distribusi',
                icon: ArrowLeftRight,
                href: laporanDistribusiIndex(),
                requiredPermission: 'viewLaporanPemakaian',
            },
            {
                title: 'Persediaan',
                icon: Package,
                href: laporanPersediaanIndex(),
                requiredPermission: 'viewLaporanPemakaian',
            },
        ],
    },
    {
        title: 'Administrasi',
        items: [
            {
                title: 'Administrasi BAP',
                icon: ClipboardCheck,
                href: bapAdministrationsIndex(),
                requiredPermission: 'viewBapAdministrations',
            },
            {
                title: 'Pengguna',
                icon: Users,
                href: usersIndex(),
                requiredPermission: 'manageUsers',
            },
            {
                title: 'Master Loket',
                icon: MapPinned,
                href: loketsIndex(),
                requiredPermission: 'manageLokets',
            },
            {
                title: 'Pejabat Penandatangan',
                icon: Signature,
                href: documentOfficialsIndex(),
                requiredPermission: 'manageDocumentOfficials',
            },
        ],
    },
] as const;
