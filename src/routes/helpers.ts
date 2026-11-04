export const isIsoDateValid = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
};
