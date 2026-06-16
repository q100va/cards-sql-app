import { Component } from '@angular/core';
import {
  emailControlSchema,
  facebookControlSchema,
  instagramControlSchema,
  otherContactControlSchema,
  phoneNumberControlSchema,
  telegramIdControlSchema,
  telegramNicknameControlSchema,
  vKontakteControlSchema,
  whatsAppControlSchema,
  websiteControlSchema,
} from '../../../../shared/schemas/volunteer.schema';

import { volunteerDraftSchema } from '../../../../shared/schemas/volunteer.schema';
import { TranslateModule } from '@ngx-translate/core';
import { TableComponent } from '../../shared/table/table.component';

import { DialogData } from '../../interfaces/dialog-props';
import {
  ColumnDefinition,
  FilterComponentSource,
  TableParams,
  ViewOption,
} from '../../interfaces/base-list';

import { zodValidator } from '../../utils/zod-validator';
import * as Validator from '../../utils/custom.validator';
import { Kind, Volunteer } from '../../interfaces/advanced-model';

import { volunteerDialogConfig } from './volunteer-dialog-config';

@Component({
  selector: 'app-volunteers-list',
  imports: [TableComponent, TranslateModule],
  templateUrl: './volunteers-list.component.html',
  styleUrl: './volunteers-list.component.css',
})
export class VolunteersListComponent {
  kind: Kind = 'volunteer';
  viewOptions: ViewOption[] = [
    {
      id: 'all',
      name: 'VOLUNTEER.VIEW_OPTIONS.ALL',
      initiallySelected: false,
    },
    {
      id: 'only-active',
      name: 'VOLUNTEER.VIEW_OPTIONS.ONLY_ACTIVE',
      initiallySelected: true,
    },
    {
      id: 'only-blocked',
      name: 'VOLUNTEER.VIEW_OPTIONS.ONLY_BLOCKED',
      initiallySelected: false,
    },
  ];

  componentType: FilterComponentSource = 'volunteerList';

  tableParams: TableParams = {
    title: 'VOLUNTEER.TABLE_TITLE',
    addTitle: 'VOLUNTEER.ADD_VOLUNTEER',
    searchPlaceholder: 'VOLUNTEER.SEARCH_PLACEHOLDER',
    addIcon: 'person_add_alt',
    labels: {
      blockLabel: 'NAV.FILTER.BLOCK_COMMENT_VOLUNTEERS',
      closeLabel: '',
      notActiveLabel: 'NAV.FILTER.NOT_ACTIVE_COMMENT_VOLUNTEERS',
    },
  };

  IMPLICITLY_DISPLAYED_COLUMNS: ColumnDefinition[] = [
    {
      id: 1,
      columnName: 'name',
      columnFullName: 'TABLE.COLUMNS.FULL_NAME',
      isUnchangeable: true,
    },
    {
      id: 2,
      columnName: 'contacts',
      columnFullName: 'TABLE.COLUMNS.CONTACTS',
      isUnchangeable: false,
    },
    {
      id: 3,
      columnName: 'address',
      columnFullName: 'TABLE.COLUMNS.ADDRESS',
      isUnchangeable: false,
    },
    {
      id: 4,
      columnName: 'institutes',
      columnFullName: 'TABLE.COLUMNS.INSTITUTES',
      isUnchangeable: false,
    },
    {
      id: 5,
      columnName: 'cooperations',
      columnFullName: 'TABLE.COLUMNS.COOPERATIONS',
      isUnchangeable: false,
    },
    {
      id: 6,
      columnName: 'dateOfStart',
      columnFullName: 'TABLE.COLUMNS.START_DATE',
      isUnchangeable: false,
    },
    {
      id: 7,
      columnName: 'comment',
      columnFullName: 'TABLE.COLUMNS.COMMENT',
      isUnchangeable: false,
    },
    {
      id: 8,
      columnName: 'isRestricted',
      columnFullName: 'TABLE.COLUMNS.STATUS',
      isUnchangeable: false,
    },
    {
      id: 9,
      columnName: 'dateOfLastOrder',
      columnFullName: 'TABLE.COLUMNS.LAST_ORDER_DATE',
      isUnchangeable: false,
    },
    {
      id: 10,
      columnName: 'actions',
      columnFullName: 'TABLE.COLUMNS.ACTIONS',
      isUnchangeable: false,
    },
  ];

  volunteerDialogConfig = volunteerDialogConfig;

  params = {
    columns: this.IMPLICITLY_DISPLAYED_COLUMNS,
    viewOptions: this.viewOptions,
    componentType: this.componentType,
    tableParams: this.tableParams,
  };
}
