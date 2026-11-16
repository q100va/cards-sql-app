import {
  Component,
  AfterViewInit,
  ViewChild,
  ViewContainerRef,
  effect,
  inject,
  Injector,
  signal,
  Signal,
  Type,
  runInInjectionContext,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProgressSpinner } from 'primeng/progressspinner';

import {
  DETAILS_COMPONENT_REGISTRY,
  PERMISSIONS_COMPONENT_REGISTRY,
} from './details-component-registry';
import { DialogData } from '../../../../interfaces/dialog-props';
import { BaseModel } from '../../../../interfaces/base-model';

import { TranslateModule } from '@ngx-translate/core';
import { HasOpDirective } from '../../../../directives/has-op.directive';

interface DetailsHostContract {
  readonly showSpinner: Signal<boolean>;
  readonly changesSignal: Signal<boolean>;
  readonly isEditModeSignal: Signal<boolean>;
  readonly IsSaveDisabledSignal: Signal<boolean>;
  readonly closeDialogDataSignal: Signal<string | false | null>;
  onSaveClick(action: 'justSave' | 'saveAndExit'): void;
  onEditClick(): void;
  onViewClick(): void;
  onCancelClick(): void;
}

@Component({
  selector: 'app-details-dialog',
  standalone: true,
  imports: [
    MatGridListModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    TranslateModule,
    ProgressSpinner,
    HasOpDirective,
  ],
  templateUrl: './details-dialog.component.html',
  styleUrl: './details-dialog.component.css',
})
export class DetailsDialogComponent<T extends BaseModel>
  implements AfterViewInit
{
  @ViewChild('container', { read: ViewContainerRef })
  container!: ViewContainerRef;

  private readonly dialogRef = inject(MatDialogRef<DetailsDialogComponent<T>>);
  readonly data = inject<DialogData<T>>(MAT_DIALOG_DATA);

  // UI state signals (mirrored from child)
  readonly isEditMode = signal<boolean>(false);
  readonly changes = signal<boolean>(false); //TODO: delete?
  readonly isSaveDisabled = signal<boolean>(true);
  readonly showSpinner = signal<boolean>(true);

  // pick component class from registry by type
  readonly componentType = DETAILS_COMPONENT_REGISTRY[this.data.componentType];
  permissions = PERMISSIONS_COMPONENT_REGISTRY[this.data.componentType];

  // child injector so the nested component sees MAT_DIALOG_DATA / MatDialogRef
  readonly customInjector: Injector = Injector.create({
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: this.data },
      { provide: MatDialogRef, useValue: this.dialogRef },
    ],
    parent: inject(Injector),
  });

  private instance!: DetailsHostContract;
  readonly dataSignal = signal(this.data);

  // choose title once (create/view)
  title =
    this.data.operation === 'create'
      ? this.data.creationTitle
      : this.data.viewTitle;

  constructor(private injector: Injector) {}

  ngAfterViewInit(): void {
    // create details component dynamically into <ng-template #container>
    const component: Type<DetailsHostContract> = this.componentType;
    const componentRef = this.container.createComponent(component, {
      injector: this.customInjector,
    });
    this.instance = componentRef.instance;

    componentRef.setInput('data', this.dataSignal());

    runInInjectionContext(this.injector, () => {
      effect(() => componentRef.setInput('data', this.dataSignal()));

      // Bridge child signals → dialog signals
      effect(() => this.showSpinner.set(this.instance.showSpinner()));
      effect(() => this.changes.set(this.instance.changesSignal()));//TODO: delete?
      effect(() => this.isEditMode.set(this.instance.isEditModeSignal()));
      effect(() =>
        this.isSaveDisabled.set(this.instance.IsSaveDisabledSignal())
      );
      effect(() => {
        const closing = this.instance.closeDialogDataSignal();
        if (closing !== null) this.closeDialog(closing);
      });
    });
  }

  private getChild(): DetailsHostContract {
    return this.instance;
  }

  // Toolbar actions simply proxy to child
  onSaveClick(action: 'justSave' | 'saveAndExit') {
    this.getChild().onSaveClick(action);
  }
  onEditClick() {
    this.getChild().onEditClick();
  }
  onViewClick() {
    this.getChild().onViewClick();
  }
  onCancelClick() {
    this.getChild().onCancelClick();
  }

  // Close dialog; map true → null name per current semantics
  private closeDialog(data: string | boolean) {
    this.dialogRef.close({ refresh: !!data });
  }
}
