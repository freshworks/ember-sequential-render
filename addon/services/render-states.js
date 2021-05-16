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

  /**
   * @private
   * @function _resetProperties
   * @description Resets all queues and states
   */
  _resetProperties() {
    setProperties(this, {
      renderQueue: {},
      availablePriorities: A(),
      scheduledCalls: {},
      maxRenderPriority: MAX_RENDER_PRIORITY,
      renderState: CRITICAL_RENDER_STATE
    })
  },

  _clearScheduledCalls() {
    let scheduledCalls = get(this, 'scheduledCalls');
    Object.values(scheduledCalls).forEach(call => cancel(call));
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
    this._clearScheduledCalls();
    this._resetProperties();
    this.triggerRenderStateChange(CRITICAL_RENDER_STATE);
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

  /**
   * @function addScheduledCall
   * @description Adds new entry to scheduledCalls property in {taskName: function(){}} format.
   * @param {String} taskName - The name of the task to be added.
   * @param {function} funtionReference - The scheduled function reference for the taskName.
   */
  addScheduledCall(taskName, funtionReference) {
    let scheduledCalls = get(this, 'scheduledCalls');
    scheduledCalls[taskName] = funtionReference;
  },

  /**
   * @function removeScheduledCall
   * @description Removes the entry from scheduledCalls property.
   * @param {String} taskName - The name of the task to be removed
   */
  removeScheduledCall(taskName) {
    let scheduledCalls = get(this, 'scheduledCalls');
    delete scheduledCalls[taskName];
  },

  addAssignableToQueue(priority, taskName) {
    this.updateMaxRenderPriority(priority);
    this.availablePriorities.addObject(priority);
    this.addToQueue(priority, taskName)
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
      this.modifyRenderState(this.renderState + 1);
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
    let renderQueue = get(this, 'renderQueue');
    let priorityQueue = renderQueue[priority] || A();

    return isPresent(taskName) && !priorityQueue.includes(taskName);
  },

  isPresentInQueue(priority, taskName) {
    let renderQueue = get(this, 'renderQueue');
    let priorityQueue = renderQueue[priority] || A();

    return isPresent(taskName) && priorityQueue.includes(taskName);
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
