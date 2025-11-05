import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appBlurOnClick]'
})
export class BlurOnClickDirective {
  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('pointerup', ['$event'])
  onPointerUp() {
    this.el.nativeElement.blur();
  }

  @HostListener('click', ['$event'])
  onClick(ev: MouseEvent) {
    if (ev.detail > 0) {
      this.el.nativeElement.blur();
    }
  }
}
