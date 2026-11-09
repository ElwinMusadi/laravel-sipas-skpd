import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export type RoleOption = {
    value: string;
    label: string;
};

export type LoketOption = {
    id: number;
    name: string;
};

export type ManagedUser = {
    id: number;
    username: string;
    name: string;
    nip: string;
    role: string;
    loket: LoketOption | null;
    is_active: boolean;
};

/** Fields rendered with an inline error; anything else goes to the summary. */
export const userFormFieldNames = [
    'username',
    'name',
    'nip',
    'password',
    'password_confirmation',
    'role',
    'loket_id',
    'is_active',
];

type FormErrors = {
    username?: string;
    name?: string;
    nip?: string;
    password?: string;
    password_confirmation?: string;
    role?: string;
    loket_id?: string;
    is_active?: string;
};

type Props = {
    errors: FormErrors;
    roles: RoleOption[];
    lokets: LoketOption[];
    user?: ManagedUser;
    includePassword?: boolean;
};

export function UserFormFields({
    errors,
    roles,
    lokets,
    user,
    includePassword = false,
}: Props) {
    const [role, setRole] = useState(user?.role ?? 'petugas_loket');
    const [loketId, setLoketId] = useState(
        user?.loket ? String(user.loket.id) : '',
    );
    const [isActive, setIsActive] = useState(user?.is_active ?? true);
    const requiresLoket = role === 'petugas_loket';

    return (
        <div className="grid gap-6">
            <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    name="username"
                    defaultValue={user?.username}
                    required
                    autoComplete="username"
                    placeholder="contoh: petugas.loket"
                    aria-invalid={Boolean(errors.username)}
                    aria-describedby="username-hint"
                />
                <p id="username-hint" className="text-muted-foreground text-xs">
                    3–50 karakter; gunakan huruf, angka, titik, tanda hubung,
                    atau underscore. Username disimpan dalam huruf kecil.
                </p>
                <InputError message={errors.username} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">Nama</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={user?.name}
                    required
                    autoComplete="name"
                    placeholder="Nama lengkap"
                    aria-invalid={Boolean(errors.name)}
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="nip">NIP</Label>
                <Input
                    id="nip"
                    name="nip"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{18}"
                    defaultValue={user?.nip}
                    required
                    autoComplete="off"
                    maxLength={18}
                    placeholder="18 digit NIP"
                    className="font-mono tabular-nums"
                    aria-invalid={Boolean(errors.nip)}
                    aria-describedby="nip-hint"
                />
                <p id="nip-hint" className="text-muted-foreground text-xs">
                    NIP wajib terdiri dari tepat 18 digit dan tidak digunakan
                    sebagai credential login.
                </p>
                <InputError message={errors.nip} />
            </div>

            {includePassword && (
                <>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password sementara</Label>
                        <PasswordInput
                            id="password"
                            name="password"
                            required
                            autoComplete="new-password"
                            placeholder="Masukkan password"
                            aria-invalid={Boolean(errors.password)}
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">
                            Konfirmasi password
                        </Label>
                        <PasswordInput
                            id="password_confirmation"
                            name="password_confirmation"
                            required
                            autoComplete="new-password"
                            placeholder="Ulangi password"
                            aria-invalid={Boolean(errors.password_confirmation)}
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>
                </>
            )}

            <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <input type="hidden" name="role" value={role} />
                <Select value={role} onValueChange={setRole}>
                    <SelectTrigger
                        id="role"
                        className="w-full"
                        aria-invalid={Boolean(errors.role)}
                    >
                        <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                        {roles.map((roleOption) => (
                            <SelectItem
                                key={roleOption.value}
                                value={roleOption.value}
                            >
                                {roleOption.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.role} />
            </div>

            {requiresLoket && (
                <div className="grid gap-2">
                    <Label htmlFor="loket_id">Loket</Label>
                    <input type="hidden" name="loket_id" value={loketId} />
                    <Select value={loketId} onValueChange={setLoketId}>
                        <SelectTrigger
                            id="loket_id"
                            className="w-full"
                            aria-invalid={Boolean(errors.loket_id)}
                        >
                            <SelectValue placeholder="Pilih Loket" />
                        </SelectTrigger>
                        <SelectContent>
                            {lokets.map((loket) => (
                                <SelectItem
                                    key={loket.id}
                                    value={String(loket.id)}
                                >
                                    {loket.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.loket_id} />
                </div>
            )}

            <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="grid gap-1">
                        <Label htmlFor="is_active">Akun aktif</Label>
                        <p
                            id="is_active-description"
                            className="text-muted-foreground text-sm"
                        >
                            Akun tidak aktif tidak dapat masuk, dan sesi yang
                            sedang berjalan berakhir saat pengguna membuka
                            halaman berikutnya.
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
        </div>
    );
}
