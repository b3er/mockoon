import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, first, mergeMap } from 'rxjs/operators';
import { MainApi } from 'src/app/global';
import { Banner } from 'src/app/models/remote-config.model';
import { RemoteConfigService } from 'src/app/services/remote-config.service';
import { SettingsService } from 'src/app/services/settings.service';
import { Store } from 'src/app/stores/store';

@Component({
  selector: 'app-banner',
  templateUrl: 'banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannerComponent implements OnInit {
  public banner$: Observable<Banner>;

  constructor(
    private settingsService: SettingsService,
    private store: Store,
    private remoteConfigService: RemoteConfigService
  ) {}

  ngOnInit() {
    this.banner$ = this.store.select('settings').pipe(
      filter(Boolean),
      first(),
      mergeMap(() => this.remoteConfigService.get('banner')),
      filter(
        (banner) =>
          banner.enabled &&
          !this.store.get('settings').bannerDismissed.includes(banner.id)
      )
    );
  }

  /**
   * Open banner link
   */
  public openLink(banner: Banner) {
    MainApi.send('APP_OPEN_EXTERNAL_LINK', banner.link);
  }

  /**
   * Dismiss banner and save it to the settings
   */
  public dismissBanner(banner: Banner) {
    banner.enabled = false;

    this.settingsService.updateSettings({
      bannerDismissed: [
        ...this.store.get('settings').bannerDismissed,
        banner.id
      ]
    });
  }
}
