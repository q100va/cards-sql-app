import { Component, inject } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { OutdatedItemMenuComponent } from '../../shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component';
import { AdvancedDetailsComponent } from '../../shared/dialogs/details-dialogs/advanced-details/advanced-details.component';
import { AutocompleteRowComponent } from '../../shared/dialogs/autocomplete-row/autocomplete-row.component';

import { ContactUrlPipe } from '../../utils/contact-url.pipe';

import {
  OutdatedOfficialName,
  OutdatedCoordination,
  HomeCoordination,
  CoordinationPick,
} from '../../interfaces/advanced-model';

import { HomeService, HomeMainService } from '../../services/home.service';
import {
  PartnerService,
  PartnerMainService,
} from '../../services/partner.service';
import { combineLatest, shareReplay } from 'rxjs';
import { zodValidator } from '../../utils/zod-validator';
import { coordinationNameControlSchema } from '../../../../shared/schemas/common.schema';
import { DefaultAddressParams } from '../../../../shared/schemas/toponym.schema';
import { causeOfRestrictionControlSchema } from '../../../../shared/schemas/user.schema';

@Component({
  selector: 'app-home-details',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatGridListModule,
    MatInputModule,
    MatTabsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    AddressFilterComponent,
    OutdatedItemMenuComponent,
    TranslateModule,
    ContactUrlPipe,
    MatAutocompleteModule,
    AutocompleteRowComponent,
    MatDatepickerModule
  ],
  templateUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.html',
  styleUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.css',
})
export class HomeDetailsComponent extends AdvancedDetailsComponent<'home'> {
  override homeService = inject(HomeService) as HomeMainService;
  override partnerService = inject(PartnerService) as PartnerMainService;
  override ngOnInit(): void {
    super.ngOnInit();
    this.coordinationPickList$ = this.partnerService
      .getPartnersPickList()
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    this.mainProps = [
      'homeName',
      'officialName',
      'noAddress',
      'specialHome',
      'acceptableForSchool',
      'comment',
      'infoNote',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
      'isClose',
      'dateOfClose',
      /*   'postalAddressPart',
      'postalName',
      'postalCode', */
    ];
    this.hasOutdatedOfficialNames.set(
      this.outdatedDataDraft.officialNames.length > 0
    );
    this.hasOutdatedCoordinations.set(
      this.outdatedDataDraft.coordinations.length > 0
    );
    this.hasPostalAddress.set(true);
    this.hasStatus.set(true);
    this.homeOrPartner.set('home');
    this.showRestrictedToggle = !this.existingOwner?.isClose;
    this.setHomeOpen();
  }

  override setInitialValues(mode: 'view' | 'edit' | 'create'): void {
    super.setInitialValues(mode);

    //coordinations
    const formArray = this.coordinationsArray;
    const values = this.object!.coordinations;
    let diff = values.length - formArray.length;
    while (diff > 0) {
      formArray.push(
        new FormControl<CoordinationPick | null>(
          { value: null, disabled: true },
          {
            nonNullable: true,
            validators: [zodValidator(coordinationNameControlSchema)],
          }
        )
      );
      diff--;
    }
    while (diff < 0 && formArray.length > 1) {
      formArray.removeAt(formArray.length - 1);
      diff++;
    }
    if (values.length) {
      values.forEach((v, i) => {
        formArray.at(i).patchValue({
          id: v.partnerId,
          name: v.partnerName!,
        });
      });
    }

    //postal address
    this.mainForm.controls['postalAddressPart'].setValue(
      this.existingOwner?.address.postalAddressPart
    );
    this.mainForm.controls['postalName'].setValue(
      this.existingOwner?.address.postalName
    );
    this.mainForm.controls['postalCode'].setValue(
      this.existingOwner?.address.postalCode
    );
  }

  override setEmptyOutdatedDataDraft() {
    this.outdatedDataDraft = {
      addresses: [],
      officialNames: [],
      coordinations: [],
      contacts: {},
    };
  }

  override setRestoringDataDraft() {
    this.restoringDataDraft = {
      addresses: null,
      officialNames: null,
      coordinations: null,
      contacts: null,
    };
  }
  override setDeletingDataDraft() {
    this.deletingDataDraft = {
      addresses: null,
      officialNames: null,
      coordinations: null,
      contacts: null,
    };
  }
  override setChangingData() {
    this.changingData = {
      main: null,
      contacts: null,
      address: null,
      coordinations: null,
    };
  }
  override setOutdatingData() {
    this.outdatingData = {
      address: null,
      officialName: null,
      coordinations: null,
      contacts: null,
    };
  }

  override setHomeOpen(){
     this.homeOpen.set(!this.existingOwner?.isClose);
  }

  // View-mode: disable institutes controls
  protected override changeToViewMode(
    addressParams: DefaultAddressParams | null
  ) {
    super.changeToViewMode(addressParams);
    this.updateCoordinationsControlsValidity(false);
  }

  // Edit-mode: enable institutes controls
  override onEditClick() {
    super.onEditClick();
    this.updateCoordinationsControlsValidity(true);
  }

  protected updateCoordinationsControlsValidity(enable: boolean) {
    const fa = this.mainForm.get('coordinations') as FormArray<
      FormControl<CoordinationPick | null>
    > | null;
    if (fa) {
      fa.controls.forEach((control) =>
        enable
          ? control.enable({ emitEvent: false })
          : control.disable({ emitEvent: false })
      );
    }
    this.checkIsSaveDisabled();
  }

  protected override additionalValidationHooks(): boolean {
    return (
      this.contactsChangeValidation() ||
      this.addressChangeValidation() ||
      this.coordinationsChangeValidation()
    );
  }

  override homeAddressChangeValidation() {
    return (
      this.mainForm.controls['postalAddressPart'].value !==
        this.existingOwner!.address.postalAddressPart ||
      this.mainForm.controls['postalName'].value !==
        this.existingOwner!.address.postalName ||
      this.mainForm.controls['postalCode'].value !==
        this.existingOwner!.address.postalCode
    );
  }

  /*    protected override onChangeValidation() {
    super.onChangeValidation();
   } */

  private coordinationsChangeValidation(): boolean {
    const original = this.existingOwner!['coordinations'].map(
      (c: HomeCoordination) => c.partnerId
    ).sort();
    const current = this.mainForm
      .get('coordinations')!
      .getRawValue()
      .map((c: CoordinationPick) => c.id)
      .sort();

    // lengths differ -> changed
    if (original.length !== current.length) return true;

    // content differs -> changed
    /*      console.log(
          'JSON.stringify((original)) === JSON.stringify((current))',
          JSON.stringify((original)),JSON.stringify((current)),
          JSON.stringify((original)) === JSON.stringify((current))
        ); */

    return !(JSON.stringify(original) === JSON.stringify(current));
  }

  override onRestoreOutdatedOfficialName(data: OutdatedOfficialName) {
    if ((this.restoringDataDraft['officialNames'] ?? []).length > 0) {
      const restoredValue = this.existingOwner!.outdatedData[
        'officialNames'
      ].find(
        (item: OutdatedOfficialName) =>
          item.id === this.restoringDataDraft['officialNames']![0]
      );
      if (restoredValue)
        this.outdatedDataDraft['officialNames'].push(restoredValue);
      this.restoringDataDraft['officialNames'] = [];
    }
    this.restoringDataDraft['officialNames'] = [data.id];
    this.mainForm.controls['officialNames'].setValue(data.officialName);
  }

/*   override async correctRestoringData() {
    super.correctRestoringData();

    // Addresses
    if (this.restoringDataDraft.addresses?.length) {
      const addresses = await this.ownerDiffService.corrHomeAddress(
        this.restoringDataDraft.addresses,
        this.outdatedDataDraft.addresses,
        this.ownerDraft,
        this.existingOwner!.outdatedData.addresses
      );
      this.restoringDataDraft.addresses = structuredClone(addresses.restoring);
      this.outdatedDataDraft.addresses = structuredClone(addresses.outdating);
    }

    // Official Names
    const dataOffNames = this.ownerDiffService.corrOfficialNames(
      this.restoringDataDraft.officialNames ?? [],
      this.outdatedDataDraft.officialNames ?? [],
      this.ownerDraft.officialName ?? [],
      this.existingOwner!.outdatedData.officialNames ?? []
    );

    this.restoringDataDraft.officialNames = structuredClone(
      dataOffNames.restoring
    );
    this.outdatedDataDraft.officialNames = structuredClone(
      dataOffNames.outdating
    );
  } */

/*   override async checkOutdatedDataDuplicates() {
    const address = await this.ownerDiffService.checkHomeAddress(
      this.outdatedDataDraft.addresses,
      this.ownerDraft
    );
    if (!address.restoringId) return false;
    if (address.restoringId > -1) {
      this.restoringDataDraft.addresses ??= [];
      this.restoringDataDraft.addresses.push(address.restoringId);
    }

    const dataOffNames = await this.ownerDiffService.checkOfficialNames(
      this.outdatedDataDraft.officialNames,
      this.ownerDraft.officialName
    );
    if (!dataOffNames.restoringId) return false;
    if (dataOffNames.restoringId > 0) {
      this.restoringDataDraft.officialNames ??= [];
      this.restoringDataDraft.officialNames.push(dataOffNames.restoringId);
    }
    return await super.checkOutdatedDataDuplicates();
  } */

  override onRestoreOutdatedCoordination(data: OutdatedCoordination) {
    this.restoringDataDraft['coordinations'] ??= [];
    this.restoringDataDraft['coordinations']?.push(data.id);
    const fa = this.mainForm.get('coordinations') as FormArray;
    if (fa.length === 1 && fa.at(0).value == '') {
      fa.at(0)?.patchValue({
        id: data.partnerId,
        name: data.partnerName!,
      });
    } else {
      this.coordinationsArray.push(
        new FormControl<CoordinationPick | null>(
          { value: null, disabled: false },
          {
            nonNullable: true,
            validators: [zodValidator(coordinationNameControlSchema)],
          }
        )
      );
      fa.at(fa.length - 1).patchValue({
        id: data.partnerId,
        name: data.partnerName!,
      });
    }

    this.deleteFromOutdatedDataDraft('coordinations', data.id);
    this.updateControlsValidity(this.controlsNames, true);
    this.onChangeValidation();
  }

/*   override async checkAllChanges() {
    const address = await this.ownerDiffService.diffHomeAddress(
      this.existingOwner!,
      this.ownerDraft,
      this.restoringDataDraft.addresses == null
        ? null
        : this.restoringDataDraft.addresses![0]
    );
    if (address.changes) this.changingData.address = address.changes;
    if (address.outdatingId) this.outdatingData.address = address.outdatingId;
    if (address.deletingId) {
      this.deletingDataDraft.addresses ??= [];
      this.deletingDataDraft.addresses.push(address.deletingId);
    }

    const officialName = await this.ownerDiffService.diffOfficialName(
      this.existingOwner!,
      this.ownerDraft
    );
    if (officialName.changes)
      this.changingData.main = {
        ...(this.changingData.main ?? {}),
        ...{ officialName: officialName.changes },
      };
    if (officialName.outdating)
      this.outdatingData.officialName = officialName.outdating;

    const coordinations = await this.ownerDiffService.diffCoordinations(
      this.kind,
      this.existingOwner!.coordinations,
      this.ownerDraft.draftCoordinations ?? [],
      this.restoringDataDraft.coordinations ?? [],
      this.existingOwner!.outdatedData.coordinations ?? []
    );
    if (coordinations.changes)
      this.changingData.coordinations = coordinations.changes;
    if (coordinations.outdating)
      this.outdatingData.coordinations = coordinations.outdating;
    if (coordinations.deleting)
      this.deletingDataDraft.coordinations = coordinations.deleting;

    return await super.checkAllChanges();
  } */

  override getPostalAddress(): string {
    return this.existingOwner!.address.fullPostalAddress;
  }

  override get outdatedOfficialNames(): OutdatedOfficialName[] {
    const data = this.outdatedDataDraft;
    const list = data?.officialNames;
    return Array.isArray(list) ? list : [];
  }

  override setHasOutdatedOfficialNames() {
    this.hasOutdatedOfficialNames.set(
      this.outdatedDataDraft.officialNames.length > 0
    );
  }

  override correctRestrictedController() {
    if (
      !this.mainForm.controls['isRestricted'].value &&
      this.mainForm.get('causeOfRestriction') &&
      !this.mainForm.controls['isClose'].value
    ) {
      this.mainForm.removeControl('causeOfRestriction');
      const idx = this.controlsNames.findIndex(
        (n) => n === 'causeOfRestriction'
      );
      if (idx !== -1) this.controlsNames.splice(idx, 1);
    }
    if (
      !this.mainForm.controls['isRestricted'].value &&
      this.mainForm.controls['isClose'].value
    ) {
      this.mainForm.addControl(
        'causeOfRestriction',
        new FormControl(null, [zodValidator(causeOfRestrictionControlSchema)])
      );
      this.controlsNames.push('causeOfRestriction');
    }
    if (this.mainForm.controls['isClose'].value) {
      const formArray = this.getFormArray('coordinations');
      formArray.clear();
    }
  }
}
