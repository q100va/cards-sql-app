import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../../interfaces/toponym-props';
import { ActivatedRoute } from '@angular/router';
import { GeographyLevels } from '../../../interfaces/types';
import { DefaultAddressParams } from '../../../interfaces/default-address-params';
import { Validators } from '@angular/forms';

@Component({
  selector: 'app-districts-list',
  imports: [ToponymsListComponent],
  templateUrl: './districts-list.component.html',
  styleUrl: './districts-list.component.css',
})
export class DistrictsListComponent {
  private route = inject(ActivatedRoute);
  type: GeographyLevels = 'district';
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
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Название',
          placeholder: 'Диксонский район',
          formType: 'formControl',
        },
        {
          controlName: 'shortName',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Краткое название',
          placeholder: 'Диксонский р-н',
          formType: 'formControl',
        },
        {
          controlName: 'postName',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'inputText',
          label: 'Почтовое название',
          placeholder: 'Диксонский район',
          formType: 'formControl',
        },
        {
          controlName: 'shortPostName',
          value: '',
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
          toponymProp: 'region.country.id',
        },
        {
          addressFilterProp: 'regions',
          toponymProp: 'region.id',
        },
      ],
      addressFilterParams: {

        isShowCountry: true,
        isShowRegion: true,
        isShowDistrict: false,
        isShowLocality: false,
      },
    },
  };

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.props.queryParams = params as DefaultAddressParams | null;
    });
  }
}
