import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../testing/component-test-providers';

import { SeniorsBulkUpdateComponent } from './seniors-bulk-update.component';

describe('SeniorsBulkUpdateComponent', () => {
  let component: SeniorsBulkUpdateComponent;
  let fixture: ComponentFixture<SeniorsBulkUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorsBulkUpdateComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(SeniorsBulkUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
