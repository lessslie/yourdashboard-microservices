// gateway es una clase especial que se usa para manejar comunicación en tiempo real con socket.io

import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // la direccion del frontend
  },
})
export class MessagesGateway {
  @WebSocketServer()
  server: Server;

  emitNewMessage(data: {
    from: string;
    message: string;
    timestamp: string;
    name: string;
  }) {
    this.server.emit('new_message', data);
  }
}

