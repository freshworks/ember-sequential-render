import Controller from '@ember/controller';
import { task } from 'ember-concurrency';
import Participants from '../../constants/participants';
import Notes from '../../constants/notes';
import SpellWork from '../../constants/spellwork';
import StaticUrl from '../../constants/static-url';
import {
  set
} from '@ember/object';

export default Controller.extend({
  participantsList: null,
  spellWork: null,
  notes: '',
  fetchParticipants: task(function* () {
    let participants = yield fetch(StaticUrl.mockURL500)
      .then((response) => {
        return JSON.parse(response).participants;
      })
      .catch(() => Participants)
    set(this, 'participantsList', participants);
    return participants;
  }),
  fetchNotes: task(function* () {
    let notes = yield fetch(StaticUrl.mockURL200)
      .then((response) => {
        return JSON.parse(response).notes;
      })
      .catch(() => Notes);
    set(this, 'notes', notes);
    return notes;
  }),
  fetchSpellWork: task(function* () {
    let spellWork = yield fetch(StaticUrl.mockURL500)
      .then((response) => {
        return JSON.parse(response).spellWork;
      })
      .catch(() => SpellWork)
    set(this, 'spellWork', spellWork);
    return spellWork;
  })
});
