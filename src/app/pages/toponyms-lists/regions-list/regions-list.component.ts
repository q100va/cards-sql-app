import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../toponyms-list/toponyms-list.component';
import {
  ToponymProps,
  ToponymType,
  QueryParams,
} from '../../../interfaces/toponym';
import { ActivatedRoute } from '@angular/router';
import { toponymDraftSchema } from '@shared/schemas/toponym.schema';
import { zodValidator } from '../../../utils/zod-validator';

@Component({
  selector: 'app-regions-list',
  imports: [ToponymsListComponent],
  templateUrl: './regions-list.component.html',
  styleUrl: './regions-list.component.css',
})
export class RegionsListComponent {
  private route = inject(ActivatedRoute);
  type: ToponymType = 'region';
  props: ToponymProps = {
    title: 'TOPONYM.TABLE_TITLE_REGIONS',
    displayedColumns: ['name', 'shortName', 'country', 'actions'],
    isShowCountry: true,
    isShowRegion: true,
    isShowDistrict: false,
    isShowLocality: false,
    searchPlaceHolder: 'Тульская',
    queryParams: {
      countryId: 143,
      regionId: null,
      districtId: null,
      localityId: null,
      addressFilterString: 'Россия',
    },
    filename: 'template-regions.xlsx',

    dialogProps: {
      creationTitle: 'TOPONYM.CREATION_TITLE_REGION',
      viewTitle: 'TOPONYM.VIEW_TITLE_REGION',
      controls: [
        {
          controlName: 'name',
          value: '',
          disabled: true,
          validators: [zodValidator(toponymDraftSchema.shape.name)],
          type: 'inputText',
          label: 'TOPONYM.LABEL_NAME',
          placeholder: 'Читинская область',
          formType: 'formControl',
        },
        {
          controlName: 'shortName',
          value: '',
          disabled: true,
          validators: [zodValidator(toponymDraftSchema.shape.shortName)],
          type: 'inputText',
          label: 'TOPONYM.LABEL_SHORT_NAME',
          placeholder: 'Читинская обл.',
          formType: 'formControl',
        },
      ],
      checkingName: 'name',
      addressFilterControls: [
        {
          addressFilterProp: 'countries',
          toponymProp: 'countryId',
        },
      ],
      addressFilterParams: {
        isShowCountry: true,
        isShowRegion: false,
        isShowDistrict: false,
        isShowLocality: false,
      },
      object: null,
      componentType: 'toponym',
    },
  };

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if(Object.keys(params).length != 0 ) this.props.queryParams = params as QueryParams;
    });
  }
}
