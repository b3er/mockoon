import { MainAPI } from 'src/app/models/main-api.model';

declare global {
  interface Window {
    api: MainAPI;
  }
}

export const MainApi: MainAPI = window.api;
