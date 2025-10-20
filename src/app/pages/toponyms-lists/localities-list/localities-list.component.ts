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
  selector: 'app-localities-list',
  imports: [ToponymsListComponent],
  templateUrl: './localities-list.component.html',
  styleUrl: './localities-list.component.css',
})
export class LocalitiesListComponent {
  private route = inject(ActivatedRoute);
  type: ToponymType = 'locality';
  props: ToponymProps = {
    title: 'TOPONYM.TABLE_TITLE_LOCALITIES',
    displayedColumns: [
      'name',
      'shortName',
      'district',
      'region',
      'country',
      'actions',
    ],
    isShowCountry: true,
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: true,
    queryParams: {
      countryId: 143,
      regionId: null,
      districtId: null,
      localityId: null,
      addressFilterString: 'Россия',
    },
    searchPlaceHolder: 'Лихоборы или Малаховка Московская',
    filename: 'template-localities.xlsx',
    dialogProps: {
      creationTitle: 'TOPONYM.TABLE_TITLE_DISTRICTS',
      viewTitle: 'TOPONYM.TABLE_TITLE_DISTRICTS',
      controls: [
        {
          controlName: 'name',
          value: '',
          disabled: true,
          validators: [zodValidator(toponymDraftSchema.shape.name)],
          type: 'inputText',
          label: 'TOPONYM.LABEL_NAME',
          placeholder: 'Синицыно поселок',
          formType: 'formControl',
        },
        {
          controlName: 'shortName',
          value: '',
          disabled: true,
          validators: [zodValidator(toponymDraftSchema.shape.shortName)],
          type: 'inputText',
          label: 'TOPONYM.LABEL_SHORT_NAME',
          placeholder: 'п. Синицыно',
          formType: 'formControl',
        },
        {
          controlName: 'isFederalCity',
          value: false,
          disabled: true,
          type: 'checkbox',
          label: 'TOPONYM.FEDERAL_CITY',
          formType: 'formControl',
        },
        {
          controlName: 'isCapitalOfRegion',
          value: false,
          disabled: true,
          type: 'checkbox',
          label: 'TOPONYM.REGION_CAPITAL',
          formType: 'formControl',
        },
        {
          controlName: 'isCapitalOfDistrict',
          value: false,
          disabled: true,
          type: 'checkbox',
          label: 'TOPONYM.DISTRICT_CAPITAL',
          formType: 'formControl',
        },
      ],
      checkingName: 'name',
      addressFilterControls: [
        {
          addressFilterProp: 'countries',
          toponymProp: 'countryId',
        },
        {
          addressFilterProp: 'regions',
          toponymProp: 'regionId',
        },
        {
          addressFilterProp: 'districts',
          toponymProp: 'districtId',
        },
      ],
      addressFilterParams: {
        isShowCountry: true,
        isShowRegion: true,
        isShowDistrict: true,
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
