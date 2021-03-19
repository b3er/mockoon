import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { spawn } from 'child_process';
import { remote } from 'electron';
import {
  createWriteStream,
  existsSync,
  NoParamCallback,
  rename,
  unlink
} from 'fs';
import { get as requestGet } from 'request';
import { BehaviorSubject } from 'rxjs';
import { gt as semverGt } from 'semver';
import { Logger } from 'src/app/classes/logger';
import { Config } from 'src/app/config';
import { MainApi } from 'src/app/global';

/**TODO
 * Auto update for windows (with temp file and old update file deletion)
 * Download trigger for mac and linux
 *
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private tempUpdateFileName = 'update.download';
  private updateFileName = {
    win32: 'mockoon.setup.%v%.exe',
    darwin: 'mockoon.setup.%v%.dmg',
    linux: 'mockoon-%v%-x86_64.AppImage'
  };
  private updateAvailable$: BehaviorSubject<boolean> = new BehaviorSubject(
    false
  );
  private nextVersion: string;
  private nextVersionFileName: string;
  private userDataPath = remote.app.getPath('userData') + '/';
  private logger = new Logger('[SERVICE][UPDATE]');
  private platform = ''; // TODO

  constructor(private http: HttpClient) {
    // always remove temp file
    this.removeTempFile();

    if (
      this.platform === 'darwin' ||
      this.platform === 'linux' ||
      this.platform === 'win32'
    ) {
      // request Github latest release data (avoid cache with headers)
      this.http
        .get<any>(Config.githubLatestReleaseUrl, {
          headers: new HttpHeaders({
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
          })
        })
        .subscribe((githubRelease) => {
          // check if version is ahead and trigger something depending on platform (semver automatically strip 'v')
          if (semverGt(githubRelease.tag_name, Config.appVersion)) {
            this.nextVersion = githubRelease.tag_name.replace('v', '');

            // only trigger download for windows, for other just inform
            if (this.platform === 'win32') {
              this.nextVersionFileName = this.updateFileName[
                this.platform
              ].replace('%v%', this.nextVersion);
              // if already have an update file
              if (existsSync(this.userDataPath + this.nextVersionFileName)) {
                this.updateAvailable$.next(true);
              } else {
                this.fileDownload(
                  `${Config.githubBinaryDownloadUrl}${githubRelease.tag_name}/${this.nextVersionFileName}`,
                  this.userDataPath,
                  this.nextVersionFileName,
                  () => {
                    this.updateAvailable$.next(true);
                  }
                );
              }
            } else {
              this.updateAvailable$.next(true);
            }

            this.logger.info(`An update is available ${this.nextVersion}`);
          } else {
            this.removeOldUpdate();
          }
        });
    }
  }

  /**
   * Expose available update subject
   */
  public updateAvailable() {
    return this.updateAvailable$.asObservable();
  }

  /**
   * Launch setup file and close the application
   */
  public applyUpdate() {
    if (this.nextVersion) {
      // launch exe detached and close app
      if (this.platform === 'win32') {
        spawn(this.userDataPath + this.nextVersionFileName, ['--updated'], {
          detached: true,
          stdio: 'ignore'
        }).unref();
        remote.app.quit();
      } else if (this.platform === 'darwin' || this.platform === 'linux') {
        MainApi.send(
          'APP_OPEN_EXTERNAL_LINK',
          `${Config.githubTagReleaseUrl}${this.nextVersion}`
        );
      }
    }
  }

  /**
   * Generic file downloader
   */
  private fileDownload(
    url: string,
    destination: string,
    filename: string,
    callback: NoParamCallback
  ) {
    const file = createWriteStream(destination + this.tempUpdateFileName);

    requestGet(url)
      .pipe(file)
      .on('error', () => {
        unlink(destination + this.tempUpdateFileName, () => {});
      })
      .on('finish', () => {
        // rename when successful
        rename(
          destination + this.tempUpdateFileName,
          destination + filename,
          callback
        );
      });
  }

  /**
   * Remove update file corresponding to current version (for win only)
   */
  private removeOldUpdate() {
    if (this.platform === 'win32') {
      unlink(
        this.userDataPath +
          this.updateFileName[this.platform].replace('%v%', Config.appVersion),
        () => {}
      );
    }
  }

  /**
   * Remove the temporary update.download file (for win only)
   */
  private removeTempFile() {
    if (this.platform === 'win32') {
      unlink(this.userDataPath + this.tempUpdateFileName, () => {});
    }
  }
}
