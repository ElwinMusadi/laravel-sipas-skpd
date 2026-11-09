import { FileDown, FileSpreadsheet, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
    title: string;
    description: string;
    periodLabel: string;
    pdfUrl: string;
    xlsxUrl: string;
    children?: ReactNode;
};

export function LaporanHeader({
    title,
    description,
    periodLabel,
    pdfUrl,
    xlsxUrl,
    children,
}: Props) {
    return (
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {title}
                    </h1>
                    <Badge data-print-hidden variant="outline">
                        Hanya baca
                    </Badge>
                </div>
                <p className="text-muted-foreground max-w-3xl text-sm">
                    {description}
                </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
                <p className="text-muted-foreground text-sm">
                    Periode:{' '}
                    <span className="text-foreground font-medium">
                        {periodLabel}
                    </span>
                </p>
                {children}
                <div
                    data-print-hidden
                    className="flex flex-wrap gap-2 sm:justify-end"
                >
                    <Button variant="outline" size="sm" asChild>
                        <a href={pdfUrl}>
                            <FileDown data-icon="inline-start" />
                            PDF
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <a href={xlsxUrl}>
                            <FileSpreadsheet data-icon="inline-start" />
                            Excel
                        </a>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                    >
                        <Printer data-icon="inline-start" />
                        Cetak
                    </Button>
                </div>
            </div>
        </section>
    );
}
