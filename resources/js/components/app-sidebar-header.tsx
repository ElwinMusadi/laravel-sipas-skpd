import { AppearanceToggle } from '@/components/app/appearance-toggle';
import { HeaderUserMenu } from '@/components/app/header-user-menu';
import { NotificationPlaceholder } from '@/components/app/notification-placeholder';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                {/* <Breadcrumbs breadcrumbs={breadcrumbs} /> */}
                <div className="flex flex-col">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                    <span className="text-muted-foreground text-xs leading-tight">
                        Sistem Informasi Pengelolaan Administrasi SKPD
                    </span>
                </div>
            </div>
            <div className="ml-auto flex items-center gap-1">
                <NotificationPlaceholder />
                <AppearanceToggle />
                <HeaderUserMenu />
            </div>
        </header>
    );
}
