import { MatMenu } from "@angular/material/menu";


export class MenuItem {

  constructor(
    public icon: string,
    public text: string,
    public link: string,
    public subMenuItems?: MenuItem[]){
  }


}
