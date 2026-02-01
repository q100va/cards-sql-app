import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeniorsListComponent } from './seniors-list.component';

describe('SeniorsListComponent', () => {
  let component: SeniorsListComponent;
  let fixture: ComponentFixture<SeniorsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeniorsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
