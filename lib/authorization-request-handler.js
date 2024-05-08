import { __awaiter } from 'tslib';
import {
  AuthorizationRequestHandler,
  BasicQueryStringUtils,
  DefaultCrypto,
  AuthorizationRequest,
  AuthorizationError,
  AuthorizationResponse,
} from '@openid/appauth';
/** key for authorization request. */
const authorizationRequestKey = (handle) => {
  return `${handle}_appauth_authorization_request`;
};
/** key in local storage which represents the current authorization request. */
const AUTHORIZATION_REQUEST_HANDLE_KEY = 'appauth_current_authorization_request';
export const AUTHORIZATION_RESPONSE_KEY = 'auth_response';
export class IonicAuthorizationRequestHandler extends AuthorizationRequestHandler {
  constructor(browser, storage, crypto = new DefaultCrypto(), utils = new BasicQueryStringUtils()) {
    super(utils, crypto);
    this.browser = browser;
    this.storage = storage;
  }
  performAuthorizationRequest(configuration, request) {
    return __awaiter(this, void 0, void 0, function* () {
      const handle = this.crypto.generateRandom(10);
      yield this.storage.setItem(AUTHORIZATION_REQUEST_HANDLE_KEY, handle);
      yield this.storage.setItem(authorizationRequestKey(handle), JSON.stringify(yield request.toJson()));
      const url = this.buildRequestUrl(configuration, request);
      const returnedUrl = yield this.browser.showWindow(url, request.redirectUri);
      //callback may come from showWindow or via another method
      if (returnedUrl != undefined) {
        yield this.storage.setItem(AUTHORIZATION_RESPONSE_KEY, returnedUrl);
        this.completeAuthorizationRequestIfPossible();
      }
    });
  }
  completeAuthorizationRequest() {
    return __awaiter(this, void 0, void 0, function* () {
      const handle = yield this.storage.getItem(AUTHORIZATION_REQUEST_HANDLE_KEY);
      if (!handle) {
        throw new Error('Handle Not Available');
      }
      const request = this.getAuthorizationRequest(yield this.storage.getItem(authorizationRequestKey(handle)));
      const queryParams = this.getQueryParams(yield this.storage.getItem(AUTHORIZATION_RESPONSE_KEY));
      this.removeItemsFromStorage(handle);
      const state = queryParams['state'];
      const error = queryParams['error'];
      if (state !== request.state) {
        throw new Error('State Does Not Match');
      }
      return {
        request: request,
        response: !error ? this.getAuthorizationResponse(queryParams) : undefined,
        error: error ? this.getAuthorizationError(queryParams) : undefined,
      };
    });
  }
  getAuthorizationRequest(authRequest) {
    if (authRequest == null) {
      throw new Error('No Auth Request Available');
    }
    return new AuthorizationRequest(JSON.parse(authRequest), this.crypto);
  }
  getAuthorizationError(queryParams) {
    const authorizationErrorJSON = {
      error: queryParams['error'],
      error_description: queryParams['error_description'],
      error_uri: undefined,
      state: queryParams['state'],
    };
    return new AuthorizationError(authorizationErrorJSON);
  }
  getAuthorizationResponse(queryParams) {
    const authorizationResponseJSON = {
      code: queryParams['code'],
      state: queryParams['state'],
    };
    return new AuthorizationResponse(authorizationResponseJSON);
  }
  removeItemsFromStorage(handle) {
    this.storage.removeItem(AUTHORIZATION_REQUEST_HANDLE_KEY);
    this.storage.removeItem(authorizationRequestKey(handle));
    this.storage.removeItem(AUTHORIZATION_RESPONSE_KEY);
  }
  getQueryParams(authResponse) {
    if (authResponse != null) {
      const querySide = authResponse.split('#')[0];
      const parts = querySide.split('?');
      if (parts.length !== 2) throw new Error('Invalid auth response string');
      const hash = parts[1];
      return this.utils.parseQueryString(hash);
    } else {
      return {};
    }
  }
}
