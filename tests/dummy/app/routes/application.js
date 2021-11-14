import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ApplicationRoute extends Route {
  @service renderStates;
  @action
  didTransition() {
    this.renderStates.resetRenderState();
  }
}
