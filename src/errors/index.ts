export class InsufficientStockError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InsufficientStockError";
        // This ensures the prototype is set correctly for instanceof checks
        Object.setPrototypeOf(this, InsufficientStockError.prototype);
    }
}
