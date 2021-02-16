import Controller from '@ember/controller';
import Participants from '../../constants/participants';
import Notes from '../../constants/notes';
import SpellWork from '../../constants/spellwork';
import StaticUrl from '../../constants/static-url';
import {
  set,
  get
} from '@ember/object';

export default Controller.extend({
  participantsList: null,
  spellWork: null,
  notes: '',
  init() {
    this._super(...arguments);
    this.set('getSpellWork', get(this, 'fetchSpellWork').bind(this));
    this.set('getNotes', get(this, 'fetchNotes').bind(this));
    this.set('getParticipants', get(this, 'fetchParticipants').bind(this));
  },
  fetchParticipants: async function () {
    let participants = await fetch(StaticUrl.mockURL500)
      .then(response => {
        return JSON.parse(response).participants
      })
      .catch( () =>  Participants);
    set(this, 'participantsList', participants);
    return participants;
  },
  fetchNotes: async function() {
    let notes = await fetch(StaticUrl.mockURL200)
      .then(response => {
        return JSON.parse(response).notes
      })
      .catch( () =>  Notes);
    set(this, 'notes', notes);
    return notes;
  },
  fetchSpellWork: async function () {
    let spellWork = await fetch(StaticUrl.mockURL500)
      .then(response => {
        return JSON.parse(response).spellWork
      })
      .catch( () =>  SpellWork);
    set(this, 'spellWork', spellWork);
    return spellWork;
  }
});
