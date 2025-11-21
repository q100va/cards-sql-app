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
import { OutdatedHome } from '../../interfaces/partner';
import {
  PartnerService,
  PartnerMainService,
} from 'src/app/services/partner.service';

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
  ],
  templateUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.html',
  styleUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.css',
})
export class PartnerDetailsComponent extends AdvancedDetailsComponent<'partner'> {
  override partnerService = inject(PartnerService) as PartnerMainService;
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
    this.hasOutdatedHomes.set(this.outdatedDataDraft.homes.length > 0);
  }

  override setEmptyOutdatedDataDraft() {
    this.outdatedDataDraft = {
      addresses: [],
      names: [],
      homes: [],
      contacts: {},
    };
  }

  override setRestoringDataDraft() {
    this.restoringDataDraft = {
      addresses: null,
      names: null,
      homes: null,
      contacts: null,
    };
  }
  override setDeletingDataDraft() {
    this.deletingDataDraft = {
      addresses: null,
      names: null,
      homes: null,
      contacts: null,
    };
  }
  override setChangingData() {
    this.changingData = {
      main: null,
      contacts: null,
      address: null,
      homes: null,
    };
  }
  override setOutdatingData() {
    this.outdatingData = {
      address: null,
      names: null,
      homes: null,
      contacts: null,
    };
  }

  override onRestoreOutdatedHome(data: OutdatedHome) {
    this.restoringDataDraft['homes'] ??= [];
    this.restoringDataDraft['homes']?.push(data.id);
    const fa = this.mainForm.get('homes') as FormArray;
    if (fa.length === 1 && fa.at(0).value == null) {
      fa.at(0)?.setValue(data.name);
    } else {
      //TODO: add new home
    }
  }

  override async correctRestoringData() {
    super.correctRestoringData();

    // Homes
    const { restoring, outdating } = this.userDiffService.corrHomes(
      this.restoringDataDraft.homes ?? [],
      this.outdatedDataDraft.homes ?? [],
      this.ownerDraft.draftHomes ?? [],
      this.existingOwner!.outdatedData.homes ?? []
    );

    this.restoringDataDraft.homes = structuredClone(restoring);
    this.outdatedDataDraft.homes = structuredClone(outdating);
  }

  override async checkOutdatedDataDuplicates() {
    const homes = await this.userDiffService.checkHomes(
      this.outdatedDataDraft.homes,
      this.ownerDraft.draftHomes
    );
    if (!homes.restoring) return false;
    if (homes.restoring.length > 0) {
      this.restoringDataDraft.homes = [
        ...(this.restoringDataDraft.homes ?? []),
        ...homes.restoring,
      ];
    }

    return await super.checkOutdatedDataDuplicates();
  }
  override async checkAllChanges() {
    const homes = await this.userDiffService.diffHomes(
      this.existingOwner!.homes ?? [],
      this.ownerDraft.draftHomes ?? []
    );
    if (homes.changes) this.changingData.homes = homes.changes;
    if (homes.outdating) this.outdatingData.homes = homes.outdating;
    return await super.checkAllChanges();
  }

  override getRowSpanForHomes(): number {
    return this.outdatedDataDraft.homes.length;
  }

  override get outdatedHomes(): OutdatedHome[] {
    const data = this.outdatedDataDraft;
    const list = data?.homes;
    return Array.isArray(list) ? list : [];
  }

  override get coordinatedHomes(): OutdatedHome[] {
    const list = this.data().object!.homes;
    return Array.isArray(list) ? list : [];
  }

  override hasAffiliation(): boolean {
    return true;
  }

  override hasHomes(): boolean {
    return true;
  }

  override setHasOutdatedHomes() {
    this.hasOutdatedHomes.set(this.outdatedDataDraft.homes.length > 0);
  }
}
