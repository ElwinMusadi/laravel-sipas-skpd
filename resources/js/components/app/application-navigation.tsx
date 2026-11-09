import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type {
    ApplicationNavigationGroup,
    ApplicationPermission,
} from './navigation';

type Props = {
    groups: readonly ApplicationNavigationGroup[];
    permissions: Record<ApplicationPermission, boolean>;
};

/**
 * Sidebar groups showing only the links the signed-in user may open; a group
 * without any permitted link is left out entirely.
 */
export function ApplicationNavigation({ groups, permissions }: Props) {
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();

    return groups.map((group) => {
        const items = group.items.filter(
            (item) =>
                !item.requiredPermission ||
                permissions[item.requiredPermission],
        );

        if (items.length === 0) {
            return null;
        }

        return (
            <SidebarGroup key={group.title} className="px-2 py-0">
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {items.map((item) => {
                            const isActive = isCurrentOrParentUrl(item.href);

                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive}
                                        tooltip={item.title}
                                    >
                                        <Link
                                            href={item.href}
                                            prefetch
                                            aria-current={
                                                isCurrentUrl(item.href)
                                                    ? 'page'
                                                    : isActive
                                                      ? 'true'
                                                      : undefined
                                            }
                                        >
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        );
    });
}
