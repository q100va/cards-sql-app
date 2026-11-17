import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { SeniorChangesTableComponent } from './senior-changes-table.component';

describe('SeniorChangesTableComponent', () => {
  let component: SeniorChangesTableComponent;
  let fixture: ComponentFixture<SeniorChangesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorChangesTableComponent],
      providers: provideTranslateService(),
    }).compileComponents();

    fixture = TestBed.createComponent(SeniorChangesTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('seniors', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
