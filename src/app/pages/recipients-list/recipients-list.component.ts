import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatMenuModule } from '@angular/material/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { OccasionService } from '../../services/occasion.service';
import { RecipientService } from '../../services/recipient.service';
import { ConfirmationService } from 'primeng/api';
import { MessageWrapperService } from '../../services/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, map, switchMap } from 'rxjs';
import { Occasion } from '../../../../shared/schemas/occasion.schema';
import {
  Recipient,
  recipientQueryDTOSchema,
} from '../../../../shared/schemas/recipient.schema';
import { HasOpDirective } from '../../directives/has-op.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateRecipientDialogComponent } from './create-recipient-dialog/create-recipient-dialog.component';

@Component({
  selector: 'app-recipients-list',
  templateUrl: './recipients-list.component.html',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatGridListModule,
    MatCheckboxModule,
    MatIconModule,
    MatMenuModule,
    TableModule,
    ButtonModule,
    IconField,
    InputIcon,
    CommonModule,
    MultiSelectModule,
    SelectModule,
    InputTextModule,
    DropdownModule,
    TooltipModule,
    HasOpDirective,
    TranslateModule,
  ],
  providers: [],
  styleUrl: './recipients-list.component.css',
})
export class RecipientsListComponent implements OnInit {
  // Dependencies
  private readonly destroyRef = inject(DestroyRef);
  private readonly occasionService = inject(OccasionService);
  private readonly recipientService = inject(RecipientService);
  private readonly confirmationService = inject(ConfirmationService);
  //private readonly filterService = inject(FilterService);
  private readonly dialog = inject(MatDialog);
  private readonly msgWrapper = inject(MessageWrapperService);
  readonly translateService = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  totalRecords = 0;
  occasionId!: number;
  occasion!: Occasion;
  recipients!: Recipient[];
  selectedRecipients: Recipient[] = [];
  searchValue: string | undefined;
  categories = [];
  statuses = [];
  selectedCategories = signal<string[]>([]);
  selectedStatuses = signal<string[]>([]);
  acceptableForSchoolOptions = [
    {
      label: this.translateService.instant('RECIPIENT.TABLE_FOR_SCHOOL'),
      value: true,
    },
    {
      label: this.translateService.instant('RECIPIENT.TABLE_NOT_FOR_SCHOOL'),
      value: false,
    },
  ];
  statusOptions = [
    {
      label: this.translateService.instant('RECIPIENT.TABLE_ABSENT_STATUS'),
      value: true,
    },
    {
      label: this.translateService.instant('RECIPIENT.TABLE_EMPTY_STATUS'),
      value: false,
    },
  ];

  constructor() {}

  ngOnInit() {
    console.log('RecipientsListComponent');
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('occasionId'))),
        switchMap((occasionId) => {
          this.occasionId = occasionId;
          console.log('this.occasionId:', occasionId);
          return this.occasionService.getOccasionById(occasionId);
        }),
      )
      .subscribe({
        next: (res) => {
          console.log('res.data:', res.data);
          this.occasion = res.data;
        },
        error: (err) => {
          this.msgWrapper.handle(err, {
            source: 'RecipientsListComponent',
            stage: 'getOccasionById',
            occasionId: this.occasionId,
          });
        },
      });
  }

  loadRecipients(event: TableLazyLoadEvent): void {
    console.log('event:', event);

    /*     Object
    filters:
    acceptableForSchool: [{…}]0: {value: null, matchMode: 'startsWith', operator: 'and'}length: 1[[Prototype]]: Array(0)
    birthDay: [{…}]
    birthMonth: [{…}]
    birthYear: [{…}]
    category: Array(1)0: {value: 'male', matchMode: 'contains', operator: 'and'}length: 1[[Prototype]]: Array(0)
    fullName: [{…}]0: {value: null, matchMode: 'startsWith', operator: 'and'}length: 1[[Prototype]]: Array(0)
    homeName: [{…}]
    isAbsent: [{…}]
    plusAmount: [{…}]
    regionName: [{…}]
    specialComment: [{…}][[Prototype]]: Object
    first: 0
    forceUpdate: () => this.cd.detectChanges()
    globalFilter: null
    multiSortMeta: undefined
    rows: 10
    sortField: "fullName"
    sortOrder: 1
    [[Prototype]]: Object */

    const query = {
      occasionId: this.occasionId,
      offset: event.first ?? 0,
      limit: event.rows ?? 20,
      sortField: event.sortField,
      sortOrder: event.sortOrder,
      searchValue: this.searchValue,
      filters: this.normalizePrimeFilters(event.filters),
    };
    this.isLoading.set(true);
    //console.log('FILTERS:', query.filters);
    this.recipientService
      .getRecipientsByOccasion(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.recipients = res.data.list;
          this.totalRecords = res.data.length;
          this.selectedRecipients = [];
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'RecipientsList',
            stage: 'getRecipientsByOccasion',
            query,
          }),
      });
  }

  onSearchEnter(dt: Table) {
    this.loadRecipients({
      first: 0,
      rows: dt.rows ?? 20,
      sortField: dt.sortField,
      sortOrder: dt.sortOrder,
      filters: dt.filters,
    });
  }

  private normalizePrimeFilters(filters: any) {
    //console.log('normalizePrimeFilters');
    const result: Record<
      string,
      {
        value: string | boolean | number;
        matchMode: string;
        operator: string;
      }[]
    > = {};

    for (const [field, meta] of Object.entries(filters ?? {})) {
      //console.log('Object.entries(filters ?? {})');
      const metaArray = Array.isArray(meta)
        ? meta.filter(
            (m) => m.value !== null && m.value !== undefined && m.value !== '',
          )
        : [];
      //console.log('metaArray:', metaArray);
      if (metaArray.length) {
        result[field] = [...metaArray];
      }
    }

    return result;
  }

  clear(dt: Table) {
    this.searchValue = '';
    dt.reset();
    /*   this.selectedDates.set([]);
      this.selectedMonths.set([]);
      this.selectedYears.set([]);
      this.selectedTypes.set([]);
      this.selectedStatuses.set([]);
      this.nameFilterValue.set('');
      this.filteredOccasions = [...this.allOccasions]; */
  }

  cannotDeleteRecipients() {
    if (this.selectedRecipients.length === 0) return true;
    const index = this.selectedRecipients.findIndex((s) => s.plusAmount > 0);
    if (index !== -1) return true;
    return false;
  }
  cannotSendRecipients() {
    if (this.selectedRecipients.length === 0) return true;
    const index = this.selectedRecipients.findIndex((s) => s.isAbsent === true);
    if (index !== -1) return true;
    return false;
  }

  getOccasionName(occasion: Occasion) {
    return (
      this.translateService.instant(occasion!.type) +
      ' ' +
      (occasion!.monthNameKey
        ? this.translateService.instant(occasion!.monthNameKey)
        : '') +
      ' ' +
      occasion!.year
    );
  }

  onAddRecipientClick(dt: Table) {
    const dialogRef = this.dialog.open(CreateRecipientDialogComponent, {
      disableClose: true,
      minWidth: '400px',
      minHeight: '350px',
      height: 'auto',
      maxHeight: '80%',
      data: this.occasion,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((occasionName) => {
        if (occasionName) {
          this.clear(dt);
        }
      });
  }

    onDeleteRecipientsClick(selectedRecipients: Recipient[], dt: Table) {
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'PRIME_CONFIRM.DELETE_ITEM_MESSAGE',
        {
          name: selectedRecipients.length + ' ' + 'PRIME_CONFIRM.DELETE_RECIPIENTS',//TODO:
        },
      ),
      header: this.translateService.instant('PRIME_CONFIRM.WARNING_HEADER'),
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: this.translateService.instant('PRIME_CONFIRM.REJECT'),
      },
      acceptButtonProps: {
        label: this.translateService.instant('PRIME_CONFIRM.ACCEPT'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.deleteRecipient(selectedRecipients, dt),
    });
  }

  deleteRecipient(selectedRecipients: Recipient[], dt: Table) {
    // console.log('selectedRecipients', selectedRecipients);
    this.isLoading.set(true);
    const selectedRecipientIds = selectedRecipients.map((r) => r.id);
    this.recipientService
      .deleteRecipients(selectedRecipientIds, this.occasion.id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.clear(dt);
          this.selectedRecipients = [];
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'RecipientsList',
            stage: 'deleteRecipients',
            selectedRecipientIds,
          }),
      });
  }
  onSendRecipientClick(selectedRecipients: Recipient[]) {}
  onShowOrdersClick(recipientId: number) {}
}

//TODO: вносить изменения в ресипиентов открытых поводов при изменении данных сеньора или интерната
