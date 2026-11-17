import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../testing/component-test-providers';

import { StatisticComponent } from './statistic.component';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { FileService } from '../../services/file.service';
import { MessageWrapperService } from '../../services/message.service';
import { ValidationError } from '../../utils/validate-response';
import { reportingTranslations, statistics } from '../reports/reporting.spec-fixtures';

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

describe('StatisticComponent loading, rendering and export', () => {
  let fixture: ComponentFixture<StatisticComponent>;
  let component: StatisticComponent;
  let http: HttpTestingController;
  let handleError: jasmine.Spy<MessageWrapperService['handle']>;
  let exportFile: jasmine.Spy<FileService['export']>;
  const url = `${environment.apiUrl}/api/reports/get-statistic/`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticComponent], providers: provideComponentTesting(),
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', reportingTranslations);
    translate.use('en');
    handleError = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    exportFile = spyOn(TestBed.inject(FileService), 'export').and.returnValue(Promise.resolve());
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StatisticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows initial loading and renders the returned statistics before enabling export', () => {
    expect(component.showSpinner()).toBeTrue();
    http.expectOne(url).flush({ data: structuredClone(statistics) });
    fixture.detectChanges();
    expect(component.showSpinner()).toBeFalse();
    expect(component.generalStatistic).toEqual(statistics.report);
    expect(component.cols).toEqual(statistics.cols);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('p-table tbody')?.textContent).toContain('Birthdays 2026');
    expect(element.querySelector<HTMLButtonElement>('mat-card-content button')?.disabled).toBeFalse();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('settles an empty statistics response without inventing data or exporting stale values', async () => {
    http.expectOne(url).flush({ data: { report: [], cols: statistics.cols } });
    fixture.detectChanges();
    expect(component.showSpinner()).toBeFalse();
    expect(component.generalStatistic).toEqual([]);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('p-table')).toBeNull();
    await component.exportToExcel();
    expect(exportFile).not.toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('releases initial loading and delegates a failed statistics request once', () => {
    http.expectOne(url).flush({ code: 'ERRORS.REPORT_GENERATE_FAILED' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.showSpinner()).toBeFalse();
    expect(component.generalStatistic).toEqual([]);
    expect(handleError).toHaveBeenCalledOnceWith(
      jasmine.any(HttpErrorResponse), { source: 'StatisticComponent', stage: 'getStatistic' },
    );
  });

  it('releases loading and leaves no result when the service rejects invalid response data', () => {
    spyOn(console, 'error');
    http.expectOne(url).flush({ data: null });
    fixture.detectChanges();
    expect(component.showSpinner()).toBeFalse();
    expect(component.generalStatistic).toEqual([]);
    expect(handleError).toHaveBeenCalledOnceWith(
      jasmine.any(ValidationError), { source: 'StatisticComponent', stage: 'getStatistic' },
    );
  });

  it('exports translated statistics and column widths without mutating the source result', async () => {
    http.expectOne(url).flush({ data: structuredClone(statistics) });
    fixture.detectChanges();
    const source = structuredClone(component.generalStatistic);
    const columns = structuredClone(component.cols);
    await component.exportToExcel();
    expect(exportFile).toHaveBeenCalledTimes(1);
    const [data, exportColumns, options] = exportFile.calls.mostRecent().args;
    const exportedRows: unknown = data;
    expect(exportedRows).toEqual([{
      occasionName: 'Birthdays 2026', allRecipients: 12, partRecipients: 4,
      zeroAll: 4, zeroPart: 1, onceAll: 3, oncePart: 1, twiceAll: 2, twicePart: 1,
      threeTimesAll: 2, threeTimesPart: 1, fourTimesOrMoreAll: 1, fourTimesOrMorePart: 0,
    }]);
    expect(exportColumns.length).toBe(13);
    expect(exportColumns[0]).toEqual({ field: 'occasionName', header: 'Occasion', width: 30 });
    expect(exportColumns[1]).toEqual({ field: 'allRecipients', header: 'Total recipients', width: 18 });
    expect(exportColumns.slice(1).every(column => column.width === 18)).toBeTrue();
    expect(options).toEqual({ fileName: jasmine.stringMatching(/^statistic-\d{4}-\d{2}-\d{2}\.xlsx$/), sheetName: 'Statistic' });
    expect(component.generalStatistic).toEqual(source);
    expect(component.cols).toEqual(columns);
    expect(component.isExporting).toBeFalse();
  });

  it('cancels initial statistics loading when the component is destroyed', () => {
    const request = http.expectOne(url);
    fixture.destroy();
    expect(request.cancelled).toBeTrue();
    expect(component.showSpinner()).toBeFalse();
    expect(handleError).not.toHaveBeenCalled();
  });
});
