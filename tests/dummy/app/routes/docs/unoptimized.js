import Route from '@ember/routing/route';
import { setProperties } from '@ember/object';
import RSVP from 'rsvp';

export default Route.extend({
  model() {
    let controller = this.controllerFor('docs.unoptimized');
    return RSVP.hash({
      spellWork: controller.fetchSpellWork.perform(),
      participants: controller.fetchParticipants.perform(),
      notes: controller.fetchNotes.perform()
    });
  },
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
