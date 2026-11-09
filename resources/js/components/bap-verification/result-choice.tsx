import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { VerificationResultValue } from '@/components/bap-verification/types';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type Props = {
    value: VerificationResultValue;
    onChange: (value: VerificationResultValue) => void;
    labelledBy: string;
    describedBy?: string;
};

/**
 * The pass/discrepancy decision as a radio group: one choice is always
 * selected and the selected card is outlined in its result color.
 */
export function ResultChoice({
    value,
    onChange,
    labelledBy,
    describedBy,
}: Props) {
    return (
        <RadioGroup
            value={value}
            onValueChange={(next) => onChange(next as VerificationResultValue)}
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            className="grid gap-3 sm:grid-cols-2"
        >
            <ResultOption
                value="passed"
                icon={CheckCircle2}
                title="Lulus verifikasi"
                description="Seluruh nilai fisik sesuai dengan nilai sistem."
                selectedClassName="has-[[aria-checked=true]]:border-success has-[[aria-checked=true]]:bg-success/5 has-[[aria-checked=true]]:ring-1 has-[[aria-checked=true]]:ring-success"
                iconClassName="text-success"
            />
            <ResultOption
                value="discrepancy"
                icon={AlertTriangle}
                title="Ada selisih"
                description="Selisih dikirim ke Loket melalui klarifikasi."
                selectedClassName="has-[[aria-checked=true]]:border-destructive has-[[aria-checked=true]]:bg-destructive/5 has-[[aria-checked=true]]:ring-1 has-[[aria-checked=true]]:ring-destructive"
                iconClassName="text-destructive"
            />
        </RadioGroup>
    );
}

function ResultOption({
    value,
    icon: Icon,
    title,
    description,
    selectedClassName,
    iconClassName,
}: {
    value: VerificationResultValue;
    icon: LucideIcon;
    title: string;
    description: string;
    selectedClassName: string;
    iconClassName: string;
}) {
    const id = `verification-result-${value}`;

    return (
        <Label
            htmlFor={id}
            className={cn(
                'hover:bg-muted/50 has-focus-visible:ring-ring/30 flex cursor-pointer items-start gap-3 rounded-xl border p-4 leading-normal font-normal transition-colors has-focus-visible:ring-3',
                selectedClassName,
            )}
        >
            <RadioGroupItem value={value} id={id} className="mt-0.5" />
            <span className="grid gap-1">
                <span className="flex items-center gap-2 font-medium">
                    <Icon className={cn('size-4', iconClassName)} />
                    {title}
                </span>
                <span className="text-muted-foreground text-sm">
                    {description}
                </span>
            </span>
        </Label>
    );
}
