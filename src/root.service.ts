import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class RootService {

  constructor(private http: HttpClient) { 

  }

  getAPIData(){
    return this.http.get('http://localhost:3000/example');
  }
}
