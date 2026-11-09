import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Archive,
    ArrowLeftRight,
    BarChart3,
    BadgeCheck,
    BookOpenCheck,
    CircleCheckBig,
    CircleX,
    ClipboardCheck,
    FileText,
    Hash,
    LayoutDashboard,
    MessagesSquare,
    MapPinned,
    Package,
    Signature,
    Users,
} from 'lucide-react';
import { dashboard } from '@/routes';
import { index as bapVerificationsIndex } from '@/routes/bap-verifications';
import { index as bapVerificationsPhaseTwoIndex } from '@/routes/bap-verifications-phase-2';
import { index as bapClarificationsIndex } from '@/routes/bap-clarifications';
import { index as bapAdministrationsIndex } from '@/routes/bap-administrations';
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

export type ApplicationNavigationItem = {
    title: string;
    icon: LucideIcon;
    href?: NavigationHref;
    availability: 'available' | 'planned';
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
                availability: 'available',
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
                availability: 'available',
                requiredPermission: 'viewBaps',
            },
            {
                title: 'Klarifikasi',
                icon: MessagesSquare,
                href: bapClarificationsIndex(),
                availability: 'available',
                requiredPermission: 'viewBapClarifications',
            },
        ],
    },
    {
        title: 'SKPD',
        items: [
            {
                title: 'Persediaan Nomerator',
                icon: Hash,
                href: skpdInventoryIndex(),
                availability: 'available',
                requiredPermission: 'viewSkpdInventory',
            },
            {
                title: 'Box SKPD',
                icon: Archive,
                href: skpdBoxIndex(),
                availability: 'available',
                requiredPermission: 'viewCentralSkpdInventory',
            },
            {
                title: 'Distribusi / Alokasi',
                icon: ArrowLeftRight,
                href: skpdAllocationIndex(),
                availability: 'available',
                requiredPermission: 'viewSkpdInventory',
            },
            {
                title: 'Buku Kendali',
                icon: BookOpenCheck,
                href: bukuKendaliIndex(),
                availability: 'available',
                requiredPermission: 'viewBukuKendali',
            },
        ],
    },
    {
        title: 'Verifikasi',
        items: [
            {
                title: 'Verifikasi Tahap 1',
                icon: BadgeCheck,
                href: bapVerificationsIndex(),
                availability: 'available',
                requiredPermission: 'viewBapVerificationsPhase1',
            },
            {
                title: 'Approval Tahap 1',
                icon: CircleCheckBig,
                availability: 'planned',
            },
            {
                title: 'Verifikasi Tahap 2',
                icon: BadgeCheck,
                href: bapVerificationsPhaseTwoIndex(),
                availability: 'available',
                requiredPermission: 'viewBapVerificationsPhase2',
            },
            {
                title: 'Approval Tahap 2',
                icon: CircleCheckBig,
                availability: 'planned',
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
                availability: 'available',
                requiredPermission: 'viewLaporanPemakaian',
            },
            {
                title: 'Batal/Rusak',
                icon: CircleX,
                href: laporanBatalRusakIndex(),
                availability: 'available',
                requiredPermission: 'viewLaporanPemakaian',
            },
            {
                title: 'Distribusi',
                icon: ArrowLeftRight,
                href: laporanDistribusiIndex(),
                availability: 'available',
                requiredPermission: 'viewLaporanPemakaian',
            },
            {
                title: 'Persediaan',
                icon: Package,
                href: laporanPersediaanIndex(),
                availability: 'available',
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
                availability: 'available',
                requiredPermission: 'viewBapAdministrations',
            },
            {
                title: 'Pengguna',
                icon: Users,
                href: usersIndex(),
                availability: 'available',
                requiredPermission: 'manageUsers',
            },
            {
                title: 'Master Loket',
                icon: MapPinned,
                href: loketsIndex(),
                availability: 'available',
                requiredPermission: 'manageLokets',
            },
            {
                title: 'Pejabat Penandatangan',
                icon: Signature,
                href: documentOfficialsIndex(),
                availability: 'available',
                requiredPermission: 'manageDocumentOfficials',
            },
        ],
    },
] as const;
