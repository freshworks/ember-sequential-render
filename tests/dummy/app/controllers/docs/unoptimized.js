import Controller from '@ember/controller';
import Participants from '../../constants/participants';
import Notes from '../../constants/notes';
import SpellWork from '../../constants/spellwork';
import StaticUrl from '../../constants/static-url';

export default class UnoptimizedController extends Controller {
  participantsList = null;
  spellWork = null;
  notes = '';
  constructor() {
    super(...arguments);
    this.getSpellWork = this.fetchSpellWork.bind(this);
    this.getNotes = this.fetchNotes.bind(this);
    this.getParticipants = this.fetchParticipants.bind(this);
  }
  async fetchParticipants() {
    let participants = await fetch(StaticUrl.mockURL500)
      .then((response) => {
        return JSON.parse(response).participants;
      })
      .catch(() => Participants);
    this.participantsList = participants;
    return participants;
  }
  async fetchNotes() {
    let notes = await fetch(StaticUrl.mockURL200)
      .then((response) => {
        return JSON.parse(response).notes;
      })
      .catch(() => Notes);
    this.notes = notes;
    return notes;
  }
  async fetchSpellWork() {
    let spellWork = await fetch(StaticUrl.mockURL500)
      .then((response) => {
        return JSON.parse(response).spellWork;
      })
      .catch(() => SpellWork);
    this.spellWork = spellWork;
    return spellWork;
  }
}
