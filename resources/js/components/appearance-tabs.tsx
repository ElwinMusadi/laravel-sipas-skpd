import type { LucideIcon } from 'lucide-react';
import { Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Terang' },
    { value: 'dark', icon: Moon, label: 'Gelap' },
];

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div
            role="group"
            aria-label="Tema tampilan"
            className={cn(
                'bg-muted inline-flex gap-1 rounded-lg p-1',
                className,
            )}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => {
                const isActive = appearance === value;

                return (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => updateAppearance(value)}
                        className={cn(
                            'focus-visible:ring-ring/50 flex items-center rounded-md px-3.5 py-1.5 transition-colors outline-none focus-visible:ring-[3px]',
                            isActive
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                        )}
                    >
                        <Icon className="-ml-1 size-4" />
                        <span className="ml-1.5 text-sm">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
