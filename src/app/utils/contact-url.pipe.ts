// src/app/pages/users-list/pipes/contact-url.pipe.ts
import { Pipe, PipeTransform, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
@Pipe({ name: 'contactUrl', standalone: true, pure: true })
export class ContactUrlPipe implements PipeTransform {
  transform(value: string, type: string): string {
    if (!value) return '';
    switch (type) {
      case 'vKontakte': return `https://vk.com/${value}`;
      case 'instagram': return `https://www.instagram.com/${value}`;
      case 'facebook':  return `https://www.facebook.com/${value}`;
      default:          return value;
    }
  }
}
