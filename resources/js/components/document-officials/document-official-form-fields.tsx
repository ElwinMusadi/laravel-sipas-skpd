import { useState } from 'react';
import InputError from '@/components/input-error';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type DocumentOfficialFormData = {
    id: number;
    role: string;
    role_label: string;
    name: string;
    nip: string | null;
    rank: string | null;
    position: string;
    effective_from: string;
};

/** Fields rendered with an inline error; anything else goes to the summary. */
export const documentOfficialFieldNames = [
    'role',
    'name',
    'nip',
    'rank',
    'position',
    'effective_from',
];

type Props = {
    errors: Partial<
        Record<
            'role' | 'name' | 'nip' | 'rank' | 'position' | 'effective_from',
            string
        >
    >;
    official?: DocumentOfficialFormData;
    roles?: { value: string; label: string }[];
    defaultRole?: string | null;
    defaultEffectiveFrom?: string;
};

export function DocumentOfficialFormFields({
    errors,
    official,
    roles = [],
    defaultRole = null,
    defaultEffectiveFrom = '',
}: Props) {
    const [role, setRole] = useState(official?.role ?? defaultRole ?? '');
    const [effectiveFrom, setEffectiveFrom] = useState(
        official?.effective_from ?? defaultEffectiveFrom,
    );

    return (
        <div className="grid gap-6">
            <div className="grid gap-2">
                {official ? (
                    <>
                        <span className="text-sm font-medium">
                            Peran tanda tangan
                        </span>
                        <p className="bg-muted rounded-xl px-3 py-2.5 text-sm font-medium">
                            {official.role_label}
                        </p>
                    </>
                ) : (
                    <>
                        <Label htmlFor="role">Peran tanda tangan</Label>
                        <input type="hidden" name="role" value={role} />
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger
                                id="role"
                                className="w-full"
                                aria-invalid={Boolean(errors.role)}
                            >
                                <SelectValue placeholder="Pilih peran" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.role} />
                    </>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">Nama lengkap dan gelar</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={official?.name}
                    required
                    maxLength={255}
                    aria-invalid={Boolean(errors.name)}
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="nip">NIP (opsional)</Label>
                    <Input
                        id="nip"
                        name="nip"
                        defaultValue={official?.nip ?? ''}
                        inputMode="numeric"
                        maxLength={32}
                        placeholder="19880421 201101 2 006"
                        aria-invalid={Boolean(errors.nip)}
                    />
                    <InputError message={errors.nip} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="rank">Pangkat/Golongan (opsional)</Label>
                    <Input
                        id="rank"
                        name="rank"
                        defaultValue={official?.rank ?? ''}
                        maxLength={100}
                        placeholder="Penata/IIId"
                        aria-invalid={Boolean(errors.rank)}
                    />
                    <InputError message={errors.rank} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="position">Jabatan</Label>
                <Input
                    id="position"
                    name="position"
                    defaultValue={official?.position}
                    required
                    maxLength={255}
                    aria-invalid={Boolean(errors.position)}
                />
                <InputError message={errors.position} />
            </div>

            <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="effective_from">Mulai berlaku</Label>
                <DatePicker
                    id="effective_from"
                    name="effective_from"
                    value={effectiveFrom}
                    onChange={setEffectiveFrom}
                    placeholder="Pilih tanggal"
                    invalid={Boolean(errors.effective_from)}
                    clearable={false}
                />
                <p className="text-muted-foreground text-xs">
                    BAP dengan tanggal pelayanan sejak tanggal ini memakai
                    pejabat ini pada PDF.
                </p>
                <InputError message={errors.effective_from} />
            </div>
        </div>
    );
}
