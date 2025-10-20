import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../toponyms-list/toponyms-list.component';
import {
  ToponymProps,
  ToponymType,
  DefaultAddressParams,
  QueryParams,
} from '../../../interfaces/toponym';
import { ActivatedRoute } from '@angular/router';
import { toponymDraftSchema } from '@shared/schemas/toponym.schema';
import { zodValidator } from '../../../utils/zod-validator';

@Component({
  selector: 'app-districts-list',
  imports: [ToponymsListComponent],
  templateUrl: './districts-list.component.html',
  styleUrl: './districts-list.component.css',
})
export class DistrictsListComponent {
  private route = inject(ActivatedRoute);
  type: ToponymType = 'district';
  props: ToponymProps = {
    title: 'TOPONYM.TABLE_TITLE_DISTRICTS',
    displayedColumns: [
      'name',
      'shortName',
      'postName',
      'shortPostName',
      'region',
      'country',
      'actions',
    ],
    filename: 'template-districts.xlsx',
    isShowCountry: true,
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: false,
    queryParams: {
      countryId: 143,
      regionId: null,
      districtId: null,
      localityId: null,
      addressFilterString: 'Россия',
    },
    searchPlaceHolder: 'Белогорский',
    dialogProps: {
      creationTitle: 'TOPONYM.CREATION_TITLE_DISTRICT',
      viewTitle: 'TOPONYM.VIEW_TITLE_DISTRICT',
      controls: [
        {
          controlName: 'name',
          value: '',
          disabled: true,
          validators: [zodValidator(toponymDraftSchema.shape.name)],
          type: 'inputText',
          label: 'TOPONYM.LABEL_NAME',
          placeholder: 'Диксонский район',
          formType: 'formControl',
        },
        {
          controlName: 'shortName',
          value: '',
          disabled: true,
          validators: [zodValidator(toponymDraftSchema.shape.shortName)],
          type: 'inputText',
          label: 'TOPONYM.LABEL_SHORT_NAME',
          placeholder: 'Диксонский р-н',
          formType: 'formControl',
        },
        {
          controlName: 'postName',
          value: '',
          disabled: true,
          validators: [zodValidator(toponymDraftSchema.shape.postName)],
          type: 'inputText',
          label: 'TOPONYM.LABEL_POST_NAME',
          placeholder: 'Диксонский район',
          formType: 'formControl',
        },
        {
          controlName: 'shortPostName',
          value: '',
          disabled: true,
          validators: [zodValidator(toponymDraftSchema.shape.shortPostName)],
          type: 'inputText',
          label: 'TOPONYM.LABEL_SHORT_POST_NAME',
          placeholder: 'Диксонский р-н',
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
      ],
      addressFilterParams: {
        isShowCountry: true,
        isShowRegion: true,
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
