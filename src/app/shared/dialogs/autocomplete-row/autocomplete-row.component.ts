import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { AsyncPipe } from '@angular/common';
import { Observable, combineLatest } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  filter,
} from 'rxjs/operators';
import { RelationPick } from '../../../interfaces/advanced-model';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-autocomplete-row',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    AsyncPipe,
    MatIconModule,
    TranslateModule,
    MatButtonModule,
    MatGridListModule,
  ],
  templateUrl: './autocomplete-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutocompleteRowComponent implements OnInit {
    readonly translateService = inject(TranslateService);
  ctrl = input.required<FormControl<RelationPick | null>>();
  showDeleteButton = input.required<boolean>();
  label = input.required<string>();
  relationPickList$ = input.required<Observable<RelationPick[]>>();
  minLength = 0;
  filtered$!: Observable<RelationPick[]>;
  //showHint$!: Observable<boolean>;
  index = input<number>(0);
  delete = output<number>();
  selectOption = output<RelationPick | null>();
  homeStatus = '';

  ngOnInit(): void {
    /*  if (this.ctrl().value) {
      this.setHomeStatusValue(this.ctrl().value as RelationPick);
    }
    console.log('this.homeStatus', this.homeStatus); */
    const q$ = this.ctrl().valueChanges.pipe(
      startWith(this.ctrl().value),
      debounceTime(200),
      map((v) => (typeof v === 'string' ? v : (v?.name ?? ''))),
      map((s) => s.trim().toLowerCase()),
      distinctUntilChanged(),
    );

    // this.showHint$ = q$.pipe(map((q) => q.length < this.minLength));

    this.filtered$ = combineLatest([this.relationPickList$(), q$]).pipe(
      map(([list, q]) => {
        if (q.length < this.minLength) return [];
        return list.filter((c) => c.name.toLowerCase().includes(q));
      }),
    );
    /* if (this.ctrl().value && typeof this.ctrl().value !== 'string') {
      this.setHomeStatusValue(this.ctrl().value as RelationPick);
    }
    console.log('this.ctrl().value', this.ctrl().value); */
  }

  onDeleteClick() {
    this.delete.emit(this.index());
  }

  onSelectOption(e: MatAutocompleteSelectedEvent) {
    console.log('this.ctrl().value', e.option.value);
    this.selectOption.emit(e.option.value as RelationPick);
    //  this.setHomeStatusValue(e.option.value as RelationPick);
   // console.log('this.ctrl().value', this.ctrl().value);
  }

 /*  setHomeStatusValue(value: RelationPick) {
    if (this.hasIsRestricted(value)) {
      this.homeStatus = value.isClose
        ? 'TABLE.NOTES.CLOSE'
        : value.isRestricted
          ? 'TABLE.NOTES.DEACTIVATED'
          : 'TABLE.NOTES.ACTIVE';
    }
  }
  hasIsRestricted(obj: unknown): obj is { isRestricted: boolean } {
    return !!obj && typeof obj === 'object' && 'isRestricted' in obj;
  } */
  /*   onSelectOption() {
    console.log('this.ctrl().value', this.ctrl().value);
    this.selectOption.emit(this.ctrl().value);
  } */

  display = (v: RelationPick | string | null): string =>
    !v ? '' : typeof v === 'string' ? v : v.name +
  (v.homeStatus ? (' - ' + (this.translateService.instant(v.homeStatus))) : '');
}
