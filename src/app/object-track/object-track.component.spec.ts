import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjectTrackComponent } from './object-track.component';

describe('ObjectTrackComponent', () => {
  let component: ObjectTrackComponent;
  let fixture: ComponentFixture<ObjectTrackComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObjectTrackComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObjectTrackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
