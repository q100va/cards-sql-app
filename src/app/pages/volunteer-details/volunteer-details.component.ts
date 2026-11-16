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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ContactUrlPipe } from '../../utils/contact-url.pipe';
import {
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
  instituteCategorySchema,
  instituteNameControlSchema,
} from '../../../../shared/schemas/volunteer.schema';
import { DefaultAddressParams } from '../../../../shared/schemas/toponym.schema';
import { OutdatedFullName } from '../../../../shared/schemas/common.schema';

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
    MatDatepickerModule,
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
  }

  override setInitialValues(mode: 'view' | 'edit' | 'create'): void {
    super.setInitialValues(mode);

    //institutes
    const formArray = this.institutesArray;
    const values = this.existingOwner!.institutes;
    let diff = values.length - formArray.length;
    while (diff > 0) {
      formArray.push(this.createInstituteGroup(mode));
      diff--;
    }
    while (diff < 0 && formArray.length > 0) {
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
    //subscription
    this.mainForm.controls['subscription'].setValue(this.getSubsValue());

    const history = this.existingOwner!.outdatedData;
    this.hasOutdatedInstitutes.set(history.institutes.length > 0);
    this.hasOutdatedSubs.set(history.subscriptions.length > 0);
    this.hasOutdatedCoops.set(history.cooperations.length > 0);
  }
  private getSubsValue() {
    const idx = this.existingOwner!.subscriptions.findIndex(
      (s) => s.userId === this.user()!.id,
    );
    return idx !== -1;
  }

  override setEmptyOutdatedDataDraft() {
    this.outdatedDataDraft = {
      addresses: [],
      names: [],
      institutes: [],
      contacts: {},
      subscriptions: [],
      cooperations: [],
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
    fa.push(this.createInstituteGroup('edit')); //add new insts
    fa.at(fa.length - 1)?.patchValue({
      instituteName: data.instituteName,
      category: data.category,
    });
    this.deleteFromOutdatedDataDraft('institutes', data.id);
    this.onChangeValidation();
  }

  override getRowSpanForInstitutes(): number {
    return this.outdatedDataDraft.institutes.length;
  }

  override get outdatedInstitutes(): OutdatedInstitute[] {
    const data = this.outdatedDataDraft;
    const list = data?.institutes;
    return Array.isArray(list) ? list : [];
  }

    override get outdatedSubscriptions(): Subscription[] {
    const data = this.outdatedDataDraft;
    const list = data?.subscriptions;
    return Array.isArray(list) ? list : [];
  }

    override get outdatedCooperations(): Cooperation[] {
    const data = this.outdatedDataDraft;
    const list = data?.cooperations;
    return Array.isArray(list) ? list : [];
  }

  override get subscriptions(): Subscription[] {
    let list = structuredClone(this.existingOwner?.subscriptions) ?? [];
    return Array.isArray(list) ? list : [];
  }

  override get cooperations(): Cooperation[] {
    const list = this.existingOwner?.cooperations;
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
      this.outdatedDataDraft.institutes.length > 0,
    );
  }
  override setHasOutdatedSubs() {
    this.hasOutdatedSubs.set(this.outdatedDataDraft.subscriptions.length > 0);
  }
  override setHasOutdatedCoops() {
    this.hasOutdatedCoops.set(this.outdatedDataDraft.cooperations.length > 0);
  }

  private createInstituteGroup(
    mode: 'view' | 'edit' | 'create',
  ): InstituteFormGroup {
    return new FormGroup<{
      instituteName: FormControl<string | null>;
      category: FormControl<number | null>;
    }>({
      instituteName: new FormControl<string | null>(
        { value: null, disabled: mode === 'view' },
        [zodValidator(instituteNameControlSchema)],
      ),
      category: new FormControl<number | null>(
        { value: null, disabled: mode === 'view' },
        [zodValidator(instituteCategorySchema)],
      ),
    });
  }

  override get institutesArray(): FormArray<InstituteFormGroup> {
    let fa = this.mainForm.get(
      'institutes',
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
    addressParams: DefaultAddressParams | null,
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
      'institutes',
    ) as FormArray<InstituteFormGroup> | null;
    if (fa) {
      fa.controls.forEach((group: InstituteFormGroup) =>
        enable
          ? group.enable({ emitEvent: false })
          : group.disable({ emitEvent: false }),
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
    const original = this.existingOwner!['institutes'];
    const current = this.mainForm.get('institutes')!.getRawValue();

    // lengths differ -> changed
    if (original.length !== current.length) return true;

    // content differs -> changed
    const normalize = (arr: { instituteName: string; category: number }[]) =>
      arr
        .map((item) => ({
          instituteName: item.instituteName?.trim(),
          category: item.category,
        }))
        .sort(
          (x, y) =>
            x.instituteName.localeCompare(y.instituteName) ||
            x.category - y.category,
        );

    return !(
      JSON.stringify(normalize(original)) === JSON.stringify(normalize(current))
    );
  }

  private subscriptionChangeValidation(): boolean {
    const original = this.getSubsValue();
    const current = this.mainForm.get('subscription')!.getRawValue();
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

  override getRowSpanForCoops() {
    const rowSpan = Math.max(this.subscriptions?.length || 1, this.cooperations?.length || 1);
    return rowSpan;
  }
}

//TODO: при открытии карточки созданной на руччком у орг-й не показывается категория
