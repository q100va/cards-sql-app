import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../testing/component-test-providers';

import { StatisticComponent } from './statistic.component';

describe('StatisticComponent', () => {
  let component: StatisticComponent;
  let fixture: ComponentFixture<StatisticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/api/reports/get-statistic/`).flush({
      data: { report: [], cols: [] },
    });
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
