import { Component, inject } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
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
  Institute,
  OutdatedInstitute,
  Cooperation,
  Subscription,
  InstituteFormGroup,
} from '../../interfaces/advanced-model';
import {
  VolunteerService,
  VolunteerMainService,
} from '../../services/volunteer.service';
import { zodValidator } from '../../utils/zod-validator';
import {
  instituteCategoryControlSchema,
  instituteNameControlSchema,
} from '../../../../shared/schemas/volunteer.schema';
import { DefaultAddressParams } from '../../../../shared/schemas/toponym.schema';
import { OutdatedFullName } from '../../../../shared/schemas/common.schema';
import { reconcileRestoredAddress, reconcileRestoredInstitutes } from '../../utils/owner-restoration-reconcile.util';

@Component({
  selector: 'app-volunteer-details',
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
export class VolunteerDetailsComponent extends AdvancedDetailsComponent<'volunteer'> {
  override volunteerService = inject(VolunteerService) as VolunteerMainService;
  override ngOnInit(): void {
    super.ngOnInit();
    this.mainProps = [
      'firstName',
      'patronymic',
      'lastName',
      'comment',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
    ];
    this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
    this.hasOutdatedInstitutes.set(
      this.outdatedDataDraft.institutes.length > 0
    );
  }

  override setInitialValues(mode: 'view' | 'edit' | 'create'): void {
    super.setInitialValues(mode);

    //institutes
    const formArray = this.institutesArray;
    const values = this.object!.institutes;
    let diff = values.length - formArray.length;
    while (diff > 0) {
      formArray.push(this.createInstituteGroup(mode));
      diff--;
    }
    while (diff < 0 && formArray.length > 1) {
      formArray.removeAt(formArray.length - 1);
      diff++;
    }
    if (values.length) {
      values.forEach((v, i) => {
        formArray.at(i).patchValue({
          instituteName: v.instituteName,
          category: v.category,
        });
      });
    }
    /*    const SUB = structuredClone(this.object!.subscriptions);
    const SUBOWNER = structuredClone(this.existingOwner!.subscriptions);
    console.log('mode', mode);
    console.log('SUB - setInitialValues - this.object!.subscriptions', SUB);
    console.log(
      'SUBOWNER - setInitialValues - this.existingOwner!.subscriptions',
      SUBOWNER
    ); */
    //subscription
    if (this.object!.subscriptions.length) {
      this.mainForm.controls['subscription'].setValue(this.getSubsValue());
    }
  }
  //TODO: заменить this.object! на existingOwner
  private getSubsValue() {
    const idx = this.object!.subscriptions.findIndex(
      (s) => s.userId === this.user()!.id
    );
    console.log('this.object', structuredClone(this.object));
    console.log('idx', idx);
    return idx !== -1;
  }

  override setEmptyOutdatedDataDraft() {
    this.outdatedDataDraft = {
      addresses: [],
      names: [],
      institutes: [],
      contacts: {},
    };
  }

  override setRestoringDataDraft() {
    this.restoringDataDraft = {
      addresses: null,
      names: null,
      institutes: null,
      contacts: null,
    };
  }
  override setDeletingDataDraft() {
    this.deletingDataDraft = {
      addresses: null,
      names: null,
      institutes: null,
      contacts: null,
      subscriptions: null,
    };
  }
  override setChangingData() {
    this.changingData = {
      main: null,
      contacts: null,
      address: null,
      institutes: null,
      subscriptions: null,
      cooperations: null,
    };
  }
  override setOutdatingData() {
    this.outdatingData = {
      address: null,
      names: null,
      institutes: null,
      contacts: null,
    };
  }

  override onRestoreOutdatedInstitute(data: OutdatedInstitute) {
    this.restoringDataDraft['institutes'] ??= [];
    this.restoringDataDraft['institutes']?.push(data.id);
    const fa = this.mainForm.get('institutes') as FormArray;
    if (fa.length === 0) {
      fa.at(0)?.setValue(data.instituteName);
    } else {
      //TODO: add new insts
    }
  }

/*   override async correctRestoringData() {
    super.correctRestoringData();

    // Addresses
    if (this.restoringDataDraft.addresses?.length) {
      const addresses = reconcileRestoredAddress(
        this.restoringDataDraft.addresses,
        this.outdatedDataDraft.addresses,
        this.ownerDraft.draftAddress,
        this.existingOwner!.outdatedData.addresses
      );
      this.restoringDataDraft.addresses = structuredClone(addresses.restoring);
      this.outdatedDataDraft.addresses = structuredClone(addresses.outdating);
    }

    // Institutes
    const { restoring, outdating } = reconcileRestoredInstitutes(
      this.restoringDataDraft.institutes ?? [],
      this.outdatedDataDraft.institutes ?? [],
      this.ownerDraft.draftInstitutes ?? [],
      this.existingOwner!.outdatedData.institutes ?? []
    );

    this.restoringDataDraft.institutes = structuredClone(restoring);
    this.outdatedDataDraft.institutes = structuredClone(outdating);
  } */

/*   override async checkOutdatedDataDuplicates() {
    const address = await this.ownerService.checkAddress(
      this.outdatedDataDraft.addresses,
      this.ownerDraft.draftAddress
    );
    if (!address.restoringId) return false;
    if (address.restoringId > -1) {
      this.restoringDataDraft.addresses ??= [];
      this.restoringDataDraft.addresses.push(address.restoringId);
    }
    const institutes = await this.ownerDiffService.checkInstitutes(
      this.outdatedDataDraft.institutes,
      this.ownerDraft.draftInstitutes ?? []
    );
    if (!institutes.restoring) return false;
    if (institutes.restoring.length > 0) {
      this.restoringDataDraft.institutes = [
        ...(this.restoringDataDraft.institutes ?? []),
        ...institutes.restoring,
      ];
    }

    return await super.checkOutdatedDataDuplicates();
  } */
/*   override async checkAllChanges() {
    const address = await this.ownerService.diffAddress(
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

    const names = await this.ownerService.diffNames(
      this.existingOwner!,
      this.ownerDraft
    );
    if (names.changes) this.changingData.main = names.changes;
    if (names.outdating) this.outdatingData.names = names.outdating;

    const institutes = await this.ownerDiffService.diffInstitutes(
      this.existingOwner!.institutes ?? [],
      this.ownerDraft.draftInstitutes ?? [],
      this.restoringDataDraft.institutes ?? [],
      this.existingOwner!.outdatedData.institutes ?? []
    );
    if (institutes.changes) this.changingData.institutes = institutes.changes;
    if (institutes.outdating)
      this.outdatingData.institutes = institutes.outdating;
    if (institutes.deleting)
      this.deletingDataDraft.institutes = institutes.deleting;

    const subscriptions = await this.ownerDiffService.diffSubs(
      this.existingOwner!.subscriptions ?? [],
      this.ownerDraft.draftSubscriptions ?? [],
      this.user()!.id
    );
    if (subscriptions.changes)
      this.changingData.subscriptions = subscriptions.changes;
    if (subscriptions.deleting)
      this.deletingDataDraft.subscriptions = subscriptions.deleting;
    return await super.checkAllChanges();
  } */

  override getRowSpanForInstitutes(): number {
    return this.outdatedDataDraft.institutes.length;
  }

  override get outdatedInstitutes(): OutdatedInstitute[] {
    const data = this.outdatedDataDraft;
    const list = data?.institutes;
    return Array.isArray(list) ? list : [];
  }

  /*   override get institutes(): Institute[] {
    const list = this.object!.institutes;
    return Array.isArray(list) ? list : [];
  } */

  override get subscriptions(): Subscription[] {
    let list = structuredClone(this.object!.subscriptions) ?? [];
    const idx = list.findIndex((s) => s.userId === this.user()!.id);
    if (idx !== -1) list.splice(idx, 1);
    return list;
  }

  override get cooperations(): Cooperation[] {
    const list = this.object!.cooperations;
    return Array.isArray(list) ? list : [];
  }

  override hasSubscriptions(): boolean {
    return true;
  }
  override hasCooperations(): boolean {
    return true;
  }
  override hasInstitutes(): boolean {
    return true;
  }

  override setHasOutdatedInstitutes() {
    this.hasOutdatedInstitutes.set(
      this.outdatedDataDraft.institutes.length > 0
    );
  }

  private createInstituteGroup(
    mode: 'view' | 'edit' | 'create'
  ): InstituteFormGroup {
    return new FormGroup<{
      instituteName: FormControl<string | null>;
      category: FormControl<string | null>;
    }>({
      instituteName: new FormControl<string | null>(
        { value: null, disabled: mode === 'view' },
        [zodValidator(instituteNameControlSchema)]
      ),
      category: new FormControl<string | null>(
        { value: null, disabled: mode === 'view' },
        [zodValidator(instituteCategoryControlSchema)]
      ),
    });
  }

  override get institutesArray(): FormArray<InstituteFormGroup> {
    let fa = this.mainForm.get(
      'institutes'
    ) as FormArray<InstituteFormGroup> | null;

    if (!fa) {
      fa = new FormArray<InstituteFormGroup>([]);
      this.mainForm.addControl('institutes', fa);
    }

    return fa;
  }

  override onAddInstituteClick() {
    this.institutesArray.push(this.createInstituteGroup('create'));
  }

  // View-mode: disable institutes controls
  protected override changeToViewMode(
    addressParams: DefaultAddressParams | null
  ) {
    super.changeToViewMode(addressParams);
    this.updateInstitutesControlsValidity(false);
  }

  // Edit-mode: enable institutes controls
  override onEditClick() {
    super.onEditClick();
    this.updateInstitutesControlsValidity(true);
  }

  protected updateInstitutesControlsValidity(enable: boolean) {
    const fa = this.mainForm.get(
      'institutes'
    ) as FormArray<InstituteFormGroup> | null;
    if (fa) {
      fa.controls.forEach((group: InstituteFormGroup) =>
        enable
          ? group.enable({ emitEvent: false })
          : group.disable({ emitEvent: false })
      );
    }
    this.checkIsSaveDisabled();
  }

  protected override additionalValidationHooks(): boolean {

    return (
      this.contactsChangeValidation() ||
      this.addressChangeValidation() ||
      this.institutesChangeValidation() ||
      this.subscriptionChangeValidation()
    );
  }

  private institutesChangeValidation(): boolean {
    const original = this.object!['institutes'];
    const current = this.mainForm.get('institutes')!.getRawValue();

    // lengths differ -> changed
    if (original.length !== current.length) return true;

    // content differs -> changed
    const normalize = (arr: { instituteName: string; category: string }[]) =>
      arr
        .map((item) => ({
          instituteName: item.instituteName?.trim(),
          category: item.category,
        }))
        .sort(
          (x, y) =>
            x.instituteName.localeCompare(y.instituteName) ||
            x.category.localeCompare(y.category)
        );
    /*     console.log(
      'JSON.stringify(normalize(original)) === JSON.stringify(normalize(current))',
      JSON.stringify(normalize(original)) === JSON.stringify(normalize(current))
    ); */

    return !(
      JSON.stringify(normalize(original)) === JSON.stringify(normalize(current))
    );
  }

  private subscriptionChangeValidation(): boolean {
    const original = this.getSubsValue();
    const current = this.mainForm.get('subscription')!.getRawValue();
    console.log('original', original);
    console.log('current', current);
    return original !== current;
  }

  override get outdatedNames(): OutdatedFullName[] {
    const data = this.outdatedDataDraft;
    const list = data?.names;
    return Array.isArray(list) ? list : [];
  }

  override setHasOutdatedNames() {
    this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
  }
}

//TODO: при открытии карточки созданной на руччком у орг-й не показывается категория
