import Controller from '@ember/controller';
import { timeout } from 'ember-concurrency';

export default Controller.extend({
  testTaskDelay: async function () {
    await timeout(2000);
    return 'test task';
  }
});
