// ESTRUCTURA DE DATOS QUE RECIBO DEL BACK

export interface ConversationPreview {
    id: string;
    name: string;
    phone: string;
    last_message: string;
    last_message_date: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    phone: string;
    message: string;
    timestamp: string;
    name: string;
}