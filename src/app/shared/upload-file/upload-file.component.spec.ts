// src/app/shared/upload-file/upload-file.component.spec.ts
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, ElementRef } from '@angular/core';
import { of, throwError } from 'rxjs';

import { UploadFileComponent } from './upload-file.component';
import { AddressService } from '../../services/address.service';
import { MessageWrapperService } from '../../services/message.service';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

class EmptyLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  } // always empty dict
}

// A tiny helper to grab emitted values from outputs
function spyOutput<T = any>(emitter: any) {
  const spy = jasmine.createSpy('output');
  emitter.subscribe(spy);
  return spy as jasmine.Spy<(v: T) => void>;
}

describe('UploadFileComponent', () => {
  let fixture: ComponentFixture<UploadFileComponent>;
  let component: UploadFileComponent;

  // Spies for services
  let addressSpy: jasmine.SpyObj<AddressService>;
  let msgSpy: jasmine.SpyObj<MessageWrapperService>;

  // DOM <input type="file"> stub (we’ll hang it into @ViewChild)
  let inputEl: HTMLInputElement;

  beforeEach(async () => {
    addressSpy = jasmine.createSpyObj('AddressService', [
      'createListOfToponyms',
    ]);
    msgSpy = jasmine.createSpyObj('MessageWrapperService', ['handle']);

    await TestBed.configureTestingModule({
      imports: [
        UploadFileComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
      ],
      providers: [
        { provide: AddressService, useValue: addressSpy },
        { provide: MessageWrapperService, useValue: msgSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadFileComponent);
    component = fixture.componentInstance;

    // Required input signal: typeOfData
    fixture.componentRef.setInput('typeOfData', 'region' as any);

    // Provide a real <input type="file"> for the ViewChild to access .value
    inputEl = document.createElement('input');
    inputEl.type = 'file';
    (component as any).hiddenfileinput = new ElementRef<HTMLInputElement>(
      inputEl
    );

    fixture.detectChanges();
  });

  // --------------------------------------------------------------------------
  // addFile: no file chosen → showSpinner true→false + MessageWrapper.handle(ERRORS.FILE.NOT_CHOSEN)
  // --------------------------------------------------------------------------
  it('addFile: emits spinner false and handles NOT_CHOSEN when no file selected', () => {
    const spinSpy = spyOutput<boolean>(component.showSpinner);

    const evt = { target: { files: null } } as any;
    component.addFile(evt);

    // was asked to show spinner, then explicitly turned off
    expect(spinSpy.calls.allArgs().flat()).toEqual([true, false]);

    // error sent to MessageWrapper
    expect(msgSpy.handle).toHaveBeenCalled();
    const errArg = msgSpy.handle.calls.mostRecent().args[0] as any;
    expect(errArg?.code).toBe('ERRORS.FILE.NOT_CHOSEN');
  });

  // --------------------------------------------------------------------------
  // addFile: wrong extension/mime → INVALID_FORMAT_XLSX
  // --------------------------------------------------------------------------
  it('addFile: rejects non-Excel files with ERRORS.FILE.INVALID_FORMAT_XLSX', () => {
    const spinSpy = spyOutput<boolean>(component.showSpinner);

    const badFile = new File(['abc'], 'notes.txt', { type: 'text/plain' });
    const evt = { target: { files: [badFile] } } as any;

    component.addFile(evt);

    // spinner toggled on then off
    expect(spinSpy.calls.allArgs().flat()).toEqual([true, false]);

    // validation error
    expect(msgSpy.handle).toHaveBeenCalled();
    const errArg = msgSpy.handle.calls.mostRecent().args[0] as any;
    expect(errArg?.code).toBe('ERRORS.FILE.INVALID_FORMAT_XLSX');
  });

  // --------------------------------------------------------------------------
  // saveData: success path → calls AddressService, finalizes spinner, emits resetRequested
  // --------------------------------------------------------------------------
  it('saveData: posts rows + type and emits resetRequested on success', fakeAsync(() => {
    // Arrange service happy path
    addressSpy.createListOfToponyms.and.returnValue(of({ data: 10 } as any));

    // Capture outputs
    const spinSpy = spyOutput<boolean>(component.showSpinner);
    const resetSpy = spyOutput<void>(component.resetRequested);

    // Simulate that spinner had been enabled earlier (addFile does this)
    component.showSpinner.emit(true);

    // Call private method directly to bypass read-excel-file
    (component as any).saveData([{ a: 1 }]);
    tick(); // flush subscription

    // Service called with rows and the current typeOfData ('region')
    expect(addressSpy.createListOfToponyms).toHaveBeenCalledWith(
      [{ a: 1 }],
      'region'
    );

    // resetRequested emitted once
    expect(resetSpy).toHaveBeenCalledTimes(1);

    // finalize() must emit spinner false
    expect(spinSpy.calls.allArgs().flat()).toContain(false);
  }));

  // --------------------------------------------------------------------------
  // saveData: error path → MessageWrapper.handle called
  // --------------------------------------------------------------------------
  it('saveData: forwards backend error to MessageWrapper.handle', fakeAsync(() => {
    addressSpy.createListOfToponyms.and.returnValue(
      throwError(() => ({ status: 422 }))
    );

    const spinSpy = spyOutput<boolean>(component.showSpinner);
    component.showSpinner.emit(true);

    (component as any).saveData([{ a: 1 }]);
    tick();

    expect(msgSpy.handle).toHaveBeenCalled();
    // finalize() still turns spinner off
    expect(spinSpy.calls.allArgs().flat()).toContain(false);
  }));

  // --------------------------------------------------------------------------
  // normalizeXlsxError: maps known XLSX parser messages → INVALID_FORMAT_XLSX,
  // otherwise → NOT_UPLOADED
  // --------------------------------------------------------------------------
  it('normalizeXlsxError: maps known parsing messages to INVALID_FORMAT_XLSX', () => {
    const err = (component as any).normalizeXlsxError(
      new Error('Unsupported format')
    );
    expect(err.code).toBe('ERRORS.FILE.INVALID_FORMAT_XLSX');
  });

  it('normalizeXlsxError: maps unknown errors to NOT_UPLOADED', () => {
    const err = (component as any).normalizeXlsxError(
      new Error('Random failure')
    );
    expect(err.code).toBe('ERRORS.FILE.NOT_UPLOADED');
  });

  // --------------------------------------------------------------------------
  // Utility: isExcelFile — sanity check
  // --------------------------------------------------------------------------
  it('isExcelFile: accepts .xlsx (by extension) and official mime types', () => {
    const okByExt = new File(['x'], 'data.xlsx', {
      type: 'application/octet-stream',
    });
    const okMime1 = new File(['x'], 'a.bin', {
      type: 'application/vnd.ms-excel',
    });
    const okMime2 = new File(['x'], 'b.bin', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const bad = new File(['x'], 'c.txt', { type: 'text/plain' });

    const call = (f: File) => (component as any).isExcelFile(f);

    expect(call(okByExt)).toBeTrue();
    expect(call(okMime1)).toBeTrue();
    expect(call(okMime2)).toBeTrue();
    expect(call(bad)).toBeFalse();
  });
});
