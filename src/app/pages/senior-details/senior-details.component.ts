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
import { of, shareReplay } from 'rxjs';
import { CoordinationPick } from '../../interfaces/advanced-model';

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
export class SeniorDetailsComponent extends AdvancedDetailsComponent<'senior'> {
  override seniorService = inject(SeniorService) as SeniorMainService;
  override homeService = inject(HomeService) as HomeMainService;
  override ngOnInit(): void {
    super.ngOnInit();
    if (this.data().operation == 'create')
      this.mainForm.get('spouseId')?.disable();
    this.coordinationPickList$ = this.homeService
      .getHomesPickList()
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

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
    this.setHasOutdatedNames(); //hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
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

  override get outdatedNames(): OutdatedFullName[] {
    const data = this.outdatedDataDraft;
    const list = data?.names;
    return Array.isArray(list) ? list : [];
  }

  override setHasOutdatedNames() {
    this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
  }

  override updateAddressFilter(home: CoordinationPick | null) {
    this.mainForm.get('spouseId')?.enable();
    console.log('home', home);
    if (home === null) {
      this.spousePickList$ = of([]);
      this.addressFilterComponent.onChangeMode('view', {
        countryId: null,
        regionId: null,
        districtId: null,
        localityId: null,
      });
    } else {
      this.spousePickList$ = this.seniorService
        .getSeniorsPickList(home.id)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.addressFilterComponent.onChangeMode('view', {
        countryId: home.countryId!,
        regionId: home.regionId!,
        districtId: home.districtId!,
        localityId: home.localityId!,
      });
    }
  }
}
