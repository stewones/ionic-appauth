import { __awaiter } from 'tslib';
import { BasicQueryStringUtils } from '@openid/appauth';
export class IonicEndSessionHandler {
  constructor(browser, utils = new BasicQueryStringUtils()) {
    this.browser = browser;
    this.utils = utils;
  }
  performEndSessionRequest(configuration, request) {
    return __awaiter(this, void 0, void 0, function* () {
      const url = this.buildRequestUrl(configuration, request);
      return this.browser.showWindow(url, request.postLogoutRedirectURI);
    });
  }
  buildRequestUrl(configuration, request) {
    const requestMap = {
      id_token_hint: request.idTokenHint,
      post_logout_redirect_uri: request.postLogoutRedirectURI,
      state: request.state,
    };
    const query = this.utils.stringify(requestMap);
    const baseUrl = configuration.endSessionEndpoint;
    const url = `${baseUrl}?${query}`;
    return url;
  }
}
