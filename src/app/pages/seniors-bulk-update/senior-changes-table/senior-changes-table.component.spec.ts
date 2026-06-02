import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeniorChangesTableComponent } from './senior-changes-table.component';

describe('SeniorChangesTableComponent', () => {
  let component: SeniorChangesTableComponent;
  let fixture: ComponentFixture<SeniorChangesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorChangesTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeniorChangesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
