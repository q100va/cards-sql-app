import {
  Component,
  AfterViewInit,
  ViewChild,
  ViewContainerRef,
  effect,
  inject,
  Injector,
  signal,
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
import { BaseDetailsComponent } from '../base-details/base-details.component';

import { TranslateModule } from '@ngx-translate/core';
import { HasOpDirective } from '../../../../directives/has-op.directive';

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

  private instance!: BaseDetailsComponent<T>;
  readonly dataSignal = signal(this.data);

  // choose title once (create/view)
  title =
    this.data.operation === 'create'
      ? this.data.creationTitle
      : this.data.viewTitle;

  constructor(private injector: Injector) {}

  ngAfterViewInit(): void {
    // create details component dynamically into <ng-template #container>
    const component = this.componentType as unknown as Type<
      BaseDetailsComponent<T>
    >;
    const componentRef = this.container.createComponent(component, {
      injector: this.customInjector,
    });
    this.instance = componentRef.instance;

    // pass DialogData as a signal to child (keeps reactivity if you update data later)
    (this.instance as any).data = this.dataSignal;

    // Bridge child signals → dialog signals
    runInInjectionContext(this.injector, () => {
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

  private getChild(): BaseDetailsComponent<T> {
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
