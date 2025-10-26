/**
 * Normalize buttons input for UIAlert.
 * Accepts undefined, array of strings, or array of objects and returns
 * an array of objects: { label, value, type }
 */
export default function normalizeButtons (buttons) {
    // If nothing provided, return default OK primary button
    if (!buttons || (Array.isArray(buttons) && buttons.length === 0)) {
        return [{ label: i18n('ok'), value: true, type: 'primary' }];
    }

    // If caller passed a non-array, try to coerce to array
    if (!Array.isArray(buttons)) {
        buttons = [buttons];
    }

    const normalized = buttons.map((b) => {
        if (typeof b === 'string') {
            return { label: b, value: b, type: 'default' };
        }
        if (typeof b === 'object' && b !== null) {
            const label = b.label ?? (b.value !== undefined ? String(b.value) : '');
            const value = b.value !== undefined ? b.value : b.label;
            const type = b.type ?? 'default';
            return { label, value, type };
        }
        // fallback for unexpected types
        return { label: String(b), value: b, type: 'default' };
    }).filter(x => x && x.label !== undefined);

    // ensure at least one primary button
    if (!normalized.some(b => b.type === 'primary')) {
        normalized[0].type = normalized[0].type || 'primary';
    }

    // final safety: if nothing returned, fallback to OK primary
    if (!normalized || normalized.length === 0) {
        return [{ label: i18n('ok'), value: true, type: 'primary' }];
    }

    return normalized;
}
