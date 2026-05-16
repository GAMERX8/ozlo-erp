/**
 * Logger condicional que solo muestra logs en desarrollo
 * Los errores siempre se muestran en consola
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
    /**
     * Log informativo - solo en desarrollo
     */
    log: (...args: unknown[]) => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * Log de depuración - solo en desarrollo
     */
    debug: (...args: unknown[]) => {
        if (isDev) {
            console.debug(...args);
        }
    },

    /**
     * Log de información - solo en desarrollo
     */
    info: (...args: unknown[]) => {
        if (isDev) {
            console.info(...args);
        }
    },

    /**
     * Log de advertencia - visible en todos los entornos
     * pero con formato diferente en producción
     */
    warn: (...args: unknown[]) => {
        console.warn(...args);
    },

    /**
     * Log de error - SIEMPRE visible (todos los entornos)
     */
    error: (...args: unknown[]) => {
        console.error(...args);
    },
};

/**
 * Helper para logs de páginas/components con prefijo
 */
export function createLogger(context: string) {
    return {
        log: (message: string, ...args: unknown[]) => {
            logger.log(`[${context}] ${message}`, ...args);
        },
        debug: (message: string, ...args: unknown[]) => {
            logger.debug(`[${context}] ${message}`, ...args);
        },
        info: (message: string, ...args: unknown[]) => {
            logger.info(`[${context}] ${message}`, ...args);
        },
        warn: (message: string, ...args: unknown[]) => {
            logger.warn(`[${context}] ${message}`, ...args);
        },
        error: (message: string, ...args: unknown[]) => {
            logger.error(`[${context}] ${message}`, ...args);
        },
    };
}
