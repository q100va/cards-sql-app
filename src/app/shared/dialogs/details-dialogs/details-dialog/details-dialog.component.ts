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
  Inject,
  runInInjectionContext
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { DETAILS_COMPONENT_REGISTRY } from './details-component-registry';
import { DialogData } from '../../../../interfaces/dialog-props';
import { BaseModel } from '../../../../interfaces/base-model';
import { BaseDetailsComponent } from '../base-details/base-details.component';

@Component({
  selector: 'app-details-dialog',
  standalone: true,
  imports: [
    MatGridListModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    ConfirmDialogModule,
    ToastModule,
  ],
providers: [],
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
  private confirmationService = inject(ConfirmationService);

  readonly isEditMode = signal<boolean>(false);
  readonly changes = signal<boolean>(false);
  readonly isSaveDisabled = signal<boolean>(true);

  readonly componentType = DETAILS_COMPONENT_REGISTRY[this.data.componentType];

  readonly customInjector: Injector = Injector.create({
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: this.data },
      { provide: MatDialogRef, useValue: this.dialogRef },
    ],
    parent: inject(Injector),
  });

  instance!: BaseDetailsComponent<T>;
  readonly dataSignal = signal(this.data);

  title =
    this.data.operation === 'create'
      ? this.data.creationTitle
      : this.data.viewTitle;

      constructor(@Inject(Injector) private injector: Injector) {}


  ngAfterViewInit(): void {

    const component = this.componentType as unknown as Type<BaseDetailsComponent<T>>;
    const componentRef = this.container.createComponent(component, {
      injector: this.customInjector,
    });
    this.instance = componentRef.instance;
    (this.instance as any).data = this.dataSignal;
    runInInjectionContext(this.injector, () => {
    effect(() => {
      this.changes.set(this.instance.changesSignal());
    });

    effect(() => {
      this.isEditMode.set(this.instance.isEditModeSignal());
    });

    effect(() => {
      this.isSaveDisabled.set(this.instance.IsSaveDisabledSignal());
    });

    effect(() => {
      const name = this.instance.closeDialogDataSignal();
      if (name) {
        this.closeDialog(name);
      }
    });
  });
  }

  getChildInstance(): BaseDetailsComponent<T> {
    return this.instance;
  }

  onSaveClick(action: 'justSave' | 'saveAndExit') {
    this.getChildInstance()?.onSaveClick(action);
  }

  onEditClick() {
    console.log('onEditClick', )
    this.getChildInstance()?.onEditClick();
  }

  onViewClick() {
    this.getChildInstance()?.onViewClick();
  }
//TODO: не успевает проверять, если изменить поле и нажать кросс надо проверять дерти
  onCancelClick(event: Event) {
    if (
      (this.data.operation === 'view-edit' && !this.isEditMode()) ||
      (this.isEditMode() && !this.changes())
    ) {
      this.dialogRef.close({ name: null });
    } else {
      this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: 'Вы уверены, что хотите выйти без сохранения?',
        header: 'Предупреждение',
        closable: true,
        closeOnEscape: true,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
          label: 'Нет',
        },
        acceptButtonProps: {
          label: 'Да',
          severity: 'secondary',
          outlined: true,
        },
        accept: () => {
          this.dialogRef.close({ name: null });
        },
        reject: () => {},
      });
    }
  }

  closeDialog(data: string) {
    this.dialogRef.close({ name: data });
  }
}
