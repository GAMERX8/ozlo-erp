export interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    status: string;
    last_used: string | null;
    expires_at: string | null;
    created_at: string;
    raw_key?: string; // Solo presente en la respuesta de creación
}
