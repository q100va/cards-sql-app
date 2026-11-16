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
import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { OutdatedItemMenuComponent } from '../../shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component';
import { AdvancedDetailsComponent } from '../../shared/dialogs/details-dialogs/advanced-details/advanced-details.component';
import { AutocompleteRowComponent } from '../../shared/dialogs/autocomplete-row/autocomplete-row.component';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { ContactUrlPipe } from '../../utils/contact-url.pipe';
import {
  PartnerService,
  PartnerMainService,
} from '../../services/partner.service';
import { HomeService, HomeMainService } from '../../services/home.service';
import {
  coordinationNameControlSchema,
  OutdatedFullName,
} from '../../../../shared/schemas/common.schema';
import { shareReplay } from 'rxjs';
import { RelationPick } from '../../interfaces/advanced-model';
import { zodValidator } from '../../utils/zod-validator';
import { DefaultAddressParams } from '../../../../shared/schemas/toponym.schema';
import {
  HomeCoordination,
  OutdatedCoordination,
} from '../../../../shared/schemas/home.schema';

@Component({
  selector: 'app-partner-details',
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
export class PartnerDetailsComponent extends AdvancedDetailsComponent<'partner'> {
  override partnerService = inject(PartnerService) as PartnerMainService;
  override homeService = inject(HomeService) as HomeMainService;
  override ngOnInit(): void {
    super.ngOnInit();
    this.relationPickList$ = this.homeService
      .getPotentialHomesPickList()
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    this.mainProps = [
      'firstName',
      'patronymic',
      'lastName',
      'affiliation',
      'position',
      'comment',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
    ];
    this.setPartnerActive();
    this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
    this.hasOutdatedCoordinations.set(
      this.outdatedDataDraft.coordinations.length > 0
    );
    this.homeOrPartner.set('partner');
  }

  override setInitialValues(mode: 'view' | 'edit' | 'create'): void {
    super.setInitialValues(mode);

    //coordinations
    const formArray = this.coordinationsArray;
    const values = this.existingOwner!.coordinations;
    let diff = values.length - formArray.length;
    while (diff > 0) {
      formArray.push(
        new FormControl<RelationPick | null>(
          { value: null, disabled: true },
          {
            validators: [zodValidator(coordinationNameControlSchema)],
          }
        )
      );
      diff--;
    }
    while (diff < 0 && formArray.length > 0) {
      formArray.removeAt(formArray.length - 1);
      diff++;
    }
    if (values.length) {
      values.forEach((v, i) => {
        formArray.at(i).patchValue({
          id: v.homeId,
          name: v.homeName! + ' - ' + v.regionName!,
          homeStatus: v.homeStatus
        });
      });
    }
  }

  override setEmptyOutdatedDataDraft() {
    this.outdatedDataDraft = {
      addresses: [],
      names: [],
      coordinations: [],
      contacts: {},
    };
  }

  override setRestoringDataDraft() {
    this.restoringDataDraft = {
      addresses: null,
      names: null,
      coordinations: null,
      contacts: null,
    };
  }
  override setDeletingDataDraft() {
    this.deletingDataDraft = {
      addresses: null,
      names: null,
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
      names: null,
      coordinations: null,
      contacts: null,
    };
  }

  override get outdatedNames(): OutdatedFullName[] {
    const data = this.outdatedDataDraft;
    const list = data?.names;
    return Array.isArray(list) ? list : [];
  }

  override hasAffiliation(): boolean {
    return true;
  }

  override setHasOutdatedNames() {
    this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
  }

  override setPartnerActive() {
    this.partnerActive.set(!this.existingOwner?.isRestricted);
  }

  // View mode: disable coordination controls.
  protected override changeToViewMode(
    addressParams: DefaultAddressParams | null
  ) {
    super.changeToViewMode(addressParams);
    this.updateCoordinationsControlsValidity(false);
  }

  // Edit mode: enable coordination controls.
  override onEditClick() {
    super.onEditClick();
    this.updateCoordinationsControlsValidity(true);
  }

  protected updateCoordinationsControlsValidity(enable: boolean) {
    const fa = this.mainForm.get('coordinations') as FormArray<
      FormControl<RelationPick | null>
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

  private coordinationsChangeValidation(): boolean {
    const original = this.existingOwner!['coordinations'].map(
      (c: HomeCoordination) => c.homeId
    ).sort();
    const current = this.mainForm
      .get('coordinations')!
      .getRawValue()
      .filter((i: RelationPick | null | undefined) => i != null)
      .map((c: RelationPick) => c.id)
      .sort();

    // lengths differ -> changed
    if (original.length !== current.length) return true;

    // content differs -> changed

    return !(JSON.stringify(original) === JSON.stringify(current));
  }

  override onRestoreOutdatedCoordination(data: OutdatedCoordination) {
    this.restoringDataDraft['coordinations'] ??= [];
    this.restoringDataDraft['coordinations']?.push(data.id);
    const fa = this.mainForm.get('coordinations') as FormArray;
    if (fa.length === 1 && fa.at(0).value == '') {
      fa.at(0)?.patchValue({
        id: data.homeId,
        name: data.homeName! + ' - ' + data.regionName!,
      });
    } else {
      this.coordinationsArray.push(
        new FormControl<RelationPick | null>(
          { value: null, disabled: false },
          {
            nonNullable: true,
            validators: [zodValidator(coordinationNameControlSchema)],
          }
        )
      );
      fa.at(fa.length - 1).patchValue({
        id: data.homeId,
        name: data.homeName! + ' - ' + data.regionName!,
      });
    }

    this.deleteFromOutdatedDataDraft('coordinations', data.id);
    this.onChangeValidation();
  }

}
