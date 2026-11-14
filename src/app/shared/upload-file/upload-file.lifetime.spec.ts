import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Workbook } from 'exceljs';
import { UploadFileComponent } from './upload-file.component';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';

describe('UploadFileComponent read ownership', () => {
  let fixture: ComponentFixture<UploadFileComponent>;
  let component: UploadFileComponent;
  let input: HTMLInputElement;
  let handleError: jasmine.Spy<MessageWrapperService['handle']>;
  let result: jasmine.Spy<(rows: unknown[]) => void>;
  let spinner: jasmine.Spy<(loading: boolean) => void>;
  let workbookA: ArrayBuffer;
  let workbookB: ArrayBuffer;

  beforeAll(async () => {
    async function spreadsheet(name: string): Promise<ArrayBuffer> {
      const workbook = new Workbook();
      workbook.addWorksheet('Countries').addRows([['name'], [name]]);
      const buffer = await workbook.xlsx.writeBuffer();
      return new Uint8Array(buffer).buffer;
    }
    [workbookA, workbookB] = await Promise.all([spreadsheet('Country A'), spreadsheet('Country B')]);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadFileComponent], providers: provideComponentTesting(),
    }).compileComponents();
    handleError = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    fixture = TestBed.createComponent(UploadFileComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('typeOfData', 'country');
    fixture.detectChanges();
    input = component.hiddenfileinput.nativeElement;
    result = spyOn(component.result, 'emit').and.callThrough();
    spinner = spyOn(component.showSpinner, 'emit').and.callThrough();
  });

  function select(name: string) {
    let resolve!: (buffer: ArrayBuffer) => void;
    let reject!: (error: Error) => void;
    const pending = new Promise<ArrayBuffer>((accept, fail) => { resolve = accept; reject = fail; });
    const file = new File([], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    spyOn(file, 'arrayBuffer').and.returnValue(pending);
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    return { resolve, reject };
  }

  it('delivers parsed rows and ends loading for the current live selection', fakeAsync(() => {
    const current = select('current.xlsx');
    current.resolve(workbookB);
    flushMicrotasks();
    expect(result).toHaveBeenCalledOnceWith([{ name: 'Country B' }]);
    expect(spinner.calls.allArgs()).toEqual([[true], [false]]);
    expect(handleError).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  }));

  it('does not emit parsed rows or reset the detached input after destruction', fakeAsync(() => {
    const pending = select('abandoned.xlsx');
    const resetInput = spyOnProperty(input, 'value', 'set').and.callThrough();
    fixture.destroy();
    result.and.stub();
    spinner.and.stub();
    pending.resolve(workbookA);
    flushMicrotasks();
    expect(result).not.toHaveBeenCalled();
    expect(resetInput).not.toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
  }));

  it('does not notify a read error after the owner has been destroyed', fakeAsync(() => {
    const pending = select('abandoned.xlsx');
    fixture.destroy();
    spinner.and.stub();
    pending.reject(new Error('Read failed'));
    flushMicrotasks();
    expect(handleError).not.toHaveBeenCalled();
  }));

  it('keeps B rows authoritative when file A finishes after B', fakeAsync(() => {
    const first = select('a.xlsx');
    expect(input.disabled).toBeFalse();
    const uploadButton: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(uploadButton.disabled).toBeFalse();
    const current = select('b.xlsx');
    current.resolve(workbookB);
    flushMicrotasks();
    expect(result).toHaveBeenCalledOnceWith([{ name: 'Country B' }]);
    first.resolve(workbookA);
    flushMicrotasks();
    expect<unknown>(result.calls.allArgs()).toEqual([[[{ name: 'Country B' }]]]);
    expect(component.fileName).toBe('b.xlsx');
  }));

  it('does not end B loading or process A rows while file B is still pending', fakeAsync(() => {
    const first = select('a.xlsx');
    const current = select('b.xlsx');
    first.resolve(workbookA);
    flushMicrotasks();
    expect(spinner.calls.mostRecent().args[0]).toBeTrue();
    expect(result).not.toHaveBeenCalled();
    current.resolve(workbookB);
    flushMicrotasks();
    expect(spinner.calls.mostRecent().args[0]).toBeFalse();
  }));

  it('does not notify an obsolete A read failure after B has completed', fakeAsync(() => {
    const first = select('a.xlsx');
    const current = select('b.xlsx');
    current.resolve(workbookB);
    flushMicrotasks();
    first.reject(new Error('Old read failed'));
    flushMicrotasks();
    expect(handleError).not.toHaveBeenCalled();
    expect(result).toHaveBeenCalledOnceWith([{ name: 'Country B' }]);
  }));

  it('keeps repeated A selections distinct across A, B and A again', fakeAsync(() => {
    const firstA = select('a.xlsx');
    const requestB = select('b.xlsx');
    const currentA = select('a.xlsx');
    const resetInput = spyOnProperty(input, 'value', 'set').and.callThrough();
    currentA.resolve(workbookA);
    flushMicrotasks();
    requestB.resolve(workbookB);
    firstA.resolve(workbookA);
    flushMicrotasks();
    expect(result).toHaveBeenCalledOnceWith([{ name: 'Country A' }]);
    expect(spinner.calls.allArgs()).toEqual([[true], [true], [true], [false]]);
    expect(resetInput).toHaveBeenCalledOnceWith('');
    expect(component.fileName).toBe('a.xlsx');
    expect(handleError).not.toHaveBeenCalled();
  }));

  it('notifies a current arrayBuffer failure once and releases its loading and input', fakeAsync(() => {
    const current = select('current.xlsx');
    const resetInput = spyOnProperty(input, 'value', 'set').and.callThrough();
    current.reject(new Error('Read failed'));
    flushMicrotasks();
    expect(handleError).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ code: 'ERRORS.FILE.NOT_UPLOADED' }),
      { source: 'UploadFileComponent', stage: 'readXlsxFile', type: 'country' },
    );
    expect(result).not.toHaveBeenCalled();
    expect(spinner.calls.allArgs()).toEqual([[true], [false]]);
    expect(resetInput).toHaveBeenCalledOnceWith('');
  }));

  it('notifies a current malformed spreadsheet once through the existing error path', fakeAsync(() => {
    const current = select('invalid.xlsx');
    const resetInput = spyOnProperty(input, 'value', 'set').and.callThrough();
    current.resolve(new Uint8Array([0, 1, 2]).buffer);
    flushMicrotasks();
    expect(handleError).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ code: 'ERRORS.FILE.INVALID_FORMAT_XLSX' }),
      { source: 'UploadFileComponent', stage: 'readXlsxFile', type: 'country' },
    );
    expect(result).not.toHaveBeenCalled();
    expect(spinner.calls.allArgs()).toEqual([[true], [false]]);
    expect(resetInput).toHaveBeenCalledOnceWith('');
  }));
});
