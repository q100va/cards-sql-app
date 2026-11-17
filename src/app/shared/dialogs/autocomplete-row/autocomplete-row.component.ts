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
  index = input<number>(0);
  delete = output<number>();
  selectOption = output<RelationPick | null>();

  ngOnInit(): void {
    const q$ = this.ctrl().valueChanges.pipe(
      startWith(this.ctrl().value),
      debounceTime(200),
      map((v) => (typeof v === 'string' ? v : (v?.name ?? ''))),
      map((s) => s.trim().toLowerCase()),
      distinctUntilChanged(),
    );


    this.filtered$ = combineLatest([this.relationPickList$(), q$]).pipe(
      map(([list, q]) => {
        if (q.length < this.minLength) return [];
        return list.filter((c) => c.name.toLowerCase().includes(q));
      }),
    );
  }

  onDeleteClick() {
    this.delete.emit(this.index());
  }

  onSelectOption(e: MatAutocompleteSelectedEvent) {
    this.selectOption.emit(e.option.value as RelationPick);
  }


  display = (v: RelationPick | string | null): string =>
    !v ? '' : typeof v === 'string' ? v : v.name +
  (v.homeStatus ? (' - ' + (this.translateService.instant(v.homeStatus))) : '');
}
