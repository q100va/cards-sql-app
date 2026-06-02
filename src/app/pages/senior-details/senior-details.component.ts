import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { OutdatedItemMenuComponent } from '../../shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component';
import { AdvancedDetailsComponent } from '../../shared/dialogs/details-dialogs/advanced-details/advanced-details.component';
import { AutocompleteRowComponent } from '../../shared/dialogs/autocomplete-row/autocomplete-row.component';

import { ContactUrlPipe } from '../../utils/contact-url.pipe';
import {
  SeniorService,
  SeniorMainService,
} from '../../services/senior.service';
import { HomeService, HomeMainService } from '../../services/home.service';
import { OutdatedFullName } from '../../../../shared/schemas/common.schema';
import { BehaviorSubject, of, shareReplay, switchMap } from 'rxjs';
import { RelationPick } from '../../interfaces/advanced-model';
import { DateUtilsService } from '../../services/date-utils.service';

@Component({
  selector: 'app-senior-details',
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
    MatCheckboxModule,
    MatDatepickerModule,
    AddressFilterComponent,
    OutdatedItemMenuComponent,
    TranslateModule,
    ContactUrlPipe,
    MatAutocompleteModule,
    AutocompleteRowComponent,
  ],
  templateUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.html',
  styleUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.css',
})

//TODO: не удаляется интернат при создании
export class SeniorDetailsComponent extends AdvancedDetailsComponent<'senior'> {
  override seniorService = inject(SeniorService) as SeniorMainService;
  override homeService = inject(HomeService) as HomeMainService;

  private selectedHomeId$ = new BehaviorSubject<number | null>(null);

  override spousePickList$ = this.selectedHomeId$.pipe(
    switchMap((id) =>
      id ? this.seniorService.getSeniorsPickList(id) : of([]),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.data().operation == 'create')
      this.mainForm.get('spouse')?.disable();
    this.relationPickList$ = this.homeService
      .getActiveHomesPickList()
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.selectedHomeId$.next(this.existingOwner?.homeId ?? null);

    this.mainProps = [
      'firstName',
      'patronymic',
      'lastName',
      'birthDate',
      'gender',
      'comment',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
      'childOfWar',
      'dateOfConsent',
      'dateOfExit',
      'honoraryStatus',
      'infoNote',
      'interests',
      'kindergarten',
      'orthodoxBeliever',
      'personalNoAddr',
      'photoLink',
      'profession',
      'teacher',
      'veteran',
      'homeId',
      'spouseId',
    ];
    this.showRestrictedToggle = !this.existingOwner?.dateOfExit;
    this.setHasOutdatedNames(); //hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
  }

  override setInitialValues(mode: 'view' | 'edit' | 'create'): void {
    super.setInitialValues(mode);

    //home
    this.mainForm.controls['nursingHome'].patchValue({
      id: this.existingOwner!.homeId,
      name:
        this.existingOwner!.home.homeName +
        ' - ' +
        this.existingOwner!.address.region.shortName,
      fullPostalAddress: this.existingOwner!.address.fullPostalAddress,
      noAddress: this.existingOwner!.home.noAddress,
      specialHome: this.existingOwner!.home.specialHome,
      acceptableForSchool: this.existingOwner!.home.acceptableForSchool,
    });
    //spouse
    if (this.existingOwner!.spouseId) {
      this.mainForm.controls['spouse'].patchValue({
        id: this.existingOwner!.spouseId,
        name: this.existingOwner!.spouseFullName,
      });
    }
  }

  override setEmptyOutdatedDataDraft() {
    this.outdatedDataDraft = {
      names: [],
    };
  }

  override setRestoringDataDraft() {
    this.restoringDataDraft = {
      names: null,
    };
  }
  override setDeletingDataDraft() {
    this.deletingDataDraft = {
      names: null,
    };
  }
  override setChangingData() {
    this.changingData = {
      main: null,
    };
  }
  override setOutdatingData() {
    this.outdatingData = {
      names: null,
    };
  }
  // TODO: проверить восстановление, есть ошибки
  override get outdatedNames(): OutdatedFullName[] {
    const data = this.outdatedDataDraft;
    const list = data?.names;
    return Array.isArray(list) ? list : [];
  }

  override setHasOutdatedNames() {
    this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
  }

  override updateAddressFilter(home: RelationPick | null) {
    this.mainForm.get('spouse')?.enable();
    this.selectedHomeId$.next(home?.id ?? null);

    this.addressFilterComponent.onChangeMode('view', {
      countryId: home?.countryId ?? null,
      regionId: home?.regionId ?? null,
      districtId: home?.districtId ?? null,
      localityId: home?.localityId ?? null,
    });
  }

  protected override additionalValidationHooks(): boolean {
    return this.spouseChangeValidation();
  }

  spouseChangeValidation(): boolean {
    const original = this.existingOwner!['spouseId'] ?? null;
    const current = this.mainForm.get('spouse')!.getRawValue()?.id ?? null;
    return !(original === current);
  }

  /*
  override updateAddressFilter(home: RelationPick | null) {
    this.mainForm.get('spouse')?.enable();
    console.log('home', home);
    if (home === null) {
      // this.spousePickList$ = of([]);
      this.spousePickListSubject.next([]);
      this.addressFilterComponent.onChangeMode('view', {
        countryId: null,
        regionId: null,
        districtId: null,
        localityId: null,
      });
    } else {
      this.seniorService.getSeniorsPickList(home.id).subscribe((list) => {
        this.spousePickListSubject.next(list);
      });
      console.log('this.spousePickList$', this.spousePickList$);


      this.addressFilterComponent.onChangeMode('view', {
        countryId: home.countryId!,
        regionId: home.regionId!,
        districtId: home.districtId!,
        localityId: home.localityId!,
      });
    }
  } */
}
