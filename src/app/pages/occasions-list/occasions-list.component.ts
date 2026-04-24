import {
  Component,
  DestroyRef,
  OnInit,
  WritableSignal,
  inject,
  signal,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmationService, SortEvent, FilterService } from 'primeng/api';
// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatMenuModule } from '@angular/material/menu';
// App services, utils, schemas
import { CreateOccasionDialogComponent } from './create-occasion-dialog/create-occasion-dialog.component';
import { MessageWrapperService } from '../../services/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HasOpDirective } from '../../directives/has-op.directive';
import { OccasionService } from '../../services/occasion.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, finalize, map, Observable, switchMap } from 'rxjs';
import { Occasion } from '../../../../shared/schemas/occasion.schema';

@Component({
  selector: 'app-occasions-list',
  imports: [
    // Material
    MatCardModule,
    MatButtonModule,
    MatGridListModule,
    MatCheckboxModule,
    MatIconModule,
    MatMenuModule,
    ButtonModule,
    SelectModule,
    IconFieldModule,
    InputIconModule,
    MultiSelectModule,
    TableModule,
    InputTextModule,
    FormsModule,
    ToolbarModule,
    ConfirmDialogModule,
    TranslateModule,
    HasOpDirective,
    AsyncPipe,
  ],
  standalone: true,
  templateUrl: './occasions-list.component.html',
  styleUrl: './occasions-list.component.css',
})
export class OccasionsListComponent implements OnInit {
  // Dependencies
  private readonly destroyRef = inject(DestroyRef);
  private readonly occasionService = inject(OccasionService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly filterService = inject(FilterService);
  private readonly dialog = inject(MatDialog);
  private readonly msgWrapper = inject(MessageWrapperService);
  readonly translateService = inject(TranslateService);

  isLoading = signal<boolean>(false);

  allOccasions: Occasion[] = [];
  filteredOccasions: Occasion[] = [];

  searchValue: string | undefined;

  selectedDates = signal<string[]>([]);
  selectedMonths = signal<string[]>([]);
  selectedYears = signal<string[]>([]);
  selectedTypes = signal<string[]>([]);
  selectedStatuses = signal<string[]>([]);

  yearOptions!: number[];
  private rawDateOptions$ = new BehaviorSubject<string[]>([]);
  private rawMonthOptions$ = new BehaviorSubject<string[]>([]);
  private rawTypeOptions$ = new BehaviorSubject<string[]>([]);
  private rawStatusOptions$ = new BehaviorSubject<string[]>([]);

  dateOptions$ = this.rawDateOptions$.pipe(
    switchMap((keys) =>
      this.translateService.stream(keys).pipe(
        map((translations) =>
          keys.map((key) => ({
            label: translations[key],
            value: key,
          })),
        ),
      ),
    ),
  );

  monthOptions$ = this.rawMonthOptions$.pipe(
    switchMap((keys) =>
      this.translateService.stream(keys).pipe(
        map((translations) =>
          keys.map((key) => ({
            label: translations[key],
            value: key,
          })),
        ),
      ),
    ),
  );

  typeOptions$ = this.rawTypeOptions$.pipe(
    switchMap((keys) =>
      this.translateService.stream(keys).pipe(
        map((translations) =>
          keys.map((key) => ({
            label: translations[key],
            value: key,
          })),
        ),
      ),
    ),
  );

  statusOptions$ = this.rawStatusOptions$.pipe(
    switchMap((keys) =>
      this.translateService.stream(keys).pipe(
        map((translations) =>
          keys.map((key) => ({
            label: translations[key],
            value: key,
          })),
        ),
      ),
    ),
  );

  nameFilterValue = signal<string>('');

  onNameFilterChange(
    value: string,
    filter: (value: string | null) => void,
  ): void {
    const next = value.trim();

    this.nameFilterValue.set(next);
    filter(next || null);
  }

  ngOnInit() {
    this.filterService.register(
      'translatedContains',
      (value: number, filter: string): boolean => {
        if (!filter) return true;
        if (value == null) return false;

        const name = this.getOccasionName(value).toLowerCase();
        return name.includes(String(filter).toLowerCase().trim());
      },
    );

    this.isLoading.set(false);

    this.loadOccasions();
  }

  onMultiFilterChange(
    value: string[] | null,
    selectedSignal: WritableSignal<string[]>,
    filter: (value: string[] | null) => void,
  ): void {
    console.log('selectedSignal', selectedSignal);
    const next = value ?? [];
    selectedSignal.set(next);
    filter(next.length ? next : null);
  }

  // Private: load occasions
  private loadOccasions(): void {
    this.isLoading.set(true);
    this.occasionService
      .getOccasions()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.allOccasions = res.data.occasions;
          this.filteredOccasions = [...res.data.occasions];

          this.rawDateOptions$.next(res.data.options.date);
          this.rawMonthOptions$.next(res.data.options.month);
          this.rawTypeOptions$.next(res.data.options.type);
          this.rawStatusOptions$.next(res.data.options.status);

          this.yearOptions = res.data.options.year;
          // this.options = res.data.options;
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OccasionsList',
            stage: 'loadOccasions',
          }),
      });
  }

  clear(dt: Table) {
    this.searchValue = '';
    dt.reset();
    this.selectedDates.set([]);
    this.selectedMonths.set([]);
    this.selectedYears.set([]);
    this.selectedTypes.set([]);
    this.selectedStatuses.set([]);
    this.nameFilterValue.set('');
    this.filteredOccasions = [...this.allOccasions];
  }

  getOccasionName(id: number) {
    const occasion = this.allOccasions.find((o) => o.id === id);
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

  customSort(event: SortEvent) {
    console.log('event', event);
    event.data?.sort((a: any, b: any) => {
      let value1;
      let value2;

      if (event.field === 'year') {
        value1 = a[event.field!];
        value2 = b[event.field!];
        return ((value1 ?? 0) - (value2 ?? 0)) * (event.order ?? 1);
      }

      if (event.field === 'name') {
        value1 = this.getOccasionName(a.id);
        value2 = this.getOccasionName(b.id);
      } else {
        value1 = a[event.field!]
          ? this.translateService.instant(a[event.field!])
          : null;
        value2 = b[event.field!]
          ? this.translateService.instant(b[event.field!])
          : null;
      }

      if (value1 == null && value2 == null) return 0;
      if (value1 == null) return (event.order ?? 1) * 1;
      if (value2 == null) return (event.order ?? 1) * -1;

      const result = String(value1).localeCompare(
        String(value2),
        this.translateService.getCurrentLang() || 'ru',
      );

      return (event.order ?? 1) * result;
    });
  }

  onSearch(value: string) {
    const query = value.toLowerCase().trim();

    if (!query) {
      this.filteredOccasions = [...this.allOccasions];
      return;
    }

    this.filteredOccasions = this.allOccasions.filter((o) => {
      const name = this.getOccasionName(o.id).toLowerCase();

      const type = this.translateService.instant(o.type).toLowerCase();

      const month = o.month
        ? this.translateService.instant(o.month).toLowerCase()
        : '';

      const year = String(o.year);

      const date = o.date
        ? this.translateService.instant(o.date).toLowerCase()
        : '';
      const status = this.translateService.instant(o.status).toLowerCase();

      return (
        name.includes(query) ||
        type.includes(query) ||
        month.includes(query) ||
        year.includes(query) ||
        date.includes(query) ||
        status.includes(query)
      );
    });
  }

  // Actions: open dialog → create occasion → reload

  onAddOccasionClick(): void {
    const dialogRef = this.dialog.open(CreateOccasionDialogComponent, {
      disableClose: true,
      minWidth: '400px',
      height: 'auto',
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((occasionName) => {
        if (occasionName) {
          this.loadOccasions();
        }
      });
  }

  onCloseOccasionClick(id: number): void {
    this.occasionService
      .editOccasionStatus(id, 2)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadOccasions();
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OccasionsList',
            stage: 'closeOccasion',
            occasionId: id,
          }),
      });
  }
  onOpenOccasionClick(id: number): void {
    this.occasionService
      .editOccasionStatus(id, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadOccasions();
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OccasionsList',
            stage: 'openOccasion',
            occasionId: id,
          }),
      });
  }

  onDeleteOccasionClick(occasion: Occasion) {
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'PRIME_CONFIRM.DELETE_ITEM_MESSAGE',
        {
          name: this.getOccasionName(occasion.id),
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
      accept: () => this.deleteOccasion(occasion.id),
    });
  }

  // Private: delete occasion
  private deleteOccasion(id: number): void {
    this.occasionService
      .deleteOccasion(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadOccasions();
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OccasionsList',
            stage: 'deleteOccasion',
            occasionId: id,
          }),
      });
  }
  //TODO:
  onOpenListClick(id: number): void {}
  onCreateListClick(id: number): void {}
  onCheckListClick(id: number): void {}
  onClearListClick(id: number): void {}
}
