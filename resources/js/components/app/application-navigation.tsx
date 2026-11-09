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

export function ApplicationNavigation({ groups, permissions }: Props) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return groups.map((group) => {
        const items = group.items.filter(
            (item) =>
                item.availability === 'available' &&
                (!item.requiredPermission ||
                    permissions[item.requiredPermission]),
        );

        if (items.length === 0) {
            return null;
        }

        return (
            <SidebarGroup key={group.title} className="px-2 py-0">
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {items.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                {item.href ? (
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentOrParentUrl(
                                            item.href,
                                        )}
                                        tooltip={item.title}
                                    >
                                        <Link href={item.href} prefetch>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                ) : (
                                    <SidebarMenuButton
                                        disabled
                                        aria-label={`${item.title} belum tersedia`}
                                        title={`${item.title} belum tersedia`}
                                    >
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                )}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        );
    });
}
