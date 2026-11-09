import { AppearanceToggle } from '@/components/app/appearance-toggle';
import { HeaderUserMenu } from '@/components/app/header-user-menu';
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
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <div className="flex min-w-0 flex-col">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                    <span className="text-muted-foreground hidden truncate text-xs leading-tight sm:block">
                        Sistem Informasi Pengelolaan Administrasi SKPD
                    </span>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <AppearanceToggle />
                {/* The sidebar footer holds the user menu from md up. */}
                <div className="md:hidden">
                    <HeaderUserMenu />
                </div>
            </div>
        </header>
    );
}
