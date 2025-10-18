import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component, signal, input } from '@angular/core';
import { DetailsDialogComponent } from './details-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import {
  DETAILS_COMPONENT_REGISTRY,
  PERMISSIONS_COMPONENT_REGISTRY,
} from './details-component-registry';
import { ConfirmationService } from 'primeng/api';
import { AddressService } from '../../../../services/address.service';
import { MessageWrapperService } from '../../../../services/message.service';
import { AuthService } from '../../../../services/auth.service';
import { AuthServiceHarness } from '../../../../utils/auth-harness';

// minimal translate
class EmptyLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  }
}

// fake child
@Component({
  selector: 'spec-child',
  standalone: true,
  template: '',
})
class FakeDetailsComponent {
  showSpinner = signal(false);
  changesSignal = signal(false);
  isEditModeSignal = signal(false);
  IsSaveDisabledSignal = signal(true);
  closeDialogDataSignal = signal<string | true | null>(null);

  data = input.required<any>();

  static last: FakeDetailsComponent;
  constructor() {
    FakeDetailsComponent.last = this;
  }

  onSaveClick(_params: string) {}
  onEditClick() {}
  onViewClick() {}
  onCancelClick() {}
}

describe('DetailsDialogComponent', () => {
  let fixture: ComponentFixture<DetailsDialogComponent<any>>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<any>>;
  let auth: AuthServiceHarness;

  const data = {
    operation: 'view-edit',
    creationTitle: 'CREATE',
    viewTitle: 'VIEW',
    componentType: 'spec', // our injected key
    toponymType: 'region',
    controlsDisable: true,
    controls: [
      {
        controlName: 'name',
        value: '',
        type: 'inputText',
        formType: 'formControl',
      },
    ],
    addressFilterParams: {
      isShowCountry: true,
      isShowRegion: false,
      isShowDistrict: false,
      isShowLocality: false,
    },
    defaultAddressParams: {
      countryId: 1,
      regionId: 2,
      districtId: null,
      localityId: null,
    },
    object: null,
  };

  beforeEach(async () => {
    auth = new AuthServiceHarness();
    auth.setUser({ id: 999, userName: 'test' });
    auth.grantAllCommon();
    auth.setAuthReady(true);
    auth.setPermsReady(true);
    auth.getCurrentUserSnapshot(999);
    // inject our fake into the registries
    (DETAILS_COMPONENT_REGISTRY as any)['spec'] = FakeDetailsComponent as any;
    (PERMISSIONS_COMPONENT_REGISTRY as any)['spec'] = {
      edit: {},
      createOrEdit: {},
    };

    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    // Spies for services (not heavily used here but nice to have)
    const confirmSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);
    const addressSpy = jasmine.createSpyObj('AddressService', [
      'checkToponymName',
      'saveToponym',
    ]);
    const msgSpy = jasmine.createSpyObj('MessageWrapperService', ['handle']);

    await TestBed.configureTestingModule({
      imports: [
        DetailsDialogComponent,
        FakeDetailsComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: AddressService, useValue: addressSpy },
        { provide: MessageWrapperService, useValue: msgSpy },
        { provide: AuthService, useValue: auth },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailsDialogComponent as any);
    fixture.detectChanges(); // creates child in ngAfterViewInit
  });

  afterEach(() => {
    delete (DETAILS_COMPONENT_REGISTRY as any)['spec'];
    delete (PERMISSIONS_COMPONENT_REGISTRY as any)['spec'];
  });

  it('closes dialog with string name when child requests saveAndExit', () => {
    FakeDetailsComponent.last.closeDialogDataSignal.set('Saved');
    fixture.detectChanges();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({ name: 'Saved' });
  });

  it('maps true → {name: null} when child requests plain close', () => {
    FakeDetailsComponent.last.closeDialogDataSignal.set(true);
    fixture.detectChanges();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({ name: null });
  });

  it('mirrors child state signals (smoke)', () => {
    FakeDetailsComponent.last.isEditModeSignal.set(true);
    FakeDetailsComponent.last.IsSaveDisabledSignal.set(false);
    FakeDetailsComponent.last.changesSignal.set(true);
    FakeDetailsComponent.last.showSpinner.set(true);
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    expect(cmp.isEditMode()).toBeTrue();
    expect(cmp.isSaveDisabled()).toBeFalse();
    expect(cmp.changes()).toBeTrue();
    expect(cmp.showSpinner()).toBeTrue();
  });

  it('toolbar methods proxy to child', () => {
    const child = FakeDetailsComponent.last;
    spyOn(child, 'onSaveClick');
    spyOn(child, 'onEditClick');
    spyOn(child, 'onViewClick');
    spyOn(child, 'onCancelClick');

    const cmp = fixture.componentInstance;
    cmp.onSaveClick('saveAndExit');
    cmp.onEditClick();
    cmp.onViewClick();
    cmp.onCancelClick();

    expect(child.onSaveClick).toHaveBeenCalledWith('saveAndExit');
    expect(child.onEditClick).toHaveBeenCalled();
    expect(child.onViewClick).toHaveBeenCalled();
    expect(child.onCancelClick).toHaveBeenCalled();
  });
});
