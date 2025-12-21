import {format} from 'date-fns';
import {customAlphabet} from 'nanoid';

/**
 * Generates a unique reference: DEC-FRI-12-a7B9
 * Possibilities: 62^4 = 14.7 Million per hour.
 */
export const generateStockReference = (): string => {
    const now = new Date();
    const month = format(now, 'MMM').toUpperCase(); // DEC
    const day = format(now, 'EEE').toUpperCase();   // MON (Current day)
    const hour = format(now, 'HH');                 // 10

    // Custom alphabet: 0-9, a-z, A-Z
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const nanoid = customAlphabet(alphabet, 4);
    const serial = nanoid();

    return `${month}-${day}-${hour}-${serial}`;
};