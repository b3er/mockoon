import { Injectable } from '@angular/core';
import {
  Environment,
  Environments,
  Export,
  ExportData,
  ExportDataEnvironment,
  ExportDataRoute,
  Route
} from '@mockoon/commons';
import { cloneDeep } from 'lodash';
import { Logger } from 'src/app/classes/logger';
import { Config } from 'src/app/config';
import { AnalyticsEvents } from 'src/app/enums/analytics-events.enum';
import { Errors } from 'src/app/enums/errors.enum';
import { MainApi } from 'src/app/global';
import { OldExport } from 'src/app/models/data.model';
import { DataService } from 'src/app/services/data.service';
import { EventsService } from 'src/app/services/events.service';
import { MigrationService } from 'src/app/services/migration.service';
import { OpenAPIConverterService } from 'src/app/services/openapi-converter.service';
import { SchemasBuilderService } from 'src/app/services/schemas-builder.service';
import { ToastsService } from 'src/app/services/toasts.service';
import { addEnvironmentAction, addRouteAction } from 'src/app/stores/actions';
import { Store } from 'src/app/stores/store';

// Last migration done for each version
const oldVersionsMigrationTable = {
  '1.4.0': 5,
  '1.5.0': 6,
  '1.5.1': 7,
  '1.6.0': 8
};

@Injectable({ providedIn: 'root' })
export class ImportExportService extends Logger {
  private logger = new Logger('[SERVICE][IMPORT-EXPORT]');

  constructor(
    protected toastService: ToastsService,
    private store: Store,
    private eventsService: EventsService,
    private dataService: DataService,
    private migrationService: MigrationService,
    private schemasBuilderService: SchemasBuilderService,
    private openAPIConverterService: OpenAPIConverterService
  ) {
    super('[SERVICE][IMPORT-EXPORT]', toastService);
  }

  /**
   * Export all envs in a json file
   */
  public async exportAllEnvironments() {
    const environments = this.store.get('environments');

    if (environments.length === 0) {
      return;
    }

    this.logger.info('Exporting all environments to a file');

    const filePath = await this.openSaveDialog('Export all to JSON');

    // clone environments before exporting
    const dataToExport = cloneDeep(environments);

    // dialog not cancelled
    if (filePath) {
      try {
        await this.exportDataToFilePath(dataToExport, filePath);
        this.logMessage('info', 'EXPORT_SUCCESS');

        this.eventsService.analyticsEvents.next(AnalyticsEvents.EXPORT_FILE);
      } catch (error) {
        this.toastService.addToast('error', Errors.EXPORT_ERROR);
      }
    }
  }

  /**
   * Export active env in a json file
   */
  public async exportActiveEnvironment() {
    const activeEnvironment = this.store.getActiveEnvironment();

    if (!activeEnvironment) {
      return;
    }

    this.logger.info('Exporting active environment to a file');

    const filePath = await this.openSaveDialog('Export current to JSON');

    // clone environment before exporting
    const dataToExport = cloneDeep(activeEnvironment);

    // dialog not cancelled
    if (filePath) {
      try {
        await this.exportDataToFilePath(dataToExport, filePath);
        this.logMessage('info', 'EXPORT_SELECTED_SUCCESS');

        this.eventsService.analyticsEvents.next(
          AnalyticsEvents.EXPORT_FILE_SELECTED
        );
      } catch (error) {
        this.toastService.addToast('error', Errors.EXPORT_ERROR);
      }
    }
  }

  /**
   * Export an environment to the clipboard
   *
   * @param environmentUUID
   */
  public exportEnvironmentToClipboard(environmentUUID: string) {
    this.logger.info(
      `Exporting environment ${environmentUUID} to the clipboard`
    );

    const environment = this.store.getEnvironmentByUUID(environmentUUID);

    try {
      // reset environment before exporting
      MainApi.send(
        'APP_WRITE_CLIPBOARD',
        this.prepareExport({
          data: cloneDeep(environment),
          subject: 'environment'
        })
      );

      this.logMessage('info', 'EXPORT_ENVIRONMENT_CLIPBOARD_SUCCESS');

      this.eventsService.analyticsEvents.next(AnalyticsEvents.EXPORT_CLIPBOARD);
    } catch (error) {
      this.logger.error(
        `Error while exporting environment ${environmentUUID} to the clipboard: ${error.message}`
      );

      this.toastService.addToast(
        'error',
        Errors.EXPORT_ENVIRONMENT_CLIPBOARD_ERROR
      );
    }
  }

  /**
   * Export a route from the active environment to the clipboard
   *
   * @param routeUUID
   */
  public exportRouteToClipboard(routeUUID: string) {
    this.logger.info(`Exporting route ${routeUUID} to the clipboard`);

    const environment = this.store.getActiveEnvironment();

    try {
      MainApi.send(
        'APP_WRITE_CLIPBOARD',
        this.prepareExport({
          data: cloneDeep(
            environment.routes.find((route) => route.uuid === routeUUID)
          ),
          subject: 'route'
        })
      );
      this.logMessage('info', 'EXPORT_ROUTE_CLIPBOARD_SUCCESS');
      this.eventsService.analyticsEvents.next(AnalyticsEvents.EXPORT_CLIPBOARD);
    } catch (error) {
      this.logger.error(
        `Error while exporting route ${routeUUID} to the clipboard: ${error.message}`
      );

      this.toastService.addToast('error', Errors.EXPORT_ROUTE_CLIPBOARD_ERROR);
    }
  }

  /**
   * Load data from JSON file and import
   */
  public async importFromFile() {
    this.logger.info('Importing from file');

    const dialogResult = await MainApi.invoke('APP_SHOW_OPEN_DIALOG', {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      title: 'Import from file (JSON)'
    });

    if (dialogResult.filePaths && dialogResult.filePaths[0]) {
      try {
        const fileContent = await MainApi.invoke(
          'APP_READ_FILE',
          dialogResult.filePaths[0]
        );

        const importedData: Export & OldExport = JSON.parse(fileContent);

        this.import(importedData);

        this.eventsService.analyticsEvents.next(AnalyticsEvents.IMPORT_FILE);
      } catch (error) {
        this.logger.error(`Error while importing from file: ${error.message}`);
        this.toastService.addToast('error', Errors.IMPORT_ERROR);
      }
    }
  }

  /**
   * Load data from clipboard and import
   */
  public async importFromClipboard() {
    this.logger.info('Importing from clipboard');

    try {
      const importedData: Export & OldExport = JSON.parse(
        await MainApi.invoke('APP_READ_CLIPBOARD')
      );

      this.import(importedData);

      this.eventsService.analyticsEvents.next(AnalyticsEvents.IMPORT_CLIPBOARD);
    } catch (error) {
      this.logger.info(
        `Error while importing from clipboard: ${error.message}`
      );

      this.toastService.addToast('error', Errors.IMPORT_CLIPBOARD_ERROR);
    }
  }

  /**
   * Import an OpenAPI (v2/v3) file in Mockoon's format.
   * Append imported envs to the env array.
   */
  public async importOpenAPIFile() {
    this.logger.info('Importing OpenAPI file');

    const dialogResult = await MainApi.invoke('APP_SHOW_OPEN_DIALOG', {
      filters: [{ name: 'OpenAPI v2/v3', extensions: ['yaml', 'json'] }]
    });

    if (dialogResult.filePaths && dialogResult.filePaths[0]) {
      const environment = await this.openAPIConverterService.import(
        dialogResult.filePaths[0]
      );

      if (environment) {
        this.store.update(addEnvironmentAction(environment));

        this.eventsService.analyticsEvents.next(AnalyticsEvents.IMPORT_FILE);
      }
    }
  }

  /**
   * Export all environments to an OpenAPI v3 file
   */
  public async exportOpenAPIFile() {
    const activeEnvironment = this.store.getActiveEnvironment();

    if (!activeEnvironment) {
      return;
    }

    this.logger.info('Exporting to OpenAPI file');

    const filePath = await this.openSaveDialog('Export all to JSON');

    // dialog not cancelled
    if (filePath) {
      try {
        await MainApi.invoke(
          'APP_WRITE_FILE',
          filePath,
          this.openAPIConverterService.export(activeEnvironment)
        );

        this.logMessage('info', 'EXPORT_SUCCESS');
        this.eventsService.analyticsEvents.next(AnalyticsEvents.EXPORT_FILE);
      } catch (error) {
        this.logger.info(
          `Error while exporting to OpenAPI file: ${error.message}`
        );

        this.toastService.addToast('error', Errors.EXPORT_ERROR);
      }
    }
  }

  /**
   * Writes JSON data to the specified filePath in Mockoon format.
   *
   * @param dataToExport
   * @param filePath
   */
  private async exportDataToFilePath(dataToExport, filePath) {
    try {
      await MainApi.invoke(
        'APP_WRITE_FILE',
        filePath,
        this.prepareExport({ data: dataToExport, subject: 'environment' })
      );
    } catch (error) {
      this.logger.error(`Error while exporting environments: ${error.message}`);

      this.toastService.addToast('error', Errors.EXPORT_ERROR);
    }
  }

  /**
   * Wrap data to export in Mockoon export format
   *
   * @param data
   * @param subject
   */
  private prepareExport(
    params:
      | {
          data: Environment | Environments;
          subject: 'environment';
        }
      | {
          data: Route;
          subject: 'route';
        }
  ): string {
    let dataToExport: ExportData = [];

    const data: (Environment | Route)[] = Array.isArray(params.data)
      ? params.data
      : [params.data];

    dataToExport = data.map((dataItem) => {
      // erase UUID to easier sharing
      dataItem =
        params.subject === 'environment'
          ? this.dataService.renewEnvironmentUUIDs(
              dataItem as Environment,
              true
            )
          : this.dataService.renewRouteUUIDs(dataItem as Route, true);

      return {
        type: params.subject,
        item: dataItem
      } as ExportDataRoute | ExportDataEnvironment;
    });

    return JSON.stringify(
      {
        source: `mockoon:${Config.appVersion}`,
        data: dataToExport
      } as Export,
      null,
      4
    );
  }

  /**
   * Import and migrate data
   * Routes are not migrated, and a version check is done before importing
   *
   * @param importedData
   */
  private import(importedData: Export & OldExport) {
    const dataToImport: Export = this.convertOldExports(importedData);

    if (!dataToImport) {
      return;
    }

    const dataToImportVersion: string = dataToImport.source.split(':')[1];

    dataToImport.data.forEach((data) => {
      if (data.type === 'environment') {
        this.migrationService
          .migrateEnvironments([data.item])
          .subscribe(([migratedEnvironment]) => {
            migratedEnvironment = this.dataService.renewEnvironmentUUIDs(
              migratedEnvironment
            );
            this.logger.info(
              `Importing environment ${migratedEnvironment.uuid}`
            );

            this.store.update(addEnvironmentAction(migratedEnvironment));
          });
      } else if (
        // routes cannot be migrated yet so we check the appVersion
        data.type === 'route' &&
        dataToImportVersion === Config.appVersion
      ) {
        data.item = this.dataService.renewRouteUUIDs(data.item);

        this.logger.info(`Importing route ${data.item.uuid}`);

        // if has a current environment append imported route
        if (this.store.get('activeEnvironmentUUID')) {
          this.store.update(addRouteAction(data.item));
        } else {
          const newEnvironment: Environment = {
            ...this.schemasBuilderService.buildEnvironment(),
            routes: [data.item]
          };

          this.store.update(addEnvironmentAction(newEnvironment));
        }
      } else if (dataToImportVersion !== Config.appVersion) {
        this.logger.info(
          `Route ${data.item.uuid} has incorrect version ${dataToImportVersion} and cannot be imported`
        );

        this.toastService.addToast(
          'warning',
          Errors.IMPORT_INCOMPATIBLE_VERSION.replace(
            '{fileVersion}',
            dataToImportVersion
          )
        );
      }
    });
  }

  /**
   * Convert importedData from older versions if needed
   *
   * @param importedData
   */
  private convertOldExports(importedData: OldExport & Export): Export {
    if (
      importedData.id &&
      importedData.id === 'mockoon_export' &&
      importedData.appVersion
    ) {
      const oldImportedData: OldExport = importedData;
      const convertedData: Export = {
        source: `mockoon:${oldImportedData.appVersion}`,
        data: []
      };

      if (oldImportedData.subject === 'environment') {
        (oldImportedData.data as Environment).lastMigration =
          oldVersionsMigrationTable[oldImportedData.appVersion];

        convertedData.data = [
          { type: 'environment', item: oldImportedData.data as Environment }
        ];
      } else if (oldImportedData.subject === 'route') {
        convertedData.data = [
          { type: 'route', item: oldImportedData.data as Route }
        ];
      } else {
        convertedData.data = (oldImportedData.data as Environments).map(
          (importedItem) => {
            importedItem.lastMigration =
              oldVersionsMigrationTable[oldImportedData.appVersion];

            return { type: 'environment', item: importedItem };
          }
        );
      }

      return convertedData;
    } else {
      return importedData as Export;
    }
  }

  /**
   * Open the save dialog
   */
  private async openSaveDialog(title: string): Promise<string | null> {
    const dialogResult = await MainApi.invoke('APP_SHOW_SAVE_DIALOG', {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      title
    });

    if (dialogResult.canceled) {
      return null;
    }

    return dialogResult.filePath;
  }
}
