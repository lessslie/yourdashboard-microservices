export type Canal = 'whatsapp';
export type Categoria = 'verde' | 'amarillo' | 'rojo';

export function clasificarTiempo(
    canal: Canal,
    fechaRecepcion: Date,
    ahora: Date,
): Categoria {
    const diffMs = ahora.getTime() - fechaRecepcion.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);

    if (diffHoras <= 1) return 'verde';
    if (diffHoras < 3) return 'amarillo';
    return 'rojo';
}

