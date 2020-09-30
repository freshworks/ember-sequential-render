import Controller from '@ember/controller';
import { task, timeout } from 'ember-concurrency';

export default Controller.extend({
  testTaskDelay: task(function* () {
    yield timeout(2000);
    return 'test task';
  }),
});
