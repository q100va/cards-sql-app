import { MatMenu } from '@angular/material/menu';

/* export class MenuItem {
  constructor(
    public perms: string[],
    public mode: 'any' | 'all',
    public dataCy: string,
    public icon: string,
    public text: string,
    public link: string,
    public subMenuItems?: MenuItem[]
  ) {}
} */

export type Item = {
  params: {
    codes: string[];
    mode: 'any' | 'all';
  };
  dataCy: string;
  icon: string;
  text: string;
  link: string;
};

export type Menu = {
  params: {
    codes: string[];
    mode: 'any' | 'all';
  };
  dataCy: string;
  icon: string;
  text: string;
  link: string;
  subMenuItems?: Item[];
}[];
