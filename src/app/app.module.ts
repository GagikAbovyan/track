import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import {NgOpenCVModule} from './../../node_modules/ng-open-cv';
import {ObjectTrackComponent} from './object-track/object-track.component';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { OpenCVOptions } from 'projects/ng-open-cv/src/public_api';
import { FileUploadModule, FileUploader } from 'ng2-file-upload';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HttpClientModule } from '@angular/common/http'; 
import { HttpModule } from '@angular/http';
import { DataService } from './data.service';

const openCVConfig: OpenCVOptions = {
  scriptUrl: `assets/opencv/opencv.js`,
  wasmBinaryFile: 'wasm/opencv_js.wasm',
  usingWasm: true
};

@NgModule({
  declarations: [
    AppComponent,
    ObjectTrackComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgOpenCVModule.forRoot(openCVConfig),
    RouterModule,
    AppRoutingModule,
    HttpClientModule,
    FileUploadModule,
    HttpModule,
    HttpClientModule,
    NgbModule.forRoot(),
  ],
  providers: [DataService],
  bootstrap: [AppComponent]
})
export class AppModule { }
