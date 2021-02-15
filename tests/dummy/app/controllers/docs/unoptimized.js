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
    let participants;
    try {
      let data = await fetch(StaticUrl.mockURL500);
      participants = JSON.parse(data).notes;
    } catch (error) {
      participants = Participants;
    } finally {
      set(this, 'participantsList', participants);
      // eslint-disable-next-line no-unsafe-finally
      return participants;
    }
  },
  fetchNotes: async function() {
    let notes;
    try {
      let data = await fetch(StaticUrl.mockURL200);
      notes = JSON.parse(data).notes;
    } catch (error) {
      notes = Notes;
    } finally {
      set(this, 'notes', notes);
      // eslint-disable-next-line no-unsafe-finally
      return notes;
    }
  },
  fetchSpellWork: async function () {
    let spellWork;
    try {
      let data = await fetch(StaticUrl.mockURL500);
      spellWork = JSON.parse(data).spellWork;
    } catch (error) {
      spellWork = SpellWork;
    } finally {
      set(this, 'spellWork', spellWork);
      // eslint-disable-next-line no-unsafe-finally
      return spellWork;
    }
  }
});
