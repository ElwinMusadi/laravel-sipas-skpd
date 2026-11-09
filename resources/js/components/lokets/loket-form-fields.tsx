import { useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export type LoketFormData = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
};

type Props = {
    errors: {
        code?: string;
        name?: string;
        description?: string;
        is_active?: string;
    };
    loket?: LoketFormData;
    includeStatus?: boolean;
};

export function LoketFormFields({
    errors,
    loket,
    includeStatus = false,
}: Props) {
    const [isActive, setIsActive] = useState(loket?.is_active ?? true);

    return (
        <div className="grid gap-6">
            <div className="grid gap-2">
                <Label htmlFor="code">Kode Loket</Label>
                <Input
                    id="code"
                    name="code"
                    defaultValue={loket?.code}
                    required
                    autoComplete="off"
                    placeholder="contoh: SAMSAT-KANTOR"
                    aria-invalid={Boolean(errors.code)}
                />
                <p className="text-muted-foreground text-xs">
                    Kode harus unik; gunakan huruf, angka, titik, tanda hubung,
                    atau underscore.
                </p>
                <InputError message={errors.code} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">Nama Loket</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={loket?.name}
                    required
                    placeholder="contoh: SAMSAT Kantor"
                    aria-invalid={Boolean(errors.name)}
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Keterangan (opsional)</Label>
                <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    defaultValue={loket?.description ?? ''}
                    placeholder="Keterangan singkat Loket"
                    aria-invalid={Boolean(errors.description)}
                />
                <InputError message={errors.description} />
            </div>

            {includeStatus ? (
                <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                        <div className="grid gap-1">
                            <Label htmlFor="is_active">Loket aktif</Label>
                            <p
                                id="is_active-description"
                                className="text-muted-foreground text-sm"
                            >
                                Loket tidak aktif tidak dapat menerima alokasi,
                                penugasan baru, atau BAP baru. Riwayatnya tetap
                                dapat dibaca.
                            </p>
                        </div>
                        <input
                            type="hidden"
                            name="is_active"
                            value={isActive ? '1' : '0'}
                        />
                        <Switch
                            id="is_active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                            aria-describedby="is_active-description"
                            aria-invalid={Boolean(errors.is_active)}
                        />
                    </div>
                    <InputError message={errors.is_active} />
                </div>
            ) : null}
        </div>
    );
}
