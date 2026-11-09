import { Form, Link, router } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import SkpdBapController from '@/actions/App/Http/Controllers/SkpdBapController';
import { DetailList, DetailRow } from '@/components/app/detail-list';
import { NomeratorInput } from '@/components/app/nomerator-input';
import {
    BapCancellationFields,
    type CancellationItem,
    type CancellationReason,
} from '@/components/bap/bap-cancellation-fields';
import { BapLoketSwitchDialog } from '@/components/bap/bap-loket-switch-dialog';
import FormErrorSummary from '@/components/form-error-summary';
import InputError from '@/components/input-error';
import {
    formatNomerator,
    formatQuantity,
    formatRange,
} from '@/components/inventory/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { create, index, show } from '@/routes/baps';

type Allocation = {
    id: number;
    numerator_start: number;
    numerator_end: number;
    remaining_quantity: number;
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
    /**
     * True when a later Loket BAP exists: the date and numerator range stay
     * fixed and only the online count and Batal/Rusak details can change.
     */
    rangeLocked?: boolean;
};

type Hint = { text: string; warning: boolean };

function digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
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

function formatServiceDate(value: string): string {
    return format(parseISO(value), 'd MMMM yyyy', { locale: id });
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
    rangeLocked = false,
}: Props) {
    const formLoket = bap?.loket ?? loket;
    const canPickLoket = mode === 'create' && lokets.length > 0;
    const initialServiceDate = bap?.service_date ?? defaultServiceDate ?? '';
    const [serviceDate, setServiceDate] = useState(initialServiceDate);
    const expectedStart =
        expectedNumeratorStart === null || expectedNumeratorStart === undefined
            ? ''
            : formatNomerator(expectedNumeratorStart);
    const [numeratorStart, setNumeratorStart] = useState(
        bap ? formatNomerator(bap.numerator_start) : expectedStart,
    );
    const [numeratorEnd, setNumeratorEnd] = useState(
        bap ? formatNomerator(bap.numerator_end) : '',
    );
    const [onlineUsageCount, setOnlineUsageCount] = useState(
        bap ? String(bap.online_usage_count) : '0',
    );
    const [cancellationCount, setCancellationCount] = useState(
        String(bap?.cancellation_count ?? 0),
    );
    const [cancellationItems, setCancellationItems] = useState<
        CancellationItem[]
    >(() =>
        (bap?.cancellations ?? []).map((cancellation) => ({
            numerator: formatNomerator(cancellation.numerator),
            reason: cancellation.reason,
            description: cancellation.description ?? '',
        })),
    );
    const [processing, setProcessing] = useState(false);
    const [pendingLoketId, setPendingLoketId] = useState<string | null>(null);

    // Create mode: follow backend expected start when Loket/expected start
    // changes, and drop the previous range so it is not carried over.
    const allocationKey = `${formLoket?.id ?? ''}:${expectedStart}`;
    const previousAllocationKey = useRef(allocationKey);

    useEffect(() => {
        if (
            mode !== 'create' ||
            previousAllocationKey.current === allocationKey
        ) {
            return;
        }

        previousAllocationKey.current = allocationKey;
        setNumeratorStart(expectedStart);
        setNumeratorEnd('');
        setCancellationItems((prev) => prev.map(emptyItem));
    }, [mode, allocationKey, expectedStart]);

    const totalUsage = quantityForRange(numeratorStart, numeratorEnd);
    const onlineUsage = onlineUsageCount === '' ? 0 : Number(onlineUsageCount);
    const requestedCount =
        cancellationCount === '' ? 0 : Number(cancellationCount);
    // Rows are capped to the total so a mistyped count cannot render hundreds
    // of rows; nothing is shown until the range is valid.
    const visibleCount =
        totalUsage === null ? 0 : Math.min(requestedCount, totalUsage);
    const visibleItems = Array.from(
        { length: visibleCount },
        (_, itemIndex) => cancellationItems[itemIndex] ?? emptyItem(),
    );
    // Online SKPD count as normal usage; only Batal/Rusak is excluded.
    const normalUsage =
        totalUsage !== null && requestedCount <= totalUsage
            ? totalUsage - requestedCount
            : null;
    const onlineExceedsTotal = totalUsage !== null && onlineUsage > totalUsage;
    const usageExceedsTotal =
        totalUsage !== null && onlineUsage + requestedCount > totalUsage;
    const hasEnteredData =
        serviceDate !== initialServiceDate ||
        numeratorStart !== expectedStart ||
        numeratorEnd !== '' ||
        onlineUsage > 0 ||
        requestedCount > 0;
    const pendingLoket =
        pendingLoketId === null
            ? null
            : (lokets.find(
                  (option) => option.id.toString() === pendingLoketId,
              ) ?? null);
    const formAction =
        mode === 'create'
            ? SkpdBapController.store()
            : SkpdBapController.update(bap?.id ?? 0);
    const formId = `bap-form-${mode}-${bap?.id ?? 'new'}`;
    const backHref = mode === 'edit' && bap ? show(bap.id) : index();
    const cancellationHint = cancellationCountHint(
        requestedCount,
        totalUsage,
        usageExceedsTotal,
    );

    function switchLoket(loketId: string): void {
        router.get(create.url({ query: { loket: loketId } }));
    }

    function requestLoketChange(loketId: string): void {
        if (loketId === formLoket?.id.toString()) {
            return;
        }

        if (hasEnteredData) {
            setPendingLoketId(loketId);

            return;
        }

        switchLoket(loketId);
    }

    function changeCancellationCount(value: string): void {
        let next = digitsOnly(value);

        if (totalUsage !== null && next !== '' && Number(next) > totalUsage) {
            next = String(totalUsage);
        }

        const nextCount = next === '' ? 0 : Number(next);

        setCancellationCount(next);
        setCancellationItems((prev) =>
            prev.length > nextCount ? prev.slice(0, nextCount) : prev,
        );
    }

    function updateItem(
        itemIndex: number,
        field: keyof CancellationItem,
        value: string,
    ): void {
        setCancellationItems((prev) => {
            const next = [...prev];

            while (next.length <= itemIndex) {
                next.push(emptyItem());
            }

            next[itemIndex] = { ...next[itemIndex], [field]: value };

            return next;
        });
    }

    return (
        <div className="grid max-w-5xl gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:grid-rows-[auto_1fr_auto]">
            <Card className="xl:col-start-1 xl:row-span-2 xl:row-start-1">
                <CardContent>
                    <Form
                        id={formId}
                        action={formAction}
                        onStart={() => setProcessing(true)}
                        onFinish={() => setProcessing(false)}
                        className="grid gap-4 sm:grid-cols-2 sm:gap-6"
                    >
                        {({ errors }) => (
                            <>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="loket_id">
                                        Loket Pelayanan
                                    </Label>
                                    {canPickLoket ? (
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
                                                onValueChange={
                                                    requestLoketChange
                                                }
                                            >
                                                <SelectTrigger
                                                    id="loket_id"
                                                    className="w-full"
                                                    aria-invalid={Boolean(
                                                        errors.loket_id,
                                                    )}
                                                    aria-describedby="loket_id-hint"
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
                                            <p
                                                id="loket_id-hint"
                                                className="text-muted-foreground text-xs"
                                            >
                                                Semua Loket aktif dapat dipilih
                                                dan pilihan tidak disimpan pada
                                                akun Superadmin. Mengganti Loket
                                                memuat ulang form sehingga isian
                                                yang sudah diketik dikosongkan.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Input
                                                id="loket_id"
                                                value={
                                                    formLoket?.name ??
                                                    'Loket tidak tersedia'
                                                }
                                                readOnly
                                                className="bg-muted font-medium"
                                                aria-describedby="loket_id-hint"
                                            />
                                            <p
                                                id="loket_id-hint"
                                                className="text-muted-foreground text-xs"
                                            >
                                                {mode === 'create'
                                                    ? 'Loket Pelayanan ditetapkan dari akun Petugas dan tidak dapat diubah dari form ini.'
                                                    : 'Loket Pelayanan draft tidak dapat diubah.'}
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="service_date">
                                        Tanggal pelayanan
                                    </Label>
                                    <DatePicker
                                        id="service_date"
                                        name="service_date"
                                        value={serviceDate}
                                        onChange={setServiceDate}
                                        placeholder="Pilih tanggal"
                                        disabled={rangeLocked}
                                        invalid={Boolean(errors.service_date)}
                                        disabledDays={{ after: new Date() }}
                                        clearable={false}
                                    />
                                    <InputError message={errors.service_date} />
                                    {rangeLocked ? (
                                        <p className="text-muted-foreground text-xs">
                                            Tanggal dan range Nomerator terkunci
                                            karena sudah ada BAP Loket
                                            berikutnya. Koreksi hanya untuk
                                            jumlah online dan Batal/Rusak.
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="numerator_start">
                                        Nomerator awal
                                    </Label>
                                    <NomeratorInput
                                        id="numerator_start"
                                        name="numerator_start"
                                        value={numeratorStart}
                                        onValueChange={setNumeratorStart}
                                        placeholder="0582608"
                                        readOnly={rangeLocked}
                                        aria-invalid={Boolean(
                                            errors.numerator_start,
                                        )}
                                        aria-describedby={
                                            mode === 'create' &&
                                            expectedStart !== ''
                                                ? 'numerator_start-hint'
                                                : undefined
                                        }
                                    />
                                    {mode === 'create' &&
                                    expectedStart !== '' ? (
                                        <p
                                            id="numerator_start-hint"
                                            className="text-muted-foreground text-xs"
                                        >
                                            Nomerator berikutnya untuk Loket
                                            ini:{' '}
                                            <span className="font-mono">
                                                {expectedStart}
                                            </span>
                                        </p>
                                    ) : null}
                                    <InputError
                                        message={errors.numerator_start}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="numerator_end">
                                        Nomerator akhir
                                    </Label>
                                    <NomeratorInput
                                        id="numerator_end"
                                        name="numerator_end"
                                        value={numeratorEnd}
                                        onValueChange={setNumeratorEnd}
                                        placeholder="0582620"
                                        readOnly={rangeLocked}
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
                                                digitsOnly(event.target.value),
                                            )
                                        }
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="0"
                                        className="tabular-nums"
                                        aria-invalid={Boolean(
                                            errors.online_usage_count,
                                        )}
                                        aria-describedby={
                                            onlineExceedsTotal
                                                ? 'online_usage_count-hint'
                                                : undefined
                                        }
                                    />
                                    {onlineExceedsTotal ? (
                                        <p
                                            id="online_usage_count-hint"
                                            className="text-warning text-xs"
                                        >
                                            {`Melebihi total pemakaian (${formatQuantity(totalUsage ?? 0)} set).`}
                                        </p>
                                    ) : null}
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
                                        onChange={(event) =>
                                            changeCancellationCount(
                                                event.target.value,
                                            )
                                        }
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="0"
                                        className="tabular-nums"
                                        aria-invalid={Boolean(
                                            errors.cancellation_count,
                                        )}
                                        aria-describedby="cancellation_count-hint"
                                    />
                                    <p
                                        id="cancellation_count-hint"
                                        className={cn(
                                            'text-xs',
                                            cancellationHint.warning
                                                ? 'text-warning'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {cancellationHint.text}
                                    </p>
                                    <InputError
                                        message={errors.cancellation_count}
                                    />
                                </div>

                                {visibleItems.length > 0 ? (
                                    <BapCancellationFields
                                        items={visibleItems}
                                        reasons={cancellationReasons}
                                        formId={formId}
                                        errors={errors}
                                        range={
                                            totalUsage === null
                                                ? null
                                                : {
                                                      start: Number(
                                                          numeratorStart,
                                                      ),
                                                      end: Number(numeratorEnd),
                                                  }
                                        }
                                        onChange={updateItem}
                                    />
                                ) : null}

                                <div className="empty:hidden sm:col-span-2">
                                    <FormErrorSummary
                                        errors={errors}
                                        fields={[
                                            ...(canPickLoket
                                                ? ['loket_id']
                                                : []),
                                            'service_date',
                                            'numerator_start',
                                            'numerator_end',
                                            'online_usage_count',
                                            'cancellation_count',
                                            'cancellations.*',
                                        ]}
                                        title="Draft BAP belum dapat disimpan."
                                    />
                                </div>
                            </>
                        )}
                    </Form>
                </CardContent>
            </Card>

            <Card className="xl:col-start-2 xl:row-start-1 xl:self-start">
                <CardHeader>
                    <CardTitle>Ringkasan pemakaian</CardTitle>
                </CardHeader>
                <CardContent>
                    <DetailList>
                        <DetailRow
                            label="Loket Pelayanan"
                            value={formLoket?.name ?? '—'}
                        />
                        <DetailRow
                            label="Tanggal pelayanan"
                            value={
                                serviceDate
                                    ? formatServiceDate(serviceDate)
                                    : 'Belum diisi'
                            }
                        />
                        <DetailRow
                            label="Nomerator"
                            value={
                                totalUsage === null
                                    ? 'Isi range yang valid'
                                    : formatRange(
                                          Number(numeratorStart),
                                          Number(numeratorEnd),
                                      )
                            }
                            mono={totalUsage !== null}
                        />
                        <DetailRow
                            label="Total pemakaian"
                            value={
                                totalUsage === null
                                    ? '—'
                                    : `${formatQuantity(totalUsage)} set`
                            }
                            numeric
                        />
                        <DetailRow
                            label="Online"
                            value={`${formatQuantity(onlineUsage)} set`}
                            numeric
                        />
                        <DetailRow
                            label="Batal/Rusak"
                            value={`${formatQuantity(requestedCount)} set`}
                            numeric
                        />
                        <DetailRow
                            label="Pemakaian normal (termasuk online)"
                            value={
                                normalUsage === null
                                    ? '—'
                                    : `${formatQuantity(normalUsage)} set`
                            }
                            numeric
                        />
                        <DetailRow
                            label="Status"
                            value="Draft, belum diajukan"
                        />
                    </DetailList>
                    {usageExceedsTotal ? (
                        <p className="text-warning mt-3 text-xs">
                            Online dan Batal/Rusak melebihi total pemakaian.
                        </p>
                    ) : null}
                </CardContent>
            </Card>

            <div className="flex flex-wrap justify-end gap-3 xl:col-start-1 xl:row-start-3">
                <Button variant="outline" asChild>
                    <Link href={backHref}>Kembali</Link>
                </Button>
                <Button
                    type="submit"
                    form={formId}
                    disabled={processing || (mode === 'create' && !formLoket)}
                >
                    {processing
                        ? 'Menyimpan...'
                        : mode === 'create'
                          ? 'Simpan draft BAP'
                          : 'Simpan perubahan draft'}
                </Button>
            </div>

            {mode === 'create' ? (
                <Card className="xl:col-start-2 xl:row-start-2 xl:self-start">
                    <CardHeader>
                        <CardTitle>Alokasi tersedia untuk Loket</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        {allocations.length === 0 ? (
                            <p className="text-muted-foreground">
                                Belum ada alokasi yang sudah diterima Loket dan
                                masih memiliki sisa Nomerator.
                            </p>
                        ) : (
                            <ul className="grid gap-3">
                                {allocations.map((allocation) => (
                                    <li
                                        key={allocation.id}
                                        className="grid gap-1 rounded-xl border p-3"
                                    >
                                        <span className="font-mono text-xs font-medium">
                                            {formatRange(
                                                allocation.numerator_start,
                                                allocation.numerator_end,
                                            )}
                                        </span>
                                        <span className="text-muted-foreground text-xs tabular-nums">
                                            Sisa{' '}
                                            {formatQuantity(
                                                allocation.remaining_quantity,
                                            )}{' '}
                                            set
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            ) : null}

            {canPickLoket ? (
                <BapLoketSwitchDialog
                    loketName={pendingLoket?.name ?? null}
                    onCancel={() => setPendingLoketId(null)}
                    onConfirm={() => {
                        if (pendingLoketId !== null) {
                            switchLoket(pendingLoketId);
                        }

                        setPendingLoketId(null);
                    }}
                />
            ) : null}
        </div>
    );
}

/**
 * Helper text under the Batal/Rusak count: the allowed maximum, why detail rows
 * are not shown yet, or a warning when the count no longer fits the range.
 */
function cancellationCountHint(
    requestedCount: number,
    totalUsage: number | null,
    usageExceedsTotal: boolean,
): Hint {
    if (totalUsage === null) {
        return {
            text:
                requestedCount > 0
                    ? 'Detail Batal/Rusak muncul setelah range Nomerator valid.'
                    : 'Paling banyak sama dengan total pemakaian.',
            warning: false,
        };
    }

    if (requestedCount > totalUsage) {
        return {
            text: `Melebihi total pemakaian. Kurangi menjadi paling banyak ${formatQuantity(totalUsage)}.`,
            warning: true,
        };
    }

    if (usageExceedsTotal) {
        return {
            text: `Online dan Batal/Rusak bersama-sama paling banyak ${formatQuantity(totalUsage)} set.`,
            warning: true,
        };
    }

    return {
        text: `Paling banyak ${formatQuantity(totalUsage)} set, sesuai total pemakaian.`,
        warning: false,
    };
}
