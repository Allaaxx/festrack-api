export function toCents(val: string | number | null | undefined): bigint {
    if (!val) return 0n;
    const str = String(val).trim();
    if (str === '' || str === '0') return 0n;
    const isNeg = str.startsWith('-');
    const clean = isNeg ? str.slice(1) : str;
    const [intPart = '0', fracPart = ''] = clean.split('.');
    const paddedFrac = (fracPart + '00').slice(0, 2);
    const cents = BigInt(intPart || '0') * 100n + BigInt(paddedFrac);
    return isNeg ? -cents : cents;
}

export function fromCents(cents: bigint): string {
    const isNeg = cents < 0n;
    const abs = isNeg ? -cents : cents;
    const intPart = (abs / 100n).toString();
    const fracPart = (abs % 100n).toString().padStart(2, '0');
    const trimmedFrac = fracPart.replace(/0+$/, '');
    const sign = isNeg ? '-' : '';
    return trimmedFrac
        ? `${sign}${intPart}.${trimmedFrac}`
        : `${sign}${intPart}`;
}
