export class getListOfRegions {
  constructor() {
    if (this.form.controls['country'].value) {
      this.addressService
        .getListOfRegionsOfCountries([this.form.controls['country'].value.id])
        .subscribe({
          next: (res) => {
            this.regionsList = res.data;
            if (this.regionsList && this.regionsList.length > 0) {
              this.form.get('region')?.enable();
            } else {
              this.form.get('region')?.disable();
            }
          },
          error: (err) => this.errorService.handle(err)
        });
    } else {
      this.form.get('region')?.disable();
    }
    this.form.get('region')?.setValue(null);
    this.form.get('district')?.disable();
    this.form.get('district')?.setValue(null);
    this.form.get('locality')?.disable();
    this.form.get('locality')?.setValue(null);
    this.chosenCountry.set(this.form.controls['country'].value);
  }
}
