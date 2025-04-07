import { Component } from '@angular/core';
import { ToponymsListComponent } from '../../shared/toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../interfaces/toponym-props';
import { GeographyLevels } from '../../interfaces/types';

@Component({
  selector: 'app-countries-list',
  imports: [ToponymsListComponent],
  templateUrl: './countries-list.component.html',
  styleUrl: './countries-list.component.css',
})
export class CountriesListComponent {
  type: GeographyLevels = 'country';
  props: ToponymProps = {
    title: 'Страны',
    displayedColumns: ['name', 'actions'],
    isShowCountry: true,
    isShowRegion: false,
    isShowDistrict: false,
    isShowLocality: false,
    defaultCountryId: null,
    defaultRegionId: null,
    defaultDistrictId: null,
    defaultLocalityId: null,
    queryParams: null,
    filename: 'шаблон-страны.xlsx',
    creationTitle: 'Новая страна',
    viewTitle: 'Страна',
    searchPlaceHolder: 'Беларусь',
    namePlaceHolder: 'Лапландия',
    shortNamePlaceHolder: '',
    postNamePlaceHolder: '',
    shortPostNamePlaceHolder: '',

  };


}
