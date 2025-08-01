import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../../interfaces/dialog-props';
import { ActivatedRoute } from '@angular/router';
import { ToponymType } from '../../../interfaces/types';
import { DefaultAddressParams } from '../../../interfaces/default-address-params';
import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

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
    title: 'Населенные пункты',
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
    defaultCountryId: 143,
    defaultRegionId: null,
    defaultDistrictId: null,
    defaultLocalityId: null,
    queryParams: null,
    searchPlaceHolder: 'Лихоборы или Малаховка Московская',
    filename: 'шаблон-населенные-пункты.xlsx',
    dialogProps: {
      creationTitle: 'Новый насел. пункт',
      viewTitle: 'Населенный пункт',
      controls: [
        {
          controlName: 'name',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Название',
          placeholder: 'Синицыно поселок',
          formType: 'formControl',
        },
        {
          controlName: 'shortName',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Краткое название',
          placeholder: 'п. Синицыно',
          formType: 'formControl',
        },
        {
          controlName: 'isFederalCity',
          value: false,
          disabled: true,
          type: 'checkbox',
          label: 'Федеральный город',
          formType: 'formControl',
        },
        {
          controlName: 'isCapitalOfRegion',
          value: false,
          disabled: true,
          type: 'checkbox',
          label: 'Столица региона',
          formType: 'formControl',
        },
        {
          controlName: 'isCapitalOfDistrict',
          value: false,
          disabled: true,
          type: 'checkbox',
          label: 'Столица округа',
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
      this.props.queryParams = params as DefaultAddressParams;
    });
  }
}
