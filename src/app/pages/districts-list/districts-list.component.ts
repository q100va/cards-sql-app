import { Component, inject } from '@angular/core';
import { ToponymsListComponent } from '../../shared/toponyms-list/toponyms-list.component';
import { ToponymProps } from '../../interfaces/toponym-props';
import { ActivatedRoute } from '@angular/router';
import { GeographyLevels } from '../../interfaces/types';
import { DefaultAddressParams } from '../../interfaces/default-address-params';
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
          type: 'input',
          label: 'Название',
          placeHolder: 'Диксонский район',
        },
        {
          controlName: 'shortName',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'input',
          label: 'Краткое название',
          placeHolder: 'Диксонский р-н',
        },
        {
          controlName: 'postName',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'input',
          label: 'Почтовое название',
          placeHolder: 'Диксонский район',
        },
        {
          controlName: 'shortPostName',
          value: '',
          disabled: true,
          validators: [Validators.required],
          type: 'input',
          label: 'Краткое почтовое название',
          placeHolder: 'Диксонский р-н',
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
        type: this.type,
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
