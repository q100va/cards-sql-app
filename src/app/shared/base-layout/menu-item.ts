import { MatMenu } from "@angular/material/menu";


export class MenuItem {

  constructor(
    public dataCy: string,
    public icon: string,
    public text: string,
    public link: string,
    public subMenuItems?: MenuItem[]){
  }


}
