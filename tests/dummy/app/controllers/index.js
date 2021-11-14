import Controller from '@ember/controller';
import { timeout } from 'ember-concurrency';

export default class ApplicationController extends Controller {
  async testTaskDelay() {
    await timeout(2000);
    return 'test task';
  }
}
