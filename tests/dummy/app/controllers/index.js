import { timeout } from 'ember-concurrency';
import Controller from './docs/unoptimized';

export default class ApplicationController extends Controller {
  async testTaskDelay() {
    await timeout(2000);
    return 'test task';
  }
}
