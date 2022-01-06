import Route from '@ember/routing/route';
import { setProperties } from '@ember/object';
import RSVP from 'rsvp';

export default class UnoptimizedRoute extends Route {
  model() {
    // eslint-disable-next-line ember/no-controller-access-in-routes
    let controller = this.controllerFor('docs.unoptimized');
    return RSVP.hash({
      spellWork: controller.fetchSpellWork(),
      participants: controller.fetchParticipants(),
      notes: controller.fetchNotes(),
    });
  }

  resetController(controller, isExiting) {
    if (isExiting) {
      setProperties(controller, {
        spellWork: undefined,
        notes: undefined,
        participantsList: undefined,
      });
    }
  }
}
