import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ReportsComponent } from './reports.component';
import { HttpErrorResponse } from '@angular/common/http';
import { TestRequest } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { Listbox } from 'primeng/listbox';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { FileService } from '../../services/file.service';
import { MessageWrapperService } from '../../services/message.service';
import { ValidationError } from '../../utils/validate-response';
import { AuthUser } from '../../../../shared/schemas/auth.schema';
import { COLUMNS, REPORT_TYPE } from '../../../../shared/constants/reports';
import { ReportResponse } from '../../../../shared/schemas/report.schema';
import { environment } from '../../../environments/environment';
import {
  generalReport,
  personalReport,
  annualPersonalReport,
  occasionReport,
  reportingTranslations,
} from './reporting.spec-fixtures';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('ReportsComponent form, results and export', () => {
  let fixture: ComponentFixture<ReportsComponent>;
  let component: ReportsComponent;
  let http: HttpTestingController;
  let handleError: jasmine.Spy<MessageWrapperService['handle']>;
  let exportFile: jasmine.Spy<FileService['export']>;
  const url = `${environment.apiUrl}/api/reports/get-report/`;
  const actor: AuthUser = {
    id: 42,
    userName: 'editor',
    firstName: 'Test',
    lastName: 'Editor',
    roleId: 1,
    roleName: 'Editor',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: [
        ...provideComponentTesting(),
        {
          provide: AuthService,
          useValue: { currentUser$: of(actor), has: () => true } satisfies Pick<
            AuthService,
            'currentUser$' | 'has'
          >,
        },
      ],
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', reportingTranslations);
    translate.use('en');
    handleError = spyOn(
      TestBed.inject(MessageWrapperService),
      'handle',
    ).and.stub();
    exportFile = spyOn(TestBed.inject(FileService), 'export').and.returnValue(
      Promise.resolve(),
    );
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function listbox(control: string): Listbox {
    return fixture.debugElement
      .query(By.css(`p-listbox[formControlName="${control}"]`))
      .injector.get(Listbox);
  }

  function choose(
    control: 'selectedType' | 'selectedFrequency',
    code: number | string,
  ) {
    if (control === 'selectedType') {
      const option = component.types().find((item) => item.code === code);
      if (!option) throw new Error(`Missing ${control} option ${code}`);
      component.formGroup.controls.selectedType.setValue(option);
      listbox(control).onChange.emit({
        originalEvent: new Event('change'),
        value: option,
      });
    } else {
      const option = component.frequencies.find((item) => item.code === code);
      if (!option) throw new Error(`Missing ${control} option ${code}`);
      component.formGroup.controls.selectedFrequency.setValue(option);
      listbox(control).onChange.emit({
        originalEvent: new Event('change'),
        value: option,
      });
    }
    fixture.detectChanges();
  }

  function chooseMany(
    control: 'selectedYears' | 'selectedMonths' | 'selectedQuarters',
    codes: number[],
  ) {
    const options =
      control === 'selectedYears'
        ? component.years
        : control === 'selectedMonths'
          ? component.months
          : component.quarters;
    component.formGroup.controls[control].setValue(
      codes.map((code) => {
        const option = options.find((item) => item.code === code);
        if (!option) throw new Error(`Missing ${control} option ${code}`);
        return option;
      }),
    );
    fixture.detectChanges();
  }

  function prepare(
    type: ReportResponse['type'] = REPORT_TYPE.PERSONAL,
    frequency = 'ANNUAL',
    year = 2026,
  ) {
    choose('selectedType', type);
    choose('selectedFrequency', frequency);
    chooseMany('selectedYears', [year]);
  }

  function generateButton(): HTMLButtonElement {
    return fixture.debugElement.query(By.css('mat-card-actions button'))
      .nativeElement;
  }

  function generate() {
    expect(generateButton().disabled).toBeFalse();
    generateButton().click();
    fixture.detectChanges();
    const request = http.expectOne(url);
    return request;
  }

  function finish(request: TestRequest, response: ReportResponse) {
    request.flush({ data: structuredClone(response) });
    fixture.detectChanges();
  }

  function load(response: ReportResponse) {
    prepare(
      response.type,
      response.type === REPORT_TYPE.BY_OCCASION ? 'ANNUAL' : 'MONTHLY',
    );
    if (response.type !== REPORT_TYPE.BY_OCCASION)
      chooseMany('selectedMonths', [1]);
    finish(generate(), response);
  }

  function secondGeneration(): TestRequest | null {
    chooseMany('selectedYears', [2025]);
    generateButton().click();
    fixture.detectChanges();
    const requests = http.match(url);
    expect(requests.length).toBeLessThanOrEqual(1);
    if (!requests.length) {
      expect(generateButton().disabled).toBeTrue();
      return null;
    }
    return requests[0];
  }

  it('requires type, frequency, years and the active period before enabling Generate', () => {
    expect(generateButton().disabled).toBeTrue();
    choose('selectedType', REPORT_TYPE.PERSONAL);
    choose('selectedFrequency', 'ANNUAL');
    expect(generateButton().disabled).toBeTrue();
    chooseMany('selectedYears', [2026]);
    expect(generateButton().disabled).toBeFalse();
    choose('selectedFrequency', 'MONTHLY');
    expect(generateButton().disabled).toBeTrue();
    chooseMany('selectedMonths', [1]);
    expect(generateButton().disabled).toBeFalse();
    choose('selectedFrequency', 'QUARTERLY');
    expect(generateButton().disabled).toBeTrue();
    chooseMany('selectedQuarters', [2]);
    expect(generateButton().disabled).toBeFalse();
    http.expectNone(url);
  });

  it('maps general monthly selections to the request without losing order or inactive nulls', () => {
    prepare(REPORT_TYPE.GENERAL, 'MONTHLY');
    chooseMany('selectedMonths', [2, 1]);
    chooseMany('selectedYears', [2025, 2026]);
    const request = generate();
    expect(request.request.body).toEqual({
      userId: null,
      type: 1,
      frequency: 'MONTHLY',
      months: [2, 1],
      quarters: null,
      years: [2025, 2026],
    });
    finish(request, { ...generalReport, report: [] });
  });

  it('clears monthly selections when switching to annual and sends both inactive periods as null', () => {
    prepare(REPORT_TYPE.PERSONAL, 'MONTHLY');
    chooseMany('selectedMonths', [1]);
    choose('selectedFrequency', 'ANNUAL');
    expect(component.formGroup.controls['selectedMonths'].value).toEqual([]);
    expect(component.formGroup.controls['selectedQuarters'].value).toEqual([]);
    const request = generate();
    expect(request.request.body).toEqual({
      userId: 42,
      type: 2,
      frequency: 'ANNUAL',
      months: null,
      quarters: null,
      years: [2026],
    });
    finish(request, { ...personalReport, report: [] });
  });

  it('requires a quarter after monthly to quarterly switching and removes the old month from the request', () => {
    prepare(REPORT_TYPE.PERSONAL, 'MONTHLY');
    chooseMany('selectedMonths', [1]);
    choose('selectedFrequency', 'QUARTERLY');
    expect(generateButton().disabled).toBeTrue();
    expect(component.formGroup.controls['selectedMonths'].value).toEqual([]);
    chooseMany('selectedQuarters', [2]);
    const request = generate();
    expect(request.request.body).toEqual({
      userId: 42,
      type: 2,
      frequency: 'QUARTERLY',
      months: null,
      quarters: [2],
      years: [2026],
    });
    finish(request, { ...personalReport, report: [] });
  });

  it('requires a month after quarterly to monthly switching and removes the old quarter from the request', () => {
    prepare(REPORT_TYPE.PERSONAL, 'QUARTERLY');
    chooseMany('selectedQuarters', [2]);
    choose('selectedFrequency', 'MONTHLY');
    expect(generateButton().disabled).toBeTrue();
    expect(component.formGroup.controls['selectedQuarters'].value).toEqual([]);
    chooseMany('selectedMonths', [2]);
    const request = generate();
    expect(request.request.body).toEqual({
      userId: 42,
      type: 2,
      frequency: 'MONTHLY',
      months: [2],
      quarters: null,
      years: [2026],
    });
    finish(request, { ...personalReport, report: [] });
  });

  it('preserves actor scope for school reports and clears incompatible periods when switching to occasions', () => {
    prepare(REPORT_TYPE.PERSONAL, 'MONTHLY');
    chooseMany('selectedMonths', [1]);
    choose('selectedType', REPORT_TYPE.SCHOOL_COORDINATION);
    const school = generate();
    expect(school.request.body).toEqual({
      userId: null,
      type: 3,
      frequency: 'MONTHLY',
      months: [1],
      quarters: null,
      years: [2026],
    });
    finish(school, {
      type: REPORT_TYPE.SCHOOL_COORDINATION,
      report: [],
      cols: COLUMNS[3],
    });
    choose('selectedType', REPORT_TYPE.BY_OCCASION);
    expect(component.formGroup.controls['selectedFrequency'].value).toBeNull();
    expect(component.formGroup.controls['selectedMonths'].value).toEqual([]);
    expect(component.formGroup.controls['selectedQuarters'].value).toEqual([]);
    expect(generateButton().disabled).toBeTrue();
    expect(listbox('selectedFrequency').optionDisabled).toBe(
      'disabledForOccasion',
    );
    expect(
      component.frequencies
        .filter((item) => item.disabledForOccasion)
        .map((item) => item.code),
    ).toEqual(['MONTHLY', 'QUARTERLY']);
    choose('selectedFrequency', 'ANNUAL');
    expect(
      fixture.debugElement.query(
        By.css('p-listbox[formControlName="selectedMonths"]'),
      ),
    ).toBeNull();
    expect(
      fixture.debugElement.query(
        By.css('p-listbox[formControlName="selectedQuarters"]'),
      ),
    ).toBeNull();
    const occasion = generate();
    expect(occasion.request.body).toEqual({
      userId: null,
      type: 4,
      frequency: 'ANNUAL',
      months: null,
      quarters: null,
      years: [2026],
    });
    finish(occasion, occasionReport);
    choose('selectedType', REPORT_TYPE.PERSONAL);
    choose('selectedFrequency', 'MONTHLY');
    expect(
      fixture.debugElement.query(
        By.css('p-listbox[formControlName="selectedMonths"]'),
      ),
    ).not.toBeNull();
  });

  it('releases loading on HTTP failure and supplies the numeric actor ID to error handling', () => {
    prepare();
    const request = generate();
    expect(component.showSpinner()).toBeTrue();
    request.flush(
      { code: 'ERRORS.REPORT_GENERATE_FAILED' },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();
    expect(component.showSpinner()).toBeFalse();
    expect(component.report).toEqual([]);
    expect(handleError).toHaveBeenCalledOnceWith(
      jasmine.any(HttpErrorResponse),
      jasmine.objectContaining({
        source: 'ReportsComponent',
        stage: 'getReport',
        data: {
          userId: 42,
          frequency: 'ANNUAL',
          months: null,
          quarters: null,
          years: [2026],
        },
      }),
    );
    finish(generate(), annualPersonalReport);
    expect(component.report).toEqual(annualPersonalReport.report);
  });

  it('releases loading and leaves no exportable result when response validation fails', () => {
    spyOn(console, 'error');
    prepare();
    const request = generate();
    request.flush({ data: null });
    fixture.detectChanges();
    expect(component.showSpinner()).toBeFalse();
    expect(component.report).toEqual([]);
    expect(component.reportName).toBe('');
    expect(handleError).toHaveBeenCalledOnceWith(
      jasmine.any(ValidationError),
      jasmine.objectContaining({ source: 'ReportsComponent' }),
    );
  });

  it('replaces an old result with the new empty result and prevents exporting stale rows', async () => {
    load(personalReport);
    expect(component.reportName).toBe('Personal report');
    const request = generate();
    expect(component.report).toEqual([]);
    expect(component.reportName).toBe('');
    finish(request, { ...personalReport, report: [] });
    expect(component.report).toEqual([]);
    expect(component.showSpinner()).toBeFalse();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('No data');
    expect(element.querySelector('p-table')).toBeNull();
    await component.exportToExcel();
    expect(exportFile).not.toHaveBeenCalled();
  });

  it('keeps a completed result tied to its response while the next request controls are edited', () => {
    load(personalReport);
    choose('selectedType', REPORT_TYPE.BY_OCCASION);
    choose('selectedFrequency', 'ANNUAL');
    chooseMany('selectedYears', [2025]);
    expect(component.report).toEqual(personalReport.report);
    expect(component.reportType).toBe(REPORT_TYPE.PERSONAL);
    expect(component.reportName).toBe('Personal report');
    http.expectNone(url);
  });

  it('does not let an older completion release loading for an accepted newer generation', () => {
    prepare();
    const first = generate();
    const second = secondGeneration();
    if (!second) {
      finish(first, annualPersonalReport);
      expect(component.showSpinner()).toBeFalse();
      return;
    }
    if (!first.cancelled) finish(first, annualPersonalReport);
    expect(component.showSpinner()).toBeTrue();
    finish(second, { ...personalReport, report: [] });
    expect(component.showSpinner()).toBeFalse();
  });

  it('keeps the latest accepted result when an older report response arrives afterwards', () => {
    prepare();
    const first = generate();
    const second = secondGeneration();
    if (!second) {
      finish(first, annualPersonalReport);
      expect(component.report).toEqual(annualPersonalReport.report);
      return;
    }
    finish(second, { ...personalReport, report: [] });
    if (!first.cancelled) finish(first, annualPersonalReport);
    expect(component.report).toEqual([]);
    expect(component.emptyMessage).toBe('REPORTS.TABLE.EMPTY_MESSAGE');
  });

  it('exports general period and occasion rows without mutating source data', async () => {
    load(generalReport);
    const source = structuredClone(component.report);
    const columns = structuredClone(component.cols);
    await component.exportToExcel();
    expect(exportFile).toHaveBeenCalledTimes(1);
    const [data, exportColumns, options] = exportFile.calls.mostRecent().args;
    const exportedRows: unknown = data;
    expect(exportedRows).toEqual([
      {
        key: '2026-1',
        periodData: 'January 2026',
        recipientsCount: 12,
        volunteersCount: 3,
        institutesCount: 1,
        schoolsCount: 1,
        seniorsCount: 4,
        homesCount: 2,
        regionsCount: 1,
        rowType: 'period',
      },
      {
        occasionId: 20,
        occasionName: 'OCCASION.BIRTHDAY.NAME 2026',
        recipientsCount: 12,
        seniorsCount: 4,
        rowType: 'occasion',
        periodData: 'Birthdays 2026',
      },
    ]);
    expect(exportColumns).toEqual([
      { field: 'periodData', header: 'Period' },
      ...COLUMNS[1].slice(1),
    ]);
    expect(options).toEqual({
      fileName: jasmine.stringMatching(
        /^General report-\d{4}-\d{2}-\d{2}\.xlsx$/,
      ),
      sheetName: 'Report',
    });
    expect(component.report).toEqual(source);
    expect(component.cols).toEqual(columns);
    expect(component.isExporting).toBeFalse();
  });

  it('exports a personal period row through the existing file boundary', async () => {
    load(personalReport);
    await component.exportToExcel();
    const data: unknown = exportFile.calls.mostRecent().args[0];
    expect(data).toEqual([
      {
        ...personalReport.report[0],
        periodData: 'January 2026',
        occasionName: null,
      },
    ]);
    expect(exportFile.calls.mostRecent().args[2]).toEqual({
      fileName: jasmine.stringMatching(
        /^Personal report-\d{4}-\d{2}-\d{2}\.xlsx$/,
      ),
      sheetName: 'Report',
    });
  });

  it('exports translated occasion rows without inventing period data', async () => {
    load(occasionReport);
    const source = structuredClone(component.report);
    await component.exportToExcel();
    const data: unknown = exportFile.calls.mostRecent().args[0];
    expect(data).toEqual([
      {
        ...occasionReport.report[0],
        periodData: null,
        occasionName: 'Birthdays 2026',
      },
    ]);
    expect(component.report).toEqual(source);
  });

  it('prevents duplicate exports and releases the export latch if the file writer rejects', async () => {
    load(personalReport);
    let rejectWrite: (reason: Error) => void = () => {
      throw new Error('Writer not started');
    };
    exportFile.and.returnValue(
      new Promise<void>((_, reject) => {
        rejectWrite = reject;
      }),
    );
    const pending = component.exportToExcel();
    expect(component.isExporting).toBeTrue();
    await component.exportToExcel();
    expect(exportFile).toHaveBeenCalledTimes(1);
    const error = new Error('Export unavailable');
    rejectWrite(error);
    await expectAsync(pending).toBeRejectedWith(error);
    expect(component.isExporting).toBeFalse();
  });

  it('cancels pending report generation when the component is destroyed', () => {
    prepare();
    const request = generate();
    fixture.destroy();
    expect(request.cancelled).toBeTrue();
    expect(component.showSpinner()).toBeFalse();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('spans every parent column in the expanded general-report detail row', () => {
    load(generalReport);
    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>(
      'p-table tbody tr td button',
    );
    if (!toggle) throw new Error('General-report expansion button missing');
    toggle.click();
    fixture.detectChanges();
    const detailTable = element.querySelector('p-table p-table');
    const detailCell = detailTable?.closest('td');
    if (!detailCell?.parentElement)
      throw new Error('Expanded detail row missing');
    const span = Array.from(detailCell.parentElement.children).reduce(
      (total, cell) => total + (cell as HTMLTableCellElement).colSpan,
      0,
    );
    expect(span).toBe(COLUMNS[REPORT_TYPE.GENERAL].length + 1);
  });

  it('gives every report selection listbox an accessible name', () => {
    const element: HTMLElement = fixture.nativeElement;
    const boxes = element.querySelectorAll<HTMLElement>('[role="listbox"]');
    expect(boxes.length).toBe(3);
    for (const box of boxes) {
      const references = (box.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .filter(Boolean);
      const name =
        box.getAttribute('aria-label') ||
        references
          .map((id) => element.querySelector(`[id="${id}"]`)?.textContent ?? '')
          .join(' ');
      expect(name.trim())
        .withContext('Report selection group needs an accessible name')
        .not.toBe('');
    }
  });

  it('updates option, preview and export labels after a runtime language change without changing selections', async () => {
    load(personalReport);
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('ru', {
      REPORTS: {
        TYPES: { PERSONAL: 'Личный отчёт' },
        FREQUENCIES: { MONTHLY: 'Ежемесячно' },
        MONTHS: { JANUARY: 'Январь' },
        TABLE: { PERIOD: 'Период' },
      },
    });
    translate.use('ru');
    fixture.detectChanges();

    expect(
      component.types().find((option) => option.code === REPORT_TYPE.PERSONAL)
        ?.name,
    ).toBe('Личный отчёт');
    expect(
      component.frequencies.find((option) => option.code === 'MONTHLY')?.name,
    ).toBe('Ежемесячно');
    expect(component.months.find((option) => option.code === 1)?.name).toBe(
      'Январь',
    );
    expect(component.formGroup.controls['selectedType'].value?.code).toBe(
      REPORT_TYPE.PERSONAL,
    );
    expect(component.formGroup.controls['selectedFrequency'].value?.code).toBe(
      'MONTHLY',
    );
    expect(
      component.formGroup.controls['selectedMonths'].value?.map(
        (option: ReportsComponent['months'][number]) => option.code,
      ),
    ).toEqual([1]);
    expect(component.report).toEqual(personalReport.report);
    expect(component.reportName).toBe('Личный отчёт');
    expect(listbox('selectedType').el.nativeElement.textContent).toContain(
      'Личный отчёт',
    );
    http.expectNone(url);

    await component.exportToExcel();
    const [data, columns, options] = exportFile.calls.mostRecent().args;
    const exportedRows: unknown = data;
    expect(exportedRows).toEqual([
      {
        ...personalReport.report[0],
        periodData: 'Январь 2026',
        occasionName: null,
      },
    ]);
    expect(columns[0]).toEqual({ field: 'periodData', header: 'Период' });
    expect(options?.fileName).toMatch(/^Личный отчёт-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it('keeps identical Generate actions distinct across A, B and A again', () => {
    prepare();
    const firstA = generate();
    chooseMany('selectedYears', [2025]);
    const requestB = generate();
    chooseMany('selectedYears', [2026]);
    const currentA = generate();
    expect(currentA.request.body).toEqual(firstA.request.body);
    finish(currentA, { ...annualPersonalReport, report: [] });
    if (!requestB.cancelled)
      finish(requestB, { ...annualPersonalReport, report: [] });
    if (!firstA.cancelled) finish(firstA, annualPersonalReport);
    expect(component.report).toEqual([]);
    expect(component.emptyMessage).toBe('REPORTS.TABLE.EMPTY_MESSAGE');
    expect(component.showSpinner()).toBeFalse();
  });

  it('releases the export latch without writing a general report row that lacks occasion data', async () => {
    load({ ...generalReport, report: personalReport.report });
    await expectAsync(component.exportToExcel()).toBeRejectedWithError();
    expect(component.isExporting).toBeFalse();
    expect(exportFile).not.toHaveBeenCalled();
  });
});

describe('ReportsComponent report permissions', () => {
  let fixture: ComponentFixture<ReportsComponent>;
  let component: ReportsComponent;
  let http: HttpTestingController;

  const actor: AuthUser = {
    id: 42,
    userName: 'editor',
    firstName: 'Test',
    lastName: 'Editor',
    roleId: 1,
    roleName: 'Editor',
  };

  const permissions = signal(new Map<string, { access: boolean }>());

  function setPermissions(...codes: string[]) {
    permissions.set(new Map(codes.map((code) => [code, { access: true }])));
    fixture.detectChanges();
  }

  function availableTypes() {
    return component.types().map((option) => option.code);
  }

  beforeEach(async () => {
    permissions.set(new Map());

    await TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: [
        ...provideComponentTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser$: of(actor),
            permissions$: permissions.asReadonly(),
            has: (code: string) => permissions().get(code)?.access === true,
          },
        },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', reportingTranslations);
    translate.use('en');

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows only Personal report without special permissions', () => {
    expect(availableTypes()).toEqual([REPORT_TYPE.PERSONAL]);
  });

  it('shows Personal and School Coordination with limited permission', () => {
    setPermissions('VIEW_LIMITED_REPORTS');

    expect(availableTypes()).toEqual([
      REPORT_TYPE.PERSONAL,
      REPORT_TYPE.SCHOOL_COORDINATION,
    ]);
  });

  it('shows all report types with full permission', () => {
    setPermissions('VIEW_FULL_REPORTS');

    expect(availableTypes()).toEqual([
      REPORT_TYPE.GENERAL,
      REPORT_TYPE.PERSONAL,
      REPORT_TYPE.SCHOOL_COORDINATION,
      REPORT_TYPE.BY_OCCASION,
    ]);
  });

  it('clears a selected General report and its preview when full permission is revoked', () => {
    setPermissions('VIEW_FULL_REPORTS');

    component.formGroup.controls.selectedType.setValue(
      component.types().find((option) => option.code === REPORT_TYPE.GENERAL)!,
    );
    component.formGroup.controls.selectedFrequency.setValue(
      component.frequencies.find((option) => option.code === 'MONTHLY')!,
    );
    component.formGroup.controls.selectedYears.setValue([
      component.years.find((option) => option.code === 2026)!,
    ]);
    component.formGroup.controls.selectedMonths.setValue([
      component.months.find((option) => option.code === 1)!,
    ]);

    fixture.detectChanges();
    component.onGenerateClick();

    const req = http.expectOne(`${environment.apiUrl}/api/reports/get-report/`);

    req.flush({ data: structuredClone(generalReport) });
    fixture.detectChanges();

    expect(component.report).toEqual(generalReport.report);
    expect(component.reportType).toBe(REPORT_TYPE.GENERAL);

    setPermissions('VIEW_LIMITED_REPORTS');

    expect(availableTypes()).toEqual([
      REPORT_TYPE.PERSONAL,
      REPORT_TYPE.SCHOOL_COORDINATION,
    ]);
    expect(component.formGroup.controls.selectedType.value).toBeNull();
    expect(component.report).toEqual([]);
    expect(component.cols).toEqual([]);
    expect(component.reportType).toBeNull();
    expect(component.showSpinner()).toBeFalse();
  });

  it('ignores an in-flight General report response after full permission is revoked', () => {
    setPermissions('VIEW_FULL_REPORTS');

    component.formGroup.controls.selectedType.setValue(
      component.types().find((option) => option.code === REPORT_TYPE.GENERAL)!,
    );
    component.formGroup.controls.selectedFrequency.setValue(
      component.frequencies.find((option) => option.code === 'MONTHLY')!,
    );
    component.formGroup.controls.selectedYears.setValue([
      component.years.find((option) => option.code === 2026)!,
    ]);
    component.formGroup.controls.selectedMonths.setValue([
      component.months.find((option) => option.code === 1)!,
    ]);

    fixture.detectChanges();
    component.onGenerateClick();

    const req = http.expectOne(`${environment.apiUrl}/api/reports/get-report/`);

    expect(component.showSpinner()).toBeTrue();

    setPermissions('VIEW_LIMITED_REPORTS');

    expect(component.formGroup.controls.selectedType.value).toBeNull();
    expect(component.showSpinner()).toBeFalse();

    req.flush({ data: structuredClone(generalReport) });
    fixture.detectChanges();

    expect(component.report).toEqual([]);
    expect(component.cols).toEqual([]);
    expect(component.reportType).toBeNull();
    expect(component.emptyMessage).toBe('');
    expect(component.showSpinner()).toBeFalse();
  });
});
