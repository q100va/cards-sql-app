import { Component } from '@angular/core';
import { ToponymsListComponent } from '../toponyms-list/toponyms-list.component';
import { ToponymProps, ToponymType } from '../../../interfaces/toponym';
import { toponymDraftSchema } from '@shared/schemas/toponym.schema';
import { zodValidator } from '../../../utils/zod-validator';

@Component({
  selector: 'app-countries-list',
  imports: [ToponymsListComponent],
  templateUrl: './countries-list.component.html',
  styleUrl: './countries-list.component.css',
})
export class CountriesListComponent {
  type: ToponymType = 'country';
  props: ToponymProps = {
    title: 'TOPONYM.TABLE_TITLE_COUNTRIES',
    displayedColumns: ['name', 'actions'],
    isShowCountry: true,
    isShowRegion: false,
    isShowDistrict: false,
    isShowLocality: false,
    searchPlaceHolder: 'Беларусь',
    queryParams: {
      countryId: null,
      regionId: null,
      districtId: null,
      localityId: null,
      addressFilterString: '',
    },
    filename: 'template-countries.xlsx',

    dialogProps: {
      creationTitle: 'TOPONYM.CREATION_TITLE_COUNTRY',
      viewTitle: 'TOPONYM.VIEW_TITLE_COUNTRY',
      controls: [
        {
          controlName: 'name',
          value: '',
          disabled: true,
          validators: [zodValidator(toponymDraftSchema.shape.name)], // [Validators.required],
          type: 'inputText',
          label: 'TOPONYM.LABEL_NAME',
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
      object: null,
      componentType: 'toponym',
    },
  };
}
