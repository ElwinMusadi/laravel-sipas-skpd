import { FileSpreadsheet, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
    title: string;
    description: string;
    periodLabel: string;
    /** Which date decides the period, e.g. "tanggal pelayanan BAP (WITA)". */
    periodBasis: string;
    pdfUrl: string;
    xlsxUrl: string;
    children?: ReactNode;
};

/**
 * Laporan Sistem heading. Printing goes through the PDF so the printout always
 * holds every row for the current filters, not just the page on screen.
 */
export function LaporanHeader({
    title,
    description,
    periodLabel,
    periodBasis,
    pdfUrl,
    xlsxUrl,
    children,
}: Props) {
    return (
        <PageHeader
            title={title}
            description={description}
            badges={
                <Badge data-print-hidden variant="outline">
                    Hanya baca
                </Badge>
            }
            meta={
                <div className="text-muted-foreground flex flex-col gap-0.5 text-sm">
                    <p>
                        Periode:{' '}
                        <span className="text-foreground font-medium">
                            {periodLabel}
                        </span>
                    </p>
                    {children}
                    <p className="text-xs" data-print-hidden>
                        Periode dihitung dari {periodBasis}.
                    </p>
                </div>
            }
            actions={
                <>
                    <Button variant="outline" asChild>
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener"
                            title="Buka PDF lengkap sesuai filter untuk dicetak"
                        >
                            <Printer data-icon="inline-start" />
                            Cetak PDF
                            <span className="sr-only">(membuka tab baru)</span>
                        </a>
                    </Button>
                    <Button variant="outline" asChild>
                        <a href={xlsxUrl}>
                            <FileSpreadsheet data-icon="inline-start" />
                            Unduh Excel
                        </a>
                    </Button>
                </>
            }
        />
    );
}
