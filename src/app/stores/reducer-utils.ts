import {
  Environment,
  GetRouteResponseContentType,
  Route
} from '@mockoon/commons';
import { GetEditorModeFromContentType } from 'src/app/libs/utils.lib';
import { DuplicatedRoutesTypes, StoreType } from 'src/app/stores/store';

/**
 * Return a Set of the duplicated route UUIDs in an environment
 *
 * @param environment
 */
const ListDuplicatedRouteUUIDs = (environment: Environment): Set<string> => {
  const duplicates = new Set<string>();

  environment.routes.forEach((route: Route, routeIndex: number) => {
    environment.routes.forEach((otherRoute: Route, otherRouteIndex: number) => {
      if (
        otherRouteIndex > routeIndex &&
        otherRoute.endpoint === route.endpoint &&
        otherRoute.method === route.method
      ) {
        duplicates.add(otherRoute.uuid);
      }
    });
  });

  return duplicates;
};

/**
 * Return the body editor "mode" from the currently selected env / route response
 *
 * @param state
 */
export const getBodyEditorMode = (state: StoreType) => {
  const currentEnvironment = state.environments.find(
    (environment) => environment.uuid === state.activeEnvironmentUUID
  );
  const currentRoute =
    currentEnvironment &&
    currentEnvironment.routes.find(
      (route) => route.uuid === state.activeRouteUUID
    );
  const currentRouteResponse =
    currentEnvironment &&
    currentRoute &&
    currentRoute.responses.find(
      (response) => response.uuid === state.activeRouteResponseUUID
    );

  if (!currentEnvironment || !currentRoute || !currentRouteResponse) {
    return 'text';
  }

  const routeResponseContentType = GetRouteResponseContentType(
    currentEnvironment,
    currentRouteResponse
  );

  return GetEditorModeFromContentType(routeResponseContentType);
};

/**
 * List duplicated environments (sharing same port)
 *
 * @param state
 */
export const updateDuplicatedEnvironments = (state: StoreType): Set<string> => {
  const duplicatedEnvironmentsUUIDs = new Set<string>();

  state.environments.forEach((environment, environmentIndex) => {
    // extract all environments with same port than current one
    state.environments.forEach(
      (otherEnvironment: Environment, otherEnvironmentIndex: number) => {
        if (
          otherEnvironmentIndex > environmentIndex &&
          otherEnvironment.port === environment.port
        ) {
          duplicatedEnvironmentsUUIDs.add(otherEnvironment.uuid);
        }
      }
    );
  });

  return duplicatedEnvironmentsUUIDs;
};

/**
 * List duplicated routes per environment (sharing same endpoint and method)
 *
 * @param state
 */
export const updateDuplicatedRoutes = (
  state: StoreType
): DuplicatedRoutesTypes => {
  const duplicatedRoutes: DuplicatedRoutesTypes = {};

  state.environments.forEach((environment) => {
    duplicatedRoutes[environment.uuid] = ListDuplicatedRouteUUIDs(environment);
  });

  return duplicatedRoutes;
};
