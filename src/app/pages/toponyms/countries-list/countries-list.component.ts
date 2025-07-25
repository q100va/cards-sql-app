import { Component } from '@angular/core';
import { ToponymsListComponent } from '../toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../../interfaces/toponym-props';
import { GeographyLevels } from '../../../interfaces/types';
import { Validators } from '@angular/forms';

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
    searchPlaceHolder: 'Беларусь',
    queryParams: null,
    filename: 'шаблон-страны.xlsx',
    defaultCountryId: null,
    defaultRegionId: null,
    defaultDistrictId: null,
    defaultLocalityId: null,
    dialogProps: {
      creationTitle: 'Новая страна',
      viewTitle: 'Страна',
      controls: [
        {
          controlName: 'name',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Название',
          placeholder: 'Лапландия',
          formType: 'formControl',
        },
      ],
      checkingName: 'name',
      addressFilterParams: {
        isShowCountry: false,
        isShowRegion: false,
        isShowDistrict: false,
        isShowLocality: false,
      },
    },
  };
}
