import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { ToponymsListComponent } from './toponyms-list.component';
import { AddressService } from '../../../services/address.service';
import { FileService } from '../../../services/file.service';
import { MessageWrapperService } from '../../../services/message.service';
import { AuthService } from '../../../services/auth.service';
import { AuthServiceHarness } from '../../../utils/auth-harness';
import { ConfirmationService } from 'primeng/api';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import fileSaver from 'file-saver';
import { Toponym, ToponymProps } from '../../../interfaces/toponym';
import { AddressFilterComponent } from 'src/app/shared/address-filter/address-filter.component';

class EmptyLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  } // return empty dictionary
}

describe('ToponymsListComponent', () => {
  let fixture: ComponentFixture<ToponymsListComponent>;
  let component: ToponymsListComponent;
  let auth: AuthServiceHarness;

  // Spies
  let addressSpy: jasmine.SpyObj<AddressService>;
  let fileSpy: jasmine.SpyObj<FileService>;
  let msgSpy: jasmine.SpyObj<MessageWrapperService>;
  let confirmSpy: jasmine.SpyObj<ConfirmationService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    auth = new AuthServiceHarness();
    auth.setUser({ id: 999, userName: 'test' });
    auth.grantAllCommon();
    auth.setAuthReady(true);
    auth.setPermsReady(true);
    auth.getCurrentUserSnapshot(999);
    addressSpy = jasmine.createSpyObj('AddressService', [
      'getListOfToponyms',
      'getToponyms',
      'getToponym',
      'checkPossibilityToDeleteToponym',
      'deleteToponym',
    ]);
    addressSpy.getToponyms.and.returnValue(
      of({ data: { toponyms: [], length: 0 } })
    );

    fileSpy = jasmine.createSpyObj('FileService', ['downloadFile']);
    msgSpy = jasmine.createSpyObj('MessageWrapperService', ['handle']);
    confirmSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Default getToponyms: return empty set to avoid hanging streams
    addressSpy.getToponyms.and.returnValue(
      of({ data: { toponyms: [], length: 0 } })
    );

    await TestBed.configureTestingModule({
      imports: [
        ToponymsListComponent, // standalone component
        NoopAnimationsModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
      ],
      providers: [
        { provide: AddressService, useValue: addressSpy },
        { provide: FileService, useValue: fileSpy },
        { provide: MessageWrapperService, useValue: msgSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: auth },
      ],
      // Ignore heavy child templates (Material/PrimeNG) — we test logic, not DOM
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    TestBed.overrideTemplate(ToponymsListComponent, '<div></div>');
    await TestBed.compileComponents();

    spyOn(AddressFilterComponent.prototype as any, 'ngOnInit').and.stub();

    fixture = TestBed.createComponent(ToponymsListComponent);
    component = fixture.componentInstance;

    // Provide required inputs (signal inputs): type + toponymProps
    fixture.componentRef.setInput('type', 'region' as any);
    fixture.componentRef.setInput('toponymProps', {
      isShowCountry: true,
      isShowRegion: true,
      isShowDistrict: true,
      isShowLocality: false,
      filename: 'dump.csv',
      dialogProps: {
        title: 't',
        okButton: 'OK',
        cancelButton: 'Cancel',
        addressFilterParams: {
          source: 'toponymList',
          multiple: false,
          cols: '1',
          gutterSize: '8px',
          rowHeight: '76px',
        },
      },
      queryParams: {
        countryId: '1',
        regionId: '2',
        districtId: '',
        localityId: '',
        addressFilterString: 'Россия, Регион',
      },
    } as any);

    // Trigger ngOnInit and the data stream inside constructor
    fixture.detectChanges();
  });

  afterEach(() => {
    addressSpy.getToponyms.and.returnValue(
      of({ data: { toponyms: [], length: 0 } })
    );
    fixture.destroy();
  });

  // --------------------------------------------------------------------------
  // Initial load reacts to computed "query" and fills dataSource/length
  // --------------------------------------------------------------------------

  it('loads data via AddressService on initial query and sets dataSource + length', fakeAsync(() => {
    const payload = {
      data: {
        toponyms: [
          {
            id: 77,
            name: 'Видное',
            shortName: 'Вид.',
            defaultAddressParams: {
              countryId: 1,
              regionId: 2,
              districtId: 3,
              localityId: 77,
            } as any,
          } as any,
        ],
        length: 1,
      },
    };
    addressSpy.getToponyms.and.returnValue(of(payload));

    // Force reload tick to trigger recomputation
    component.forceReload();
    //tick(); // flush microtasks
    fixture.detectChanges();

    expect(addressSpy.getToponyms).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.length()).toBe(1);
    // Spinner should be false after finalize
    expect(component.showSpinner()).toBeFalse();
  }));

  // --------------------------------------------------------------------------
  // Sorting updates signals and resets paginator to first page
  // --------------------------------------------------------------------------
  it('onSortChange updates sortBy/sortDir and calls paginator.firstPage()', () => {
    // prepare paginator stub
    (component as any).paginator = {
      firstPage: jasmine.createSpy('firstPage'),
    };
    component.pageIndex.set(2); // non-zero to ensure firstPage fires

    component.onSortChange({ active: 'shortName', direction: 'desc' } as any);

    expect(component['sortBy']()).toBe('shortName');
    expect(component['sortDir']()).toBe('desc');
    expect((component as any).paginator.firstPage).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Pagination: page size change resets to first page; same size updates index
  // --------------------------------------------------------------------------
  it('onChangedPage: changing pageSize resets to first page; same pageSize updates index', () => {
    component.pageIndex.set(3);
    component['pageSize'] = 10;

    component.onChangedPage({ pageIndex: 1, pageSize: 25, length: 0 } as any);
    expect(component['pageSize']).toBe(25);
    expect(component.pageIndex()).toBe(0);

    component.onChangedPage({ pageIndex: 2, pageSize: 25, length: 0 } as any);
    expect(component.pageIndex()).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Search normalization and first page reset
  // --------------------------------------------------------------------------
  it('searchToponym normalizes text (trim, lower, ё→е) and resets to first page', () => {
    // stub paginator with a spy
    (component as any).paginator = {
      firstPage: jasmine.createSpy('firstPage'),
    };
    // make sure reset path is taken
    component.pageIndex.set(2);

    const inputEl = { value: '  ЁлкА  ' } as HTMLInputElement;
    component.searchToponym({ target: inputEl } as any);

    expect(component['searchValue']()).toBe('елка');
    expect((component as any).paginator.firstPage).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Clear search resets flags and goes to first page
  // --------------------------------------------------------------------------
  it('onClearSearchClick clears input/search/exact and resets to first page', () => {
    // stub paginator + ensure we are NOT on the first page
    (component as any).paginator = {
      firstPage: jasmine.createSpy('firstPage'),
    };
    component.pageIndex.set(2); // ← important

    component.inputValue = 'abc';
    component['searchValue'].set('abc');
    component['exactMatch'].set(true);

    component.onClearSearchClick();

    expect(component.inputValue).toBe('');
    expect(component['searchValue']()).toBe('');
    expect(component['exactMatch']()).toBeFalse();
    expect((component as any).paginator.firstPage).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Open toponym card → loads by id, opens dialog, afterClosed triggers resetTable
  // --------------------------------------------------------------------------
  it('onOpenToponymCardClick: opens dialog with loaded object and triggers resetTable on close', fakeAsync(() => {
    const obj: Toponym = {
      id: 77,
      name: 'Видное',
      shortName: 'Вид.',
      defaultAddressParams: {
        countryId: 1,
        regionId: 2,
        districtId: 3,
        localityId: 77,
      } as any,
    } as any;

    addressSpy.getToponym.and.returnValue(of({ data: obj }));
    // Dialog open → afterClosed emits a result with name → component.resetTable must be called
    const afterClosed$ = of({ name: 'ok' });
    dialogSpy.open.and.returnValue({ afterClosed: () => afterClosed$ } as any);

    spyOn(component as any, 'openToponymDialog').and.callThrough();
    spyOn(component, 'resetTable');

    component.onOpenToponymCardClick(77);
    tick();

    expect(addressSpy.getToponym).toHaveBeenCalledWith(77, 'region' as any);
    expect((component as any).openToponymDialog).toHaveBeenCalledWith(
      'view-edit',
      obj
    );
    expect(component.resetTable).toHaveBeenCalledWith(77);
  }));

  it('onOpenToponymCardClick: error path calls MessageWrapperService.handle', fakeAsync(() => {
    addressSpy.getToponym.and.returnValue(throwError(() => ({ status: 404 })));
    component.onOpenToponymCardClick(999);
    tick();
    expect(msgSpy.handle).toHaveBeenCalled();
  }));

  // --------------------------------------------------------------------------
  // Delete flow goes through confirmation → check → delete → resetTable
  // --------------------------------------------------------------------------
  it('onDeleteToponymClick: accept → check count 0 → delete → resetTable and correctSelectionList', fakeAsync(() => {
    // capture confirm config and invoke accept()
    confirmSpy.confirm.and.callFake((cfg: any) => cfg.accept());

    // service call chain
    addressSpy.checkPossibilityToDeleteToponym.and.returnValue(of({ data: 0 }));
    addressSpy.deleteToponym.and.returnValue(of({ data: null }));

    // stub child component used inside resetTable
    const correctSelectionList = jasmine.createSpy('correctSelectionList');
    (component as any).addressFilterComponent = { correctSelectionList };

    // ensure comparing id against empty addressFilter won't block forceReload
    component['addressFilter'].set({
      countries: [],
      regions: [],
      districts: [],
      localities: [],
    });

    spyOn(component, 'resetTable').and.callThrough();
    spyOn(component as any, 'forceReload').and.callThrough();

    component.onDeleteToponymClick(123, 'Сокр.', true);
    tick();

    expect(addressSpy.checkPossibilityToDeleteToponym).toHaveBeenCalledWith(
      'region' as any,
      123,
      true
    );
    expect(addressSpy.deleteToponym).toHaveBeenCalledWith(
      'region' as any,
      123,
      true
    );
    expect(correctSelectionList).toHaveBeenCalled();
    expect(component.resetTable).toHaveBeenCalledWith(123);
    expect((component as any).forceReload).toHaveBeenCalled();
  }));

  it('onDeleteToponymClick: non-zero deps → no delete, but resetTable still runs', fakeAsync(() => {
    // accept confirmation
    confirmSpy.confirm.and.callFake((cfg: any) => cfg.accept());

    // backend says there are dependencies → no deletion
    addressSpy.checkPossibilityToDeleteToponym.and.returnValue(of({ data: 2 }));

    // stub child used in resetTable
    const correctSelectionList = jasmine.createSpy('correctSelectionList');
    (component as any).addressFilterComponent = { correctSelectionList };
    // so that forceReload() path may or may not trigger
    component['addressFilter'].set({
      countries: [],
      regions: [],
      districts: [],
      localities: [],
    });
    spyOn(component, 'resetTable').and.callThrough();
    component.onDeleteToponymClick(1, 'X', false);
    tick();

    expect(addressSpy.deleteToponym).not.toHaveBeenCalled(); // ❌ no delete
    expect(component.resetTable).toHaveBeenCalledWith(1); // ✅ still resets table
    expect(correctSelectionList).toHaveBeenCalled(); // resetTable touched child
  }));

  // --------------------------------------------------------------------------
  // File download triggers FileService and file-saver.saveAs
  // --------------------------------------------------------------------------
  it('onFileDownloadClick: downloads blob and calls saveAs(name)', fakeAsync(() => {
    spyOn(fileSaver, 'saveAs').and.stub();

    // Ensure filename present in props and type is set
    const name = 'dump.csv';
    (component.toponymProps() as any).filename = name;

    const blob = new Blob(['csv'], { type: 'text/csv' });
    fileSpy.downloadFile.and.returnValue(of(blob));

    component.onFileDownloadClick();
    tick();

    expect(fileSpy.downloadFile).toHaveBeenCalledWith(name);
    expect(fileSaver.saveAs).toHaveBeenCalledWith(blob, name);
  }));

  // --------------------------------------------------------------------------
  // Navigate to external lists keeping address context
  // --------------------------------------------------------------------------
  it('onOpenListClick navigates with defaultAddressParams and addressFilterString', () => {
    const t: Toponym = {
      id: 5,
      name: 'Город',
      countryName: 'Страна',
      regionName: 'Регион',
      districtName: 'Район',
      defaultAddressParams: {
        countryId: 1,
        regionId: 2,
        districtId: 3,
        localityId: 5,
      } as any,
    } as any;

    component.onOpenListClick(t, '/users');
    expect(routerSpy.navigate).toHaveBeenCalled();

    const [commands, extras] = routerSpy.navigate.calls.mostRecent().args as [
      any[],
      any
    ];
    expect(commands).toEqual(['/users']);

    const qp = extras.queryParams as any;
    expect(qp).toEqual(
      jasmine.objectContaining({
        countryId: 1,
        regionId: 2,
        districtId: 3,
        localityId: 5,
      })
    );
    expect(qp.addressFilterString).toContain('Страна');
    expect(qp.addressFilterString).toContain('Регион');
    expect(qp.addressFilterString).toContain('Район');
    expect(qp.addressFilterString).toContain('Город');
  });
});
