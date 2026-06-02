import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeniorsBulkUpdateComponent } from './seniors-bulk-update.component';

describe('SeniorsBulkUpdateComponent', () => {
  let component: SeniorsBulkUpdateComponent;
  let fixture: ComponentFixture<SeniorsBulkUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorsBulkUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeniorsBulkUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
