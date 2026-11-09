import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppearance } from '@/hooks/use-appearance';

export function AppearanceToggle() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const enablesDarkMode = resolvedAppearance === 'light';
    const label = enablesDarkMode
        ? 'Aktifkan mode gelap'
        : 'Aktifkan mode terang';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={label}
                    onClick={() =>
                        updateAppearance(enablesDarkMode ? 'dark' : 'light')
                    }
                >
                    {enablesDarkMode ? <Moon /> : <Sun />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
