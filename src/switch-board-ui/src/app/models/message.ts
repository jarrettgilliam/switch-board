import { MessageType } from '../enums/message-type';

export interface Message {
    text: string;
    type: MessageType;
}