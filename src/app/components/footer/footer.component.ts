import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { Store } from 'src/app/stores/store';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent implements OnInit {
  public updateAvailable$: Observable<boolean>;
  public platform = '';
  public appClosing$: Observable<boolean>;

  constructor(
    /* private updateService: UpdateService, */ private store: Store
  ) {}

  ngOnInit() {
    //this.updateAvailable$ = this.updateService.updateAvailable();
    this.appClosing$ = this.store.select('uiState').pipe(pluck('appClosing'));
  }

  /**
   * Apply the update
   */
  public applyUpdate() {
    // TODO
    //this.updateService.applyUpdate();
  }
}
