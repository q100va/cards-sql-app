import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Differences, SeniorRow } from '../../../../shared/schemas/senior.schema';
import { environment } from '../../../environments/environment';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { SeniorsBulkUpdateComponent } from './seniors-bulk-update.component';

describe('SeniorsBulkUpdateComponent comparison recovery', () => {
  let fixture: ComponentFixture<SeniorsBulkUpdateComponent>;
  let component: SeniorsBulkUpdateComponent;
  let http: HttpTestingController;
  let handle: jasmine.Spy<MessageWrapperService['handle']>;
  const url = `${environment.apiUrl}/api/seniors/compare-seniors-lists/`;
  const rows: SeniorRow[] = [{
    nursingHome: 'Prepared Home', firstName: 'Anna', lastName: null, patronymic: null,
    gender: 'female', dateOfConsent: null, dayBirthday: 12, monthBirthday: 5,
    yearBirthday: 1940, birthDate: '1940-05-12',
  }];
  const result: Differences = {
    homeId: 20,
    differences: {
      newSeniors: [{
        homeId: 20, firstName: 'Anna', lastName: null, patronymic: null, gender: 'female',
        birthDate: '1940-05-12', dateOfConsent: null, dateOfExit: null, comment: null,
        infoNote: null, photoLink: null, kindergarten: null, teacher: null, veteran: null,
        childOfWar: null, profession: null, honoraryStatus: null, interests: null, orthodoxBeliever: null,
      }],
      removedSeniors: [], updatedSeniors: [], possibleDuplicates: [], returnedSeniors: [],
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorsBulkUpdateComponent], providers: provideComponentTesting(),
    }).compileComponents();
    handle = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SeniorsBulkUpdateComponent);
    component = fixture.componentInstance;
    component.home = { homeName: 'Prepared Home', list: structuredClone(rows) };
    component.currentHomeName = component.home.homeName;
    component.showStart = true;
    component.chosenMonths.setValue([5, 6]);
    component.commentsMode.setValue(false);
    component.dateOfUpdate.setValue(new Date('2026-06-02T12:00:00Z'));
  });

  afterEach(() => http.verify());

  it('restores a retryable comparison step after failure and succeeds with the same prepared inputs', async () => {
    const failed = expectAsync(component.onStartClick()).toBeResolved();
    const first = http.expectOne(url);
    expect(first.request.method).toBe('POST');
    expect(first.request.body).toEqual({
      newList: rows, homeName: 'Prepared Home', commentsMode: false, chosenMonths: [5, 6],
    });
    expect(component.showStart).toBeFalse();
    expect(component.chosenMonths.disabled).toBeTrue();
    expect(component.showSpinner()).toBeTrue();
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    await failed;
    expect(component.showStart).toBeTrue();
    expect(component.chosenMonths.enabled).toBeTrue();
    expect(component.showSpinner()).toBeFalse();
    expect(component.home.list).toEqual(rows);
    expect(component.chosenMonths.value).toEqual([5, 6]);
    expect(component.dateOfUpdate.value).toEqual(new Date('2026-06-02T12:00:00Z'));
    expect(handle).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse), {
      source: 'SeniorsBulkUpdateComponent', stage: 'compareLists', homeName: 'Prepared Home',
    });

    const retry = component.onStartClick();
    const second = http.expectOne(url);
    expect(second.request.body).toEqual(first.request.body);
    second.flush({ data: result });
    await retry;
    expect(component.currentHomeId).toBe(20);
    expect(component.newSeniors).toEqual(result.differences.newSeniors);
    expect(component.removedSeniors).toEqual([]);
    expect(component.updatedSeniors).toEqual([]);
    expect(component.possibleDuplicates).toEqual([]);
    expect(component.returnedSeniors).toEqual([]);
    expect(component.noChanges).toBeFalse();
    expect(component.showStart).toBeFalse();
    expect(component.chosenMonths.disabled).toBeTrue();
    expect(component.showSpinner()).toBeFalse();
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('preserves a previously disabled month control when restoring the failed comparison step', async () => {
    component.chosenMonths.disable();
    const attempt = expectAsync(component.onStartClick()).toBeResolved();
    http.expectOne(url).flush({}, { status: 502, statusText: 'Bad Gateway' });
    await attempt;
    expect(component.showStart).toBeTrue();
    expect(component.chosenMonths.disabled).toBeTrue();
    expect(component.chosenMonths.value).toEqual([5, 6]);
    expect(component.showSpinner()).toBeFalse();
    expect(handle).toHaveBeenCalledTimes(1);
  });
});
