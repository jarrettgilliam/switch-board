import { Injectable } from '@angular/core';
import { Message } from "../models/message";
import { MessageType } from '../enums/message-type';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  messages: Message[] = [];

  constructor() { }

  addMessage(messageText: string, messageType: MessageType, messageTimeout: number = 5000): void {
    const message: Message = {
      text: messageText,
      type: messageType
    };

    if (messageTimeout > 0) {
      setTimeout(() => {
        const index = this.messages.indexOf(message);
        if (index > -1) {
          this.messages.splice(index, 1);
        }
      }, messageTimeout);
    }

    this.messages.push(message);
  }
}
