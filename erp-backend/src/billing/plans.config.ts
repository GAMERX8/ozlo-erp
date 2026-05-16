import { ConfigService } from '@nestjs/config';

// Paquetes de créditos predefinidos para mostrar en UI
export const CREDIT_PACKS = [
    { amount: 5 },
    { amount: 10 },
    { amount: 25 },
    { amount: 50 },
];

// Configuración de montos personalizados
export const CREDIT_CONFIG = {
    MIN_AMOUNT: 5,
    MAX_AMOUNT: 9999,
    MULTIPLE_OF: 5,
};

// Validar monto de créditos
export const validateCreditAmount = (amount: number): { valid: boolean; error?: string } => {
    if (amount < CREDIT_CONFIG.MIN_AMOUNT) {
        return { valid: false, error: `El monto mínimo es $${CREDIT_CONFIG.MIN_AMOUNT}` };
    }
    if (amount > CREDIT_CONFIG.MAX_AMOUNT) {
        return { valid: false, error: `El monto máximo es $${CREDIT_CONFIG.MAX_AMOUNT}` };
    }
    if (amount % CREDIT_CONFIG.MULTIPLE_OF !== 0) {
        return { valid: false, error: `El monto debe ser múltiplo de $${CREDIT_CONFIG.MULTIPLE_OF}` };
    }
    return { valid: true };
};
