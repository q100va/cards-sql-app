import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../../interfaces/dialog-props';
import { ActivatedRoute } from '@angular/router';
import { ToponymType } from '../../../interfaces/address-filter';
import { DefaultAddressParams } from '../../../interfaces/address-filter';
import { Validators } from '@angular/forms';

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
    title: 'Районы/округа',
    displayedColumns: [
      'name',
      'shortName',
      'postName',
      'shortPostName',
      'region',
      'country',
      'actions',
    ],
    filename: 'шаблон-районы-округа.xlsx',
    isShowCountry: true,
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: false,
    defaultCountryId: 143,
    defaultRegionId: null,
    defaultDistrictId: null,
    defaultLocalityId: null,
    queryParams: null,
    searchPlaceHolder: 'Белогорский',
    dialogProps: {
      creationTitle: 'Новый р-н/округ',
      viewTitle: 'Район/округ',
      controls: [
        {
          controlName: 'name',
          value: null,
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Название',
          placeholder: 'Диксонский район',
          formType: 'formControl',
        },
        {
          controlName: 'shortName',
          value: null,
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Краткое название',
          placeholder: 'Диксонский р-н',
          formType: 'formControl',
        },
        {
          controlName: 'postName',
          value: null,
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Почтовое название',
          placeholder: 'Диксонский район',
          formType: 'formControl',
        },
        {
          controlName: 'shortPostName',
          value: null,
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Краткое почтовое название',
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
      this.props.queryParams = params as DefaultAddressParams;
    });
  }
}
