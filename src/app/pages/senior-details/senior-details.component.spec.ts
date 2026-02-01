import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeniorDetailsComponent } from './senior-details.component';

describe('SeniorDetailsComponent', () => {
  let component: SeniorDetailsComponent;
  let fixture: ComponentFixture<SeniorDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeniorDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
