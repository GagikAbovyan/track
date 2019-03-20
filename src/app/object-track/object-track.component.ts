import { Component, OnInit, ViewChild, ElementRef, HostListener, ɵConsole} from '@angular/core';
import { NgOpenCVService, OpenCVLoadResult } from 'ng-open-cv';
import { tap, switchMap, filter} from 'rxjs/operators';
import { forkJoin, Observable, BehaviorSubject, from } from 'rxjs';
import { FileUploader } from 'ng2-file-upload/ng2-file-upload';
import {Http, RequestOptions} from '@angular/http';
import {DataService} from '../data.service'
import { environment } from './../../environments/environment.prod';
import { del } from 'selenium-webdriver/http';

const URL:string = environment.API_URL + '/upload';
@Component({
  selector: 'app-object-track',
  templateUrl: './object-track.component.html',
  styleUrls: ['./object-track.component.css']
})
export class ObjectTrackComponent implements OnInit {


 
 
  /*
    mouse variables
  */ 
  private dragTL:boolean = false; 
  private dragBL:boolean = false; 
  private dragTR:boolean = false; 
  private dragBR:boolean = false; 
  private closeEnough:number = 7;
  public expression:Boolean = false;
  /*
    for classes
  */ 
  private canvas:any; 
  private prevButtonId:string;
  private isSelected:boolean = false;
  private isClearCanvas:boolean = false; 
  private className:string = "";
  public classes:any = [{name:"empty", color:this.getRandomColor(), number:0},{name:"part empty", color:"aqua", number:0}];
  public warning:string = "";
  /*
    rectangle parametrs
  */
  private ctx:any;
  private canvasx:number;
  private canvasy:number;
  private last_mousex:number;
  private last_mousey:number;
  private mousex:number;
  private mousey:number;
  private mousedown:Boolean;
  private element:any
  private selectedFiles: FileList;
  public fileName: string;
  private firstSelect:boolean = true;
  private prevClass:string
  private rectParams:any;
  private rects = [];
  private index:number = this.rects.length - 1;
  private prevIndex:number;
  /*
    uploader utils
  */
  public API:string = environment.API_URL;
  public uploader: FileUploader = new FileUploader({url: URL, itemAlias: 'file'});
  /*
    Notifies of the ready state of the classifiers load operation
  */
  private classifiersLoaded = new BehaviorSubject<boolean>(false);
  classifiersLoaded$ = this.classifiersLoaded.asObservable();
  /*
    for socket
  */
  connection:any;
  messages:any = []

  // HTML Element references
  // @ViewChild('img') img: ElementRef;
  @ViewChild('fileInput') fileInput: ElementRef;
  // @ViewChild('canvasInput') canvasInput: ElementRef;
  @ViewChild('canvasOutput') canvasOutput: ElementRef;
  @ViewChild('video') video: ElementRef;
  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if(event.key === "Delete" && this.isSelected) {
      this.rects.splice(this.rects.length - 1, this.rects.length);
      this.isClearCanvas = true;
      this.drawRectangles();
      this.ctx.drawImage(this.element, 0, 0, this.canvas.width, this.canvas.height);
    }
    if(event.key === "Delete" && !this.isSelected){
      if(this.index === this.rects.length - 1){
        this.rects.pop();
      }
      if(this.index === 0) {
        this.rects.shift();
      }
      this.rects.splice(this.index, this.index);
      this.index = this.prevIndex;
      
      if(this.prevIndex === undefined) this.index = this.rects.length - 1;
      this.index = this.rects.length - 1;
      this.isClearCanvas = true;
      this.drawRectangles();
      this.ctx.drawImage(this.element, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Inject the NgOpenCVService
  constructor(private ngOpenCVService: NgOpenCVService, private http:Http, private dataService: DataService) {}

  ngOnInit() {
    this.classes[0].color = this.getRandomColor();
    this.classes[1].color = this.getRandomColor();
    this.loadCV();
    this.sendFiles();
    // Always subscribe to the NgOpenCVService isReady$ observer before using a CV related function to ensure that the OpenCV has been
    // successfully loaded
    this.ngOpenCVService.isReady$
      .pipe(
        // The OpenCV library has been successfully loaded if result.ready === true
        filter((result: OpenCVLoadResult) => result.ready),
        switchMap(() => {
          // Load the face and eye classifiers files
          return this.loadClassifiers();
        })
      )
      .subscribe(() => {
        // The classifiers have been succesfully loaded
        this.classifiersLoaded.next(true);
      });
      this.connection = this.dataService.getMessages().subscribe(message => {
        this.messages.push(message);
      })
  }

  /*
    disconnect socket
  */
  ngOnDestroy(){
    this.connection.unsubscribe();
  }

  ngAfterViewInit() {
    this.canvas = document.getElementById('canvasOutput');
    this.ctx = this.canvas.getContext("2d");
    this.canvasx = this.canvas.offsetLeft;
    this.canvasy = this.canvas.offsetTop;
    this.last_mousex = 0;
    this.last_mousey = 0;
    this.mousex = 0;
    this.mousey = 0;
    this.mousedown = false;
  }

  afterLoading() {
    const video = document.getElementById("video")
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // this prints an image element with src I gave
    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
  }

  indexForR:number = -1;
  public exportData():void {
    if(this.indexForR != -1) {
      let rectsForR = []
      // console.log("rectsForR", this.indexForR)
      for (let index = this.indexForR; index < this.rects.length; index++) {
        const element = this.rects[index];
        rectsForR.push( {
                        x:element.x, y:element.y, 
                        width:element.width, height:element.height, 
                        realX:element.realX, realY:element.realY, 
                        color:element.color, name:element.name
                        } );
      }
      console.warn("rectsForR.length --------->", rectsForR);
      this.sendData(rectsForR)
      this.indexForR = this.rects.length;
      return;
    }
    this.sendData(this.rects);
    this.indexForR = this.rects.length;
  }

  private sendData(data:any):void {
    this.dataService.sendMessage(data);
    // let a
    this.dataService.getMessages().subscribe(message => {
      // a = message  
    });

    // // console.log("**********", a);  let b = JSON.parse(JSON.stringify(a))
    // console.log("==========", a)
  }

  public sendFiles():void {
    this.uploader.onAfterAddingFile = (file) => { file.withCredentials = false; };
    this.uploader.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
         let jsonRes:any;
         try {
            jsonRes = JSON.parse(response);
         }
         catch(err) {
            console.error('Error: to upload time', err);
         }
         this.API = environment.API_URL + '/' + jsonRes.fileName;
     }
  }

  public detectFiles(event:any):void {
      this.selectedFiles = event.target.files;
      this.fileName = this.selectedFiles[0].name;
      this.uploader.uploadAll();
      this.expression = true;
  }

  public mouseDown(event:MouseEvent):void {
    if(this.isSelected) {
      this.last_mousex = event.clientX - this.canvasx;
      this.last_mousey = event.clientY - this.canvasy;
      this.mousedown = true;
      this.classes.forEach(clazz => {
        if(clazz.name === this.rectParams.name) {
          clazz.number++;
        }
      });    
    }else {
      this.prevIndex = this.index;
      this.index = this.onSelectRec(event);
      if(this.index === undefined) this.index = this.prevIndex;
      if(this.prevIndex === undefined) this.index = this.rects.length - 1;
      const rect = this.rects[this.index]
      if(rect.width === undefined) {
        rect.x = this.mousey;
        rect.y = this.mousex;
        this.dragBR = true;
      }else if (this.checkCloseEnough(this.mousex, rect.x) && this.checkCloseEnough(this.mousey, rect.y)) {
        this.dragTL = true;
      }else if (this.checkCloseEnough(this.mousex, rect.x + rect.width) && this.checkCloseEnough(this.mousey, rect.y)) {
        this.dragTR = true;
      }else if (this.checkCloseEnough(this.mousex, rect.x) && this.checkCloseEnough(this.mousey, rect.y + rect.height)) {
        this.dragBL = true;
      }else if (this.checkCloseEnough(this.mousex, rect.x + rect.width) && this.checkCloseEnough(this.mousey, rect.y + rect.height)) {
        this.dragBR = true;
      }
      this.onMouseMove(event);
      this.ctx.clearRect(0, 0, this.canvas.style.width, this.canvas.style.height);
      this.drawRectangles();
      this.ctx.drawImage(document.getElementById('video'), 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public mouseUp(event:MouseEvent):void {
    if(!this.isSelected) {
      this.ctx.fillStyle = environment.RED;
      this.ctx.fillText("please select class", 10, 10); 
      this.dragTL = this.dragTR = this.dragBL = this.dragBR = false;
      this.drawRectangles();
      this.drawHandles();
    }else {
      let width = this.mousex - this.last_mousex;
      let height = this.mousey - this.last_mousey;
      this.rects.push({ x:this.last_mousex, y:this.last_mousey, 
                        width:width, height:height, 
                        realX:event.clientX, realY:event.clientY, 
                        color:this.rectParams.color, name:this.rectParams.name
                        });             
      if(this.mousex - this.last_mousex < 30 && this.mousey - this.last_mousey < 30 ||
         Math.abs(this.rects[this.rects.length - 1].width) / 30 > Math.abs(this.rects[this.rects.length - 1].height) ||
         Math.abs(this.rects[this.rects.length - 1].height) / 30 > Math.abs(this.rects[this.rects.length - 1].width)
         )
      {
        this.rects.pop();
        this.isClearCanvas = true;
        this.ctx.drawImage(document.getElementById('video'), 0, 0, this.canvas.width, this.canvas.height);
        if(this.indexForR === -1) this.drawRectangles();
      }                  
      this.mousedown = false;     
      console.log("draw image up")
      this.ctx.drawImage(document.getElementById('video'), 0, 0, this.canvas.width, this.canvas.height);
      console.log("draw rects up")
      if(this.indexForR === -1)this.drawRectangles();
      if(this.indexForR === -1)this.drawHandles();
      this.drawRectByIndex(this.indexForR);
    }
  }

  public onMouseMove(event:MouseEvent):void {
    console.log("this.indexForR -------------->", this.indexForR)
    this.mousex = event.clientX - this.canvasx;
    this.mousey = event.clientY - this.canvasy;
    if(this.mousedown && this.isSelected) {
      //this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); //clear canvas
      //this.drawRectangles();
      this.ctx.beginPath();
      let width = this.mousex - this.last_mousex;
      let height = this.mousey - this.last_mousey;
      this.ctx.rect(this.last_mousex, this.last_mousey, width, height);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // console.log("========", this.im)
      // cv.imshow('canvasOutput', this.im);
      this.ctx.drawImage(document.getElementById('video'), 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.strokeStyle = this.rectParams.color;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      this.ctx.fillStyle = this.rectParams.color;
      this.ctx.font = environment.FONT_SIZE;
      // this.readVideo();
      console.log("draw rects move")
      if(this.indexForR === -1) this.drawRectangles();
    }
    else if(!this.isSelected){
      const rect = this.rects[this.index];
      if (this.dragTL) {
        rect.width += rect.x - this.mousex;
        rect.height += rect.y - this.mousey;
        rect.x = this.mousex;
        rect.y = this.mousey;
      }else if(this.dragTR) {
        rect.width = Math.abs(rect.x - this.mousex);
        rect.height += rect.y - this.mousey;
        rect.y = this.mousey;
      }else if(this.dragBL) {
        rect.width += rect.x - this.mousex;
        rect.height = Math.abs(rect.y - this.mousey);
        rect.x = this.mousex;
      }else if (this.dragBR) {
        rect.width = Math.abs(rect.x - this.mousex);
        rect.height = Math.abs(rect.y - this.mousey);
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawRectangles(); 
      this.ctx.drawImage(document.getElementById('video'), 0, 0, this.canvas.width, this.canvas.height);
      this.drawRectangles();
    }
  }

  private onSelectRec(event:MouseEvent):number {
    let saveDilations:any = []
    for(let i:number = 0; i < this.rects.length; ++i) {
      let toLeft:number = this.rects[i].realX - this.rects[i].width; 
      let toTop:number = this.rects[i].realY - this.rects[i].height;
      if(event.clientX < this.rects[i].realX && event.clientY < this.rects[i].realY
         && event.clientX > toLeft && event.clientY > toTop) {
        saveDilations.push({mouseX:event.clientX, mouseY:event.clientY,
                            rect:this.rects[i], index:i});
        this.index = i;
        
      }
    }
    if(saveDilations.length === 1) { 
      return this.index;
    }
    for(let i:number = 1; i < saveDilations.length; ++i) {
      const prevRect = saveDilations[i - 1].rect;
      const rect = saveDilations[i].rect;
      if(rect.realX - saveDilations[i].mouseX < prevRect.realX - saveDilations[i].mouseX){
        return saveDilations[i].index;
      }else{
        return saveDilations[i-1].index;
      }
    }
  }
  
  private checkCloseEnough(p1:number, p2:number):boolean {
    return Math.abs(p1 - p2) < this.closeEnough;
  }

  private changeCoordinates(x:number, y:number, videoWidth:number, videoHeight:number, rectHeight:number, rectWidht:number):void{
    const x1 = x * (videoWidth/this.canvas.width);
    const y1 = y * (videoHeight/this.canvas.height);
    const height1 = rectHeight * (videoHeight / this.canvas.height);
    const weidht1 = rectWidht * (videoWidth / this.canvas.width);
  }

  private drawRectangles():void {
    // this.ctx.drawImage(this.element, 0,0,this.canvas.width,this.canvas.height);
    if(this.isClearCanvas === true) {this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);}
    this.isClearCanvas = false;
    for(let i:number = 0; i < this.rects.length; i++) {
      const rect = this.rects[i];
      this.ctx.beginPath();
      this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
      this.ctx.strokeStyle = rect.color;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      this.ctx.fillStyle = rect.color;
      this.ctx.font = environment.FONT_SIZE;
      this.ctx.fillText(rect.name, rect.x + 2, rect.y + 10);
      this.ctx.closePath();
      if(!this.isSelected) this.drawHandles();
    }
  }

  private drawRectByIndex(index:number):void {
    if(this.isClearCanvas === true) {this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);}
    this.isClearCanvas = false;
    for(let i:number = index; i < this.rects.length; i++) {
      const rect = this.rects[i];
      this.ctx.beginPath();
      this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
      this.ctx.strokeStyle = rect.color;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      this.ctx.fillStyle = rect.color;
      this.ctx.font = environment.FONT_SIZE;
      this.ctx.fillText(rect.name, rect.x + 2, rect.y + 10);
      this.ctx.closePath();
      if(!this.isSelected) this.drawHandles();
    }
  }

  private drawRect(rect:any, index:number):void {
    console.log("**************")
    if(this.isClearCanvas === true) {this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);}
      this.isClearCanvas = false;
      this.ctx.beginPath();
      this.ctx.rect(rect[0], rect[1], rect[2], rect[3]);
      this.ctx.strokeStyle = this.rects[index].color;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      this.ctx.fillStyle = this.rects[index].color;;
      this.ctx.font = environment.FONT_SIZE;
      this.ctx.fillText(this.rects[index].name, rect[0] + 2, rect[1] + 10);
      this.ctx.closePath();
  }

  private drawCircle(x:number, y:number, radius:number):void {
    this.ctx.fillStyle = environment.RED;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  private drawHandles():void {
    if(this.isSelected) this.index = this.rects.length - 1;
    let rect:any = this.rects[this.index];
    this.drawCircle(rect.x, rect.y, this.closeEnough);
    this.drawCircle(rect.x + rect.width, rect.y, this.closeEnough);
    this.drawCircle(rect.x + rect.width, rect.y + rect.height, this.closeEnough);
    this.drawCircle(rect.x, rect.y + rect.height, this.closeEnough);
  }

  private setClasses(event:any):void {
    if(this.isSelected) this.prevClass = this.rectParams.name;
    if(this.firstSelect) {
      this.prevClass = event.name;
      this.firstSelect = false;
    }
    this.rectParams = {name:event.name, color:event.color};
    if(this.prevButtonId) {
      const prevButton = document.getElementById(this.prevButtonId);
      prevButton.style.backgroundColor = environment.LIGHT_GRAY;
    }
    const selectedButton = document.getElementById(event.name);
    selectedButton.style.backgroundColor = environment.RED;
    this.prevButtonId = event.name;
    this.isSelected = true;
  }

  public unsetClass():void {
    this.isSelected = false;
    if(this.prevButtonId) {
      const prevButton = document.getElementById(this.prevButtonId);
      prevButton.style.backgroundColor = environment.LIGHT_GRAY;
    }
  }

  private getRandomColor():any {
    const letters = '0123456789ABCDEF'.split('');
    let color = '#';
    for (let i = 0; i < 6; i++){
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  public addClass():void {
    let isContains:Boolean = false;
    this.classes.forEach(clazz => {
      if(this.className === clazz.name || this.className.length == 0) {
        this.warning = "this class name already use please input other name";
        isContains = true;
        return;
      }
    });
    if(isContains === true) return;
    this.classes.push(
      {name: this.className, color:this.getRandomColor(), number:0}
    );
    // this.className = "";  
    this.warning = "";
  }

  private popClass(clazz:any):void {
    if(this.classes.length === 1) {
      this.classes.shift();
      this.isSelected = false; 
      return;
    }
    if(this.classes.indexOf(clazz) === 0) this.classes.shift();
    this.classes.splice(this.classes.indexOf(clazz), this.classes.indexOf(clazz));
    if(this.prevButtonId === clazz.name) {
      this.prevButtonId = "";
    }
    if(document.getElementById(clazz.name).style.backgroundColor &&  document.getElementById(clazz.name).style.backgroundColor === "red") {
      this.isSelected = false;
    }
  }

  public onSearchChange(searchValue:string):void {  
    this.className = searchValue;
  }

  public onKeydown(event):void {
    if (event.key === "Enter") {
      this.addClass();
    }
  }
  
  private sendImage():void {
    const canvas = <HTMLCanvasElement> document.getElementById('canvasOutput');
    const type:string = "image/png";
    let data:string = canvas.toDataURL(type);
    data = data.replace('data:' + type + ';base64,', ''); 
    let user = {data : 
                      {
                        url:data
                      }
                };
    let headers:any = new Headers({ 'Content-Type': 'application/json'});
    let options = new RequestOptions({ headers: headers});
    this.http.post(environment.API_URL + '/track', user, options)
      .subscribe((res) => {
        const bboxes = JSON.parse(JSON.stringify(res))
        var temp = bboxes._body.substr(bboxes._body.indexOf('['), bboxes._body.length - 1);
        var temp = temp.substr(0, temp.lastIndexOf(','))
        var rectsForDraw = JSON.parse("[" + temp + "]");
        rectsForDraw["0"].forEach(rect => {
          if(rect[0] > 0 && rect[1] > 0) {
            this.drawRect(rect, rectsForDraw["0"].indexOf(rect))
          }
        });
    });
  }

  public readVideo():void {
    const FPS = 30;
    const me = this;
    const video:any = document.getElementById("video");
    let streaming:boolean = true;
    let src:any;
    let cap:any;
    video.addEventListener('pause', stop);
    start();
    function start() {
      console.log("start video")
      streaming = true;
      const width = video.width;
      const height = video.height;
      src = new cv.Mat(height, width, cv.CV_8UC4);
      src.crossOrigin = "Anonymous";
      cap = new cv.VideoCapture(video);
      setTimeout(processVideo, 0);
    }
    function processVideo() {
      // console.log("proc video")
      if (!streaming) {
        src.delete();
        return;
      }
      src.crossOrigin = "Anonymous";
      const begin = Date.now();
      cap.read(src);
      cv.imshow('canvasOutput', src);
      const delay = 1000/FPS - (Date.now() - begin);
      setTimeout(processVideo, 100);
      // me.drawRectangles();
      cv.imshow('canvasOutput', src);
      this.im = src;
      // me.drawRectangles();
      me.sendImage();
    }
    function stop() {
      console.log("paused or ended")
      // cv.imshow('canvasOutput', src);
      streaming = false;
    }
  }

  private loadClassifiers(): Observable<any> {
    return forkJoin(
      this.ngOpenCVService.createFileFromUrl(
        'haarcascade_frontalface_default.xml',
        `assets/opencv/data/haarcascades/haarcascade_frontalface_default.xml`
      ),
      this.ngOpenCVService.createFileFromUrl(
        'haarcascade_eye.xml',
        `assets/opencv/data/haarcascades/haarcascade_eye.xml`
      )
    );
  }

  test(){
    console.error("())))))))))))))))))))))))))))")
  }

  private loadCV():void {
    console.log("loaded cv");
    this.ngOpenCVService.isReady$
      .pipe(
        filter((result: OpenCVLoadResult) => result.ready),
        switchMap(() => {
          return this.classifiersLoaded$;
        }),
        tap(() => {
        })
      ).subscribe(() => {
        console.log('opencv load ended');
      });
  }
}
