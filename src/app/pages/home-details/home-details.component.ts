import { Component, inject } from '@angular/core';
import { FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
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

import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { OutdatedItemMenuComponent } from '../../shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component';
import { AdvancedDetailsComponent } from '../../shared/dialogs/details-dialogs/advanced-details/advanced-details.component';

import { ContactUrlPipe } from '../../utils/contact-url.pipe';

import {
  OutdatedOfficialName,
  OutdatedCoordination,
  HomeCoordination,
} from '../../interfaces/advanced-model';

import { HomeService, HomeMainService } from '../../services/home.service';

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
  ],
  templateUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.html',
  styleUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.css',
})
export class HomeDetailsComponent extends AdvancedDetailsComponent<'home'> {
  override homeService = inject(HomeService) as HomeMainService;
  override ngOnInit(): void {
    /*     this.existingOwner = this.data().object;
    if (this.existingOwner) {
      this.outdatedDataDraft = structuredClone(this.existingOwner.outdatedData);
      console.log(this.outdatedDataDraft);
    } */
    super.ngOnInit();
    this.mainProps = [
      'affiliation',
      'position',
      'comment',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
    ];
    this.hasOutdatedOfficialNames.set(
      this.outdatedDataDraft.officialNames.length > 0
    );
    this.hasOutdatedCoordinations.set(
      this.outdatedDataDraft.coordinations.length > 0
    );
    this.homeOrPartner.set('home');
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

  /*   override onRestoreOutdatedCoordination(
    data: OutdatedCoordination,
    name: 'homeName' | 'partnerName'
  ) {
    this.restoringDataDraft['coordinations'] ??= [];
    this.restoringDataDraft['coordinations']?.push(data.id);
    const fa = this.mainForm.get('coordinations') as FormArray;
    if (fa.length === 1 && fa.at(0).value == null) {
      fa.at(0)?.setValue(data[name]);
    } else {
      //TODO: add new partner
    }
  } */

  override async correctRestoringData() {
    super.correctRestoringData();

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
  }

  override async checkOutdatedDataDuplicates() {
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
  }

  override async checkAllChanges() {
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


    return await super.checkAllChanges();
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
}
