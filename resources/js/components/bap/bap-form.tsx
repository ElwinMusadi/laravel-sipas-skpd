import { Form, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import SkpdBapController from '@/actions/App/Http/Controllers/SkpdBapController';
import InputError from '@/components/input-error';
import {
    formatNomerator,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { create, index } from '@/routes/baps';

type Allocation = {
    id: number;
    numerator_start: number;
    numerator_end: number;
    remaining_quantity: number;
};

type CancellationReason = { value: string; label: string };

type CancellationItem = {
    numerator: string;
    reason: string;
    description: string;
};

type Props = {
    mode: 'create' | 'edit';
    bap?: {
        id: number;
        service_date: string;
        numerator_start: number;
        numerator_end: number;
        online_usage_count: number;
        loket: { id: number; name: string };
        cancellation_count?: number;
        cancellations?: {
            numerator: number;
            reason: string;
            description: string | null;
        }[];
    };
    loket?: { id: number; name: string } | null;
    lokets?: { id: number; name: string }[];
    defaultServiceDate?: string;
    expectedNumeratorStart?: number | null;
    allocations?: Allocation[];
    cancellationReasons?: CancellationReason[];
};

function digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
}

function numeratorDigits(value: string): string {
    return digitsOnly(value).slice(0, 7);
}

function quantityForRange(start: string, end: string): number | null {
    if (!/^\d{7}$/.test(start) || !/^\d{7}$/.test(end)) {
        return null;
    }

    const quantity = Number(end) - Number(start) + 1;

    return quantity > 0 ? quantity : null;
}

function emptyItem(): CancellationItem {
    return { numerator: '', reason: '', description: '' };
}

export function BapForm({
    mode,
    bap,
    loket,
    lokets = [],
    defaultServiceDate,
    expectedNumeratorStart,
    allocations = [],
    cancellationReasons = [],
}: Props) {
    const formLoket = bap?.loket ?? loket;
    const initialServiceDateStr = bap?.service_date ?? defaultServiceDate ?? '';
    const [serviceDate, setServiceDate] = useState<Date | undefined>(
        initialServiceDateStr
            ? new Date(`${initialServiceDateStr}T00:00:00`)
            : undefined,
    );
    const [numeratorStart, setNumeratorStart] = useState(
        bap
            ? formatNomerator(bap.numerator_start)
            : expectedNumeratorStart === null ||
                expectedNumeratorStart === undefined
              ? ''
              : formatNomerator(expectedNumeratorStart),
    );
    const [numeratorEnd, setNumeratorEnd] = useState(
        bap ? formatNomerator(bap.numerator_end) : '',
    );
    const [onlineUsageCount, setOnlineUsageCount] = useState(
        bap ? String(bap.online_usage_count) : '0',
    );

    // Cancellation state
    const initialItems: CancellationItem[] = (bap?.cancellations ?? []).map(
        (c) => ({
            numerator: formatNomerator(c.numerator),
            reason: c.reason,
            description: c.description ?? '',
        }),
    );
    const [cancellationCount, setCancellationCount] = useState(
        String(bap?.cancellation_count ?? 0),
    );
    const [cancellationItems, setCancellationItems] =
        useState<CancellationItem[]>(initialItems);

    const parsedCount = Math.max(0, parseInt(cancellationCount, 10) || 0);

    // Keep items array in sync with count
    useEffect(() => {
        setCancellationItems((prev) => {
            if (parsedCount === prev.length) {
                return prev;
            }
            if (parsedCount < prev.length) {
                return prev.slice(0, parsedCount);
            }
            return [
                ...prev,
                ...Array.from({ length: parsedCount - prev.length }, emptyItem),
            ];
        });
    }, [parsedCount]);

    const totalUsage = quantityForRange(numeratorStart, numeratorEnd);
    const onlineUsage = onlineUsageCount === '' ? 0 : Number(onlineUsageCount);
    const onlineIsValid = Number.isInteger(onlineUsage) && onlineUsage >= 0;
    const normalUsage =
        totalUsage !== null &&
        onlineIsValid &&
        onlineUsage + parsedCount <= totalUsage
            ? totalUsage - onlineUsage - parsedCount
            : null;
    const formAction =
        mode === 'create'
            ? SkpdBapController.store()
            : SkpdBapController.update(bap?.id ?? 0);
    const formId = `bap-form-${mode}-${bap?.id ?? 'new'}`;

    function updateItem(
        index: number,
        field: keyof CancellationItem,
        value: string,
    ) {
        setCancellationItems((prev) =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item,
            ),
        );
    }

    return (
        <div className="grid max-w-5xl gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid gap-6">
                <Card>
                    <CardContent>
                        <Form
                            id={formId}
                            action={formAction}
                            className="grid gap-4 sm:grid-cols-2 sm:gap-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label htmlFor="loket_id">
                                            Loket Pelayanan
                                        </Label>
                                        {mode === 'create' &&
                                        lokets.length > 0 ? (
                                            <>
                                                <input
                                                    name="loket_id"
                                                    type="hidden"
                                                    value={formLoket?.id ?? ''}
                                                />
                                                <Select
                                                    value={
                                                        formLoket?.id.toString() ??
                                                        ''
                                                    }
                                                    onValueChange={(value) =>
                                                        router.get(
                                                            create.url({
                                                                query: {
                                                                    loket: value,
                                                                },
                                                            }),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="loket_id"
                                                        aria-invalid={Boolean(
                                                            errors.loket_id,
                                                        )}
                                                    >
                                                        <SelectValue placeholder="Pilih Loket aktif" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            {lokets.map(
                                                                (option) => (
                                                                    <SelectItem
                                                                        key={
                                                                            option.id
                                                                        }
                                                                        value={option.id.toString()}
                                                                    >
                                                                        {
                                                                            option.name
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                <InputError
                                                    message={errors.loket_id}
                                                />
                                                <p className="text-muted-foreground text-xs">
                                                    Semua Loket aktif dapat
                                                    dipilih untuk transaksi ini
                                                    dan tidak disimpan pada akun
                                                    Superadmin.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="bg-muted rounded-xl px-3 py-2.5 text-sm font-medium">
                                                    {formLoket?.name ??
                                                        'Loket tidak tersedia'}
                                                </div>
                                                <p className="text-muted-foreground text-xs">
                                                    Loket Pelayanan ditetapkan
                                                    dari akun Petugas dan tidak
                                                    dapat diubah dari form ini.
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label htmlFor="service_date">
                                            Tanggal pelayanan
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full justify-start text-left font-normal',
                                                        !serviceDate &&
                                                            'text-muted-foreground',
                                                        errors.service_date &&
                                                            'border-destructive text-destructive',
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 size-4" />
                                                    {serviceDate ? (
                                                        format(
                                                            serviceDate,
                                                            'PPP',
                                                            { locale: id },
                                                        )
                                                    ) : (
                                                        <span>
                                                            Pilih tanggal
                                                        </span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={serviceDate}
                                                    onSelect={setServiceDate}
                                                    disabled={(date) =>
                                                        date > new Date()
                                                    }
                                                    locale={id}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <input
                                            type="hidden"
                                            name="service_date"
                                            value={
                                                serviceDate
                                                    ? format(
                                                          serviceDate,
                                                          'yyyy-MM-dd',
                                                      )
                                                    : ''
                                            }
                                        />
                                        <InputError
                                            message={errors.service_date}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="numerator_start">
                                            Nomerator awal
                                        </Label>
                                        <Input
                                            id="numerator_start"
                                            name="numerator_start"
                                            value={numeratorStart}
                                            onChange={(event) =>
                                                setNumeratorStart(
                                                    numeratorDigits(
                                                        event.target.value,
                                                    ),
                                                )
                                            }
                                            className="font-mono tabular-nums"
                                            inputMode="numeric"
                                            maxLength={7}
                                            placeholder="0582608"
                                            aria-invalid={Boolean(
                                                errors.numerator_start,
                                            )}
                                        />
                                        <InputError
                                            message={errors.numerator_start}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="numerator_end">
                                            Nomerator akhir
                                        </Label>
                                        <Input
                                            id="numerator_end"
                                            name="numerator_end"
                                            value={numeratorEnd}
                                            onChange={(event) =>
                                                setNumeratorEnd(
                                                    numeratorDigits(
                                                        event.target.value,
                                                    ),
                                                )
                                            }
                                            className="font-mono tabular-nums"
                                            inputMode="numeric"
                                            maxLength={7}
                                            placeholder="0582620"
                                            aria-invalid={Boolean(
                                                errors.numerator_end,
                                            )}
                                        />
                                        <InputError
                                            message={errors.numerator_end}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="online_usage_count">
                                            SKPD Pembayaran Online
                                        </Label>
                                        <Input
                                            id="online_usage_count"
                                            name="online_usage_count"
                                            value={onlineUsageCount}
                                            onChange={(event) =>
                                                setOnlineUsageCount(
                                                    digitsOnly(
                                                        event.target.value,
                                                    ),
                                                )
                                            }
                                            inputMode="numeric"
                                            placeholder="0"
                                            aria-invalid={Boolean(
                                                errors.online_usage_count,
                                            )}
                                        />
                                        <InputError
                                            message={errors.online_usage_count}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="cancellation_count">
                                            SKPD Batal/Rusak
                                        </Label>
                                        <Input
                                            id="cancellation_count"
                                            name="cancellation_count"
                                            value={cancellationCount}
                                            onChange={(event) => {
                                                const raw = digitsOnly(
                                                    event.target.value,
                                                );
                                                setCancellationCount(
                                                    raw === '' ? '0' : raw,
                                                );
                                            }}
                                            inputMode="numeric"
                                            placeholder="0"
                                            aria-invalid={Boolean(
                                                errors.cancellation_count,
                                            )}
                                        />
                                        <InputError
                                            message={errors.cancellation_count}
                                        />
                                    </div>

                                    {parsedCount >= 1 && (
                                        <CancellationDetails
                                            items={cancellationItems}
                                            reasons={cancellationReasons}
                                            formId={formId}
                                            onChange={updateItem}
                                        />
                                    )}

                                    <div className="flex flex-wrap justify-end gap-3 pt-2 sm:col-span-2">
                                        <Button variant="outline" asChild>
                                            <Link href={index()}>Batal</Link>
                                        </Button>
                                        <Button
                                            disabled={
                                                processing ||
                                                (mode === 'create' &&
                                                    !formLoket)
                                            }
                                        >
                                            {mode === 'create'
                                                ? 'Simpan draft BAP'
                                                : 'Simpan perubahan draft'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </div>

            <div className="grid content-start gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Review pemakaian</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm">
                        <ReviewRow
                            label="Loket Pelayanan"
                            value={formLoket?.name ?? '—'}
                        />
                        <ReviewRow
                            label="Tanggal"
                            value={
                                serviceDate
                                    ? format(serviceDate, 'PPP', { locale: id })
                                    : 'Belum diisi'
                            }
                        />
                        <ReviewRow
                            label="Nomerator"
                            value={
                                totalUsage === null
                                    ? 'Masukkan range valid'
                                    : formatRange(
                                          Number(numeratorStart),
                                          Number(numeratorEnd),
                                      )
                            }
                            mono
                        />
                        <ReviewRow
                            label="Total"
                            value={
                                totalUsage === null
                                    ? '—'
                                    : `${formatQuantity(totalUsage)} set`
                            }
                        />
                        <ReviewRow
                            label="Online"
                            value={
                                onlineIsValid
                                    ? `${formatQuantity(onlineUsage)} set`
                                    : 'Tidak valid'
                            }
                        />
                        <ReviewRow
                            label="Batal/Rusak"
                            value={`${formatQuantity(parsedCount)} set`}
                        />
                        <ReviewRow
                            label="Pemakaian normal"
                            value={
                                normalUsage === null
                                    ? '—'
                                    : `${formatQuantity(normalUsage)} set`
                            }
                        />
                        <ReviewRow
                            label="Status"
                            value="Draft — belum diajukan"
                        />
                    </CardContent>
                </Card>

                {mode === 'create' ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Alokasi aktif Loket Pelayanan</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                            {allocations.length === 0 ? (
                                <p className="text-muted-foreground">
                                    Belum ada alokasi accepted yang dapat
                                    digunakan.
                                </p>
                            ) : (
                                allocations.map((allocation) => (
                                    <div
                                        key={allocation.id}
                                        className="border-border grid gap-1 rounded-xl border p-3"
                                    >
                                        <span className="font-mono text-xs font-medium">
                                            {formatRange(
                                                allocation.numerator_start,
                                                allocation.numerator_end,
                                            )}
                                        </span>
                                        <span className="text-muted-foreground text-xs">
                                            Sisa{' '}
                                            {formatQuantity(
                                                allocation.remaining_quantity,
                                            )}{' '}
                                            set
                                        </span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </div>
    );
}

function CancellationDetails({
    items,
    reasons,
    formId,
    onChange,
}: {
    items: CancellationItem[];
    reasons: CancellationReason[];
    formId: string;
    onChange: (
        index: number,
        field: keyof CancellationItem,
        value: string,
    ) => void;
}) {
    return (
        <section className="grid gap-4 border-t pt-2 sm:col-span-2">
            <div className="grid gap-1">
                <h2 className="font-medium">Detail SKPD Batal/Rusak</h2>
                <p className="text-muted-foreground text-sm">
                    Lengkapi nomerator dan alasan untuk setiap SKPD Batal/Rusak.
                </p>
            </div>

            {items.map((item, idx) => {
                const isCustom = item.reason === 'custom';

                return (
                    <div key={idx} className="grid gap-3">
                        {idx > 0 && <Separator />}
                        <p className="text-muted-foreground text-xs font-medium">
                            Batal/Rusak #{idx + 1}
                        </p>
                        <input
                            type="hidden"
                            name={`cancellations[${idx}][numerator]`}
                            form={formId}
                            value={item.numerator}
                        />
                        <input
                            type="hidden"
                            name={`cancellations[${idx}][reason]`}
                            form={formId}
                            value={item.reason}
                        />
                        <input
                            type="hidden"
                            name={`cancellations[${idx}][description]`}
                            form={formId}
                            value={item.description}
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor={`cancellations-${idx}-numerator`}
                                >
                                    Nomerator
                                </Label>
                                <Input
                                    id={`cancellations-${idx}-numerator`}
                                    value={item.numerator}
                                    onChange={(event) =>
                                        onChange(
                                            idx,
                                            'numerator',
                                            numeratorDigits(event.target.value),
                                        )
                                    }
                                    onBlur={() =>
                                        onChange(
                                            idx,
                                            'numerator',
                                            item.numerator === ''
                                                ? ''
                                                : item.numerator.padStart(
                                                      7,
                                                      '0',
                                                  ),
                                        )
                                    }
                                    className="font-mono tabular-nums"
                                    inputMode="numeric"
                                    maxLength={7}
                                    placeholder="0582612"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor={`cancellations-${idx}-reason`}>
                                    Alasan Batal/Rusak
                                </Label>
                                <Select
                                    value={item.reason}
                                    onValueChange={(value) =>
                                        onChange(idx, 'reason', value)
                                    }
                                >
                                    <SelectTrigger
                                        id={`cancellations-${idx}-reason`}
                                    >
                                        <SelectValue placeholder="Pilih alasan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {reasons.map((reason) => (
                                                <SelectItem
                                                    key={reason.value}
                                                    value={reason.value}
                                                >
                                                    {reason.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {isCustom && (
                            <div className="grid gap-2">
                                <Label
                                    htmlFor={`cancellations-${idx}-description`}
                                >
                                    Keterangan
                                </Label>
                                <Textarea
                                    id={`cancellations-${idx}-description`}
                                    value={item.description}
                                    onChange={(event) =>
                                        onChange(
                                            idx,
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={1000}
                                    placeholder="Jelaskan kondisi batal atau rusak secara singkat."
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </section>
    );
}

function ReviewRow({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span
                className={`text-right font-medium ${mono ? 'font-mono text-xs whitespace-nowrap' : ''}`}
            >
                {value}
            </span>
        </div>
    );
}
