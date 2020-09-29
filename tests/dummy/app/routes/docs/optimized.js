import Route from '@ember/routing/route';
import { setProperties } from '@ember/object';

export default Route.extend({
  resetController(controller, isExiting) {
    if (isExiting) {
      setProperties(controller, {
        'spellWork': undefined,
        'notes': undefined,
        'participantsList': undefined
      });
    }
  },
})
