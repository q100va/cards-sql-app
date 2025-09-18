// app/directives/has-op.directive.ts
import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { AuthService } from '../services/auth.service';

type OperationCode = string;

interface HasOpContext {
  $implicit: boolean; // = can
  can: boolean;
  disabled: boolean;
}
interface Params {
  codes: OperationCode[];
  mode: 'any' | 'all';
}

@Directive({ selector: '[hasOp]', standalone: true })
export class HasOpDirective {
  private readonly tpl = inject<TemplateRef<HasOpContext>>(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  private codes: OperationCode[] = [];
  private mode: 'any' | 'all' = 'any';
  private elseTpl: TemplateRef<any> | null = null;
  private viewCreated = false;
  private ctx: HasOpContext = { $implicit: false, can: false, disabled: false };

  constructor() {
    effect(() => {
      this.auth.permissions$(); // реагируем на обновление прав
      this.render();
    });
  }

  /** Один код: *hasOp="'EDIT_USER'" */
  @Input('hasOp') set hasOpInput(params: Params) {
    this.mode = params.mode;
    this.codes = params.codes ?? [];
    this.render();
  }

  /** Все коды: *hasOpAll="['VIEW_USER','EDIT_USER']" */
/*   @Input() set hasOpAll(codes: OperationCode[]) {
    this.codes = codes ?? [];
    this.mode = 'all';
    this.render();
  } */

  /** Альтернативный шаблон: *hasOp="'EDIT_USER'; else noAccess" */
  @Input() set hasOpElse(tpl: TemplateRef<any> | null) {
    this.elseTpl = tpl;
    this.render();
  }

  private computeCan(): boolean {
    if (this.codes.length === 0) return true;
    const has = (op: OperationCode) => this.auth.has(op);
    return this.mode === 'all' ? this.codes.every(has) : this.codes.some(has);
  }

  private render() {
    const can = this.computeCan();
    this.ctx.$implicit = can;
    this.ctx.can = can;
    this.vcr.clear();
    this.viewCreated = false;

    if (can) {
      this.vcr.createEmbeddedView(this.tpl, this.ctx);
      this.viewCreated = true;
    } else if (this.elseTpl) {
      this.vcr.createEmbeddedView(this.elseTpl);
      this.viewCreated = true;
    }
  }
}
/* Примеры использования в шаблоне:

<!-- Показать кнопку только если есть EDIT_USER; прокинуть disabled из прав -->
<button *hasOp="'EDIT_USER'; let disabled=disabled" [disabled]="disabled">
  Edit user
</button>

<!-- Требуются обе операции -->
<div *hasOpAll="['VIEW_USER','EDIT_USER']; else noPerms">
  <!-- защищённый блок -->
</div>
<ng-template #noPerms><p>Недостаточно прав</p></ng-template>


Директива standalone — просто добавь её в imports компонента:

@Component({ standalone: true, imports: [CommonModule, HasOpDirective], ... }) */
