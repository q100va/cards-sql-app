import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { TestBed } from '@angular/core/testing';

import { ReportsService } from './reports.service';
import { z } from 'zod';
import { COLUMNS, REPORT_FREQUENCY, REPORT_TYPE } from '../../../shared/constants/reports';
import { reportDTOSchema, ReportResponse, StatisticResponse } from '../../../shared/schemas/report.schema';
import { environment } from '../../environments/environment';
import { ValidationError } from '../utils/validate-response';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ...provideTranslateService(), MessageService],
    });
    service = TestBed.inject(ReportsService);
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('ReportsService HTTP contracts', () => {
  let service: ReportsService;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/reports`;
  type ReportRequest = z.infer<typeof reportDTOSchema>;

  const variants: {
    name: string;
    request: ReportRequest;
    response: ReportResponse;
    malformedRow: object;
  }[] = [
    {
      name: 'general monthly',
      request: {
        userId: null, type: REPORT_TYPE.GENERAL, frequency: REPORT_FREQUENCY.MONTHLY,
        months: [12, 1], quarters: null, years: [2026, 2025],
      },
      response: {
        type: REPORT_TYPE.GENERAL,
        report: [{
          key: '2026-12', periodData: { year: 2026, month: 12 },
          recipientsCount: 3, volunteersCount: 2, institutesCount: 0, schoolsCount: 0,
          seniorsCount: 3, homesCount: 1, regionsCount: 1,
          occasions: [{ occasionId: 20, occasionName: 'Birthday', recipientsCount: 3, seniorsCount: 3 }],
        }],
        cols: COLUMNS[REPORT_TYPE.GENERAL],
      },
      malformedRow: { occasions: {} },
    },
    {
      name: 'personal quarterly',
      request: {
        userId: 42, type: REPORT_TYPE.PERSONAL, frequency: REPORT_FREQUENCY.QUARTERLY,
        months: null, quarters: [4, 1], years: [2026],
      },
      response: {
        type: REPORT_TYPE.PERSONAL,
        report: [{
          key: '2026-4', periodData: { year: 2026, quarter: 4 },
          ordersCount: 2, seniorsCount: 3, recipientsCount: 3, volunteersCount: 2, institutesCount: 0,
        }],
        cols: COLUMNS[REPORT_TYPE.PERSONAL],
      },
      malformedRow: { periodData: { year: '2026', quarter: 4 } },
    },
    {
      name: 'school-coordination annual',
      request: {
        userId: 42, type: REPORT_TYPE.SCHOOL_COORDINATION, frequency: REPORT_FREQUENCY.ANNUAL,
        months: null, quarters: null, years: [2026],
      },
      response: {
        type: REPORT_TYPE.SCHOOL_COORDINATION,
        report: [{
          key: '2026', periodData: { year: 2026 }, ordersCount: 2, dobroruCount: 0,
          recipientsCount: 3, volunteersCount: 2, schoolsCount: 1, newSchoolsCount: 1,
        }],
        cols: COLUMNS[REPORT_TYPE.SCHOOL_COORDINATION],
      },
      malformedRow: { newSchoolsCount: null },
    },
    {
      name: 'by-occasion annual',
      request: {
        userId: null, type: REPORT_TYPE.BY_OCCASION, frequency: REPORT_FREQUENCY.ANNUAL,
        months: null, quarters: null, years: [2025, 2026],
      },
      response: {
        type: REPORT_TYPE.BY_OCCASION,
        report: [{
          key: 20, occasionName: 'Birthday', ordersCount: 2, seniorsCount: 3,
          homesCount: 1, regionsCount: 1, recipientsCount: 3, volunteersCount: 2,
          institutesCount: 0, schoolsCount: 0,
        }],
        cols: COLUMNS[REPORT_TYPE.BY_OCCASION],
      },
      malformedRow: { key: '20' },
    },
  ];

  const statistic: StatisticResponse = {
    report: [{
      key: 20, occasionName: 'Birthday', allRecipients: 7, partRecipients: 3,
      zeroAll: 1, onceAll: 2, twiceAll: 1, threeTimesAll: 1, fourTimesOrMoreAll: 2,
      zeroPart: 0, oncePart: 1, twicePart: 0, threeTimesPart: 1, fourTimesOrMorePart: 1,
    }],
    cols: COLUMNS[REPORT_TYPE.CURRENT_STATISTIC],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ...provideTranslateService(), MessageService],
    });
    service = TestBed.inject(ReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  for (const variant of variants) {
    it(`posts the ${variant.name} selections unchanged and validates its JSON response`, () => {
      const request = structuredClone(variant.request);
      const original = structuredClone(request);
      const next = jasmine.createSpy('next');
      service.getReport(
        request.userId, request.type, request.frequency, request.months, request.quarters, request.years,
      ).subscribe({ next, error: fail });

      const req = http.expectOne(`${baseUrl}/get-report/`);
      expect(req.request.method).toBe('POST');
      expect(req.request.params.keys()).toEqual([]);
      expect(req.request.responseType).toBe('json');
      expect(req.request.body).toEqual(original);
      expect(reportDTOSchema.safeParse(req.request.body).success).toBeTrue();
      req.flush({ data: variant.response, code: 'REPORT_READY' });

      expect(next).toHaveBeenCalledOnceWith({ data: variant.response, code: 'REPORT_READY' });
      expect(request).toEqual(original);
    });

    it(`rejects malformed ${variant.name} response data through schema validation`, () => {
      spyOn(console, 'error');
      const request = variant.request;
      const error = jasmine.createSpy('error');
      service.getReport(
        request.userId, request.type, request.frequency, request.months, request.quarters, request.years,
      ).subscribe({ next: () => fail('Malformed report must not be emitted'), error });

      http.expectOne(`${baseUrl}/get-report/`).flush({
        data: {
          ...variant.response,
          report: [{ ...variant.response.report[0], ...variant.malformedRow }],
        },
      });

      expect(error).toHaveBeenCalledOnceWith(jasmine.any(ValidationError));
      expect(error.calls.mostRecent().args[0].code).toBe('ERRORS.INVALID_SCHEMA');
    });
  }

  it('gets current statistics without a body or query parameters and validates its JSON response', () => {
    const next = jasmine.createSpy('next');
    service.getStatistic().subscribe({ next, error: fail });

    const req = http.expectOne(`${baseUrl}/get-statistic/`);
    expect(req.request.method).toBe('GET');
    expect(req.request.body).toBeNull();
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.responseType).toBe('json');
    req.flush({ data: statistic });

    expect(next).toHaveBeenCalledOnceWith({ data: statistic, code: undefined });
  });

  it('rejects a nonnumeric statistics count through schema validation', () => {
    spyOn(console, 'error');
    const error = jasmine.createSpy('error');
    service.getStatistic().subscribe({ next: () => fail('Malformed statistics must not be emitted'), error });
    http.expectOne(`${baseUrl}/get-statistic/`).flush({
      data: { ...statistic, report: [{ ...statistic.report[0], allRecipients: '7' }] },
    });

    expect(error).toHaveBeenCalledOnceWith(jasmine.any(ValidationError));
    expect(error.calls.mostRecent().args[0].code).toBe('ERRORS.INVALID_SCHEMA');
  });

  it('accepts an empty generated report without inventing rows', () => {
    const response: ReportResponse = { type: REPORT_TYPE.GENERAL, report: [], cols: COLUMNS[REPORT_TYPE.GENERAL] };
    const next = jasmine.createSpy('next');
    service.getReport(null, REPORT_TYPE.GENERAL, REPORT_FREQUENCY.ANNUAL, null, null, [2026])
      .subscribe({ next, error: fail });
    http.expectOne(`${baseUrl}/get-report/`).flush({ data: response });
    expect(next).toHaveBeenCalledOnceWith({ data: response, code: undefined });
  });

  it('accepts empty current statistics without inventing counts', () => {
    const response: StatisticResponse = { report: [], cols: statistic.cols };
    const next = jasmine.createSpy('next');
    service.getStatistic().subscribe({ next, error: fail });
    http.expectOne(`${baseUrl}/get-statistic/`).flush({ data: response });
    expect(next).toHaveBeenCalledOnceWith({ data: response, code: undefined });
  });

  it('propagates report-generation HTTP errors without emitting fallback data', () => {
    const error = jasmine.createSpy('error');
    const body = { code: 'ERRORS.REPORT_GENERATE_FAILED' };
    service.getReport(null, REPORT_TYPE.GENERAL, REPORT_FREQUENCY.ANNUAL, null, null, [2026])
      .subscribe({ next: () => fail('HTTP errors must not become successful reports'), error });
    http.expectOne(`${baseUrl}/get-report/`).flush(body, { status: 500, statusText: 'Server Error' });

    expect(error).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse));
    expect(error.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ status: 500, error: body }));
  });

  it('propagates statistics HTTP errors without emitting fallback data', () => {
    const error = jasmine.createSpy('error');
    const body = { code: 'ERRORS.FORBIDDEN' };
    service.getStatistic().subscribe({ next: () => fail('HTTP errors must not become successful statistics'), error });
    http.expectOne(`${baseUrl}/get-statistic/`).flush(body, { status: 403, statusText: 'Forbidden' });

    expect(error).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse));
    expect(error.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ status: 403, error: body }));
  });
});
