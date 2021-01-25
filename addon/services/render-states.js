/*
  Priorities can be skipped and rendered for feature based sections
*/

/**
  A service to control the render states of the application.
  It maintains the render queue and the available priorities.

  @class render-states
  @service
  @public
*/

import { isPresent, isEmpty } from '@ember/utils';
import { A } from '@ember/array';
import Service from '@ember/service';
import {
  getProperties,
  setProperties,
  get,
  set
} from '@ember/object';
import {
  RENDER_PRIORITY,
  RENDER_STATE_CHANGE_EVENT
} from '../constants/render-states';
import Evented from '@ember/object/evented';
import { later, cancel } from '@ember/runloop';

const { critical: CRITICAL_RENDER_STATE, secondary: MAX_RENDER_PRIORITY } = RENDER_PRIORITY;

export default Service.extend(Evented, {
  renderState: CRITICAL_RENDER_STATE,
  maxRenderPriority: MAX_RENDER_PRIORITY,

  /**
    * Flag to denote if the postrender callback has been executed.
    *
    * @field renderLater
    * @type boolean
    * @public
  */
  renderLater: false,

  postRenderCallback: null,

  init() {
    this._super(...arguments);
    this._resetProperties();
  },

  _resetProperties() {
    setProperties(this, {
      renderQueue: {},
      availablePriorities: A(),
      scheduledCalls: {}
    })
  },

  updateMaxRenderPriority(state) {
    let maxRenderPriority = get(this, 'maxRenderPriority');

    set(this, 'maxRenderPriority', Math.max(maxRenderPriority, state));
  },

  /**
   * This can be used to reset the render state during transitions.
      
    In routes/application.js,

    ```
    renderStates: service(),
    actions: {
      didTransition() {
        get(this, 'renderStates').resetRenderState();
      }
    }
    ```
    @method resetRenderState
    @public
  */
  resetRenderState() {
    let scheduledCalls = get(this, 'scheduledCalls');
    Object.values(scheduledCalls).forEach(call => cancel(call));
    this._resetProperties();
    setProperties(this, {
      maxRenderPriority: MAX_RENDER_PRIORITY,
      // We need't trigger state change for reset. It should be handled through the context change.
      renderState: CRITICAL_RENDER_STATE 
    });
  },
  modifyRenderState(state) {
    let {
      maxRenderPriority,
      availablePriorities,
      renderState
    } = getProperties(this, 'maxRenderPriority', 'availablePriorities', 'renderState');
    let isMaxPriority = (state > maxRenderPriority);

    if (availablePriorities.includes(state) || isMaxPriority) {
      if (state > renderState && !this.isDestroyed && !this.isDestroying) {
        this.triggerRenderStateChange(state);
        if (isMaxPriority) {
          this.performOncePostRender();
        }
      }
    } else {
      this.modifyRenderState(state + 1);
    }
  },

  addToQueue(priority, taskName) {
    let renderQueue = get(this, 'renderQueue');
    let priorityQueue = renderQueue[priority] || A();

    priorityQueue.addObject(taskName);
    renderQueue[priority] = priorityQueue;
  },

  removeFromQueue(priority, taskName) {
    let renderQueue = get(this, 'renderQueue');
    let priorityQueue = renderQueue[priority] || A();

    priorityQueue.removeObject(taskName);

    return isEmpty(priorityQueue);
  },

  removeFromQueueAndModifyRender(priority, taskName) {
    let modifyState = this.removeFromQueue(priority, taskName);

    if (modifyState) {
      this.modifyRenderState(priority + 1);
    }
  },

  /**
   * This can be used to listen to any changes in the app renderState.
      
    In routes/application.js,

    ```
    renderStates: service(),
    setupController(controller) {
      get(this, 'renderStates').on('renderStateModified', this.debugRenderEvent.bind(this));
    }
    ```

    @method renderStateModified
    @param {number} options.renderState The current priority being rendered in the application.
  */
  triggerRenderStateChange(state) {
    set(this, 'renderState', state);
    this.trigger(RENDER_STATE_CHANGE_EVENT, { renderState: state });
  },

  isAssignableTask(priority, taskName) {
    let { renderQueue, availablePriorities } = getProperties(this, 'renderQueue', 'availablePriorities');
    let priorityQueue = renderQueue[priority] || A();

    availablePriorities.addObject(priority);
    return isPresent(taskName) && !priorityQueue.includes(taskName);
  },
  
  /**
   * This can be used to bind post render callbacks, if any, for the app.
   * This will be executed once after the highest priority item is rendered.
   * This also allows for a fallback timeout, after which the callback is executed irrespective of any state.
      
    In routes/application.js,

    ```
    renderStates: service(),
    setupController(controller) {
      get(this, 'renderStates').registerPostRenderCallback(this._postRenderCallback.bind(this), FALLBACK_TIMEOUT);
    }
    ```
    @method registerPostRenderCallback
    @public
    @param {function} callback Callback function to be executed once post render.
    @param {number} fallbackTimeout time in milliseconds after which the callback will be executed irrespective of the current render state.

  */
  registerPostRenderCallback(callback, fallbackTimeout) {
    set(this, 'postRenderCallback', callback);
    if (isPresent(fallbackTimeout)) {
      later(() => {
        this.performOncePostRender();
      }, fallbackTimeout);
    }
  },

  /**
    performOncePostRender is called after the highest priority item is rendered for the first time
      or after a given timeout as fallback.

    @method performOncePostRender
    @private

  */
  performOncePostRender() {
    if (!get(this, 'renderLater')) {
      set(this, 'renderLater', true);
      let postRenderCallback = get(this, 'postRenderCallback');

      if (isPresent(postRenderCallback)) {
        postRenderCallback();
      }
    }
  }
});
