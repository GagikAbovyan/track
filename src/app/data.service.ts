import * as io from 'socket.io-client';
import { Observable } from 'rxjs';

export class DataService {
    private url = 'http://0.0.0.0:8000/';
    private socket:any;

    constructor() {
        this.socket = io(this.url);
    }

    public sendMessage(message:any):void {
        this.socket.emit('add-data', message);
    }

    // public getMessages():any {
    //   let observable = new Observable(observer => {
    //     this.socket = io(this.url);
    //     this.socket.on('message', (data) => {
    //       observer.next(data);    
    //     });
    //     return () => {
    //       this.socket.disconnect();
    //     };  
    //   })     
    //   return observable;
    // }

    public getMessages() {
      return Observable.create((observer) => {
          this.socket.on('add-data', (message) => {
              observer.next(message);
          });
      });
    }

}