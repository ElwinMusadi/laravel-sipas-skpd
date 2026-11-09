import AlertError from '@/components/alert-error';

/**
 * Shows server errors that are not rendered next to a specific input, such as
 * business-rule rejections keyed `bap`, `status`, or `allocation`.
 *
 * Keys listed in `fields` (and their nested `field.*` keys) are skipped because
 * the form already renders them inline. An entry ending in `.*`, such as
 * `checklist.*`, skips only the nested keys and still shows `checklist` itself.
 */
export default function FormErrorSummary({
    errors,
    fields = [],
    title = 'Permintaan tidak dapat diproses.',
}: {
    errors: Partial<Record<string, string>>;
    fields?: string[];
    title?: string;
}) {
    const messages = Object.entries(errors)
        .filter(
            ([key, message]) =>
                Boolean(message) &&
                !fields.some((field) =>
                    field.endsWith('.*')
                        ? key.startsWith(field.slice(0, -1))
                        : key === field || key.startsWith(`${field}.`),
                ),
        )
        .map(([, message]) => message as string);

    if (messages.length === 0) {
        return null;
    }

    return <AlertError errors={messages} title={title} />;
}
