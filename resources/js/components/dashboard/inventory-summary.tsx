import { Boxes } from 'lucide-react';
import { EmptyState } from '@/components/app/empty-state';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export function InventorySummary() {
    return (
        <Card className="rounded-xl">
            <CardHeader>
                <CardTitle>Ringkasan Persediaan</CardTitle>
                <CardDescription>
                    Persediaan akan tersedia setelah modul SKPD dihubungkan.
                </CardDescription>
            </CardHeader>
            <EmptyState
                icon={Boxes}
                title="Belum ada ringkasan persediaan"
                description="Data persediaan akan ditampilkan ketika integrasi inventaris SIPAS-SKPD tersedia."
            />
        </Card>
    );
}
