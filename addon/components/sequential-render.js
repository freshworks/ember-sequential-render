/*
  1. Both 'renderPriority' and 'taskName' are mandatory.
      taskName: A unique idetifier, app wide, to maintain the render queue.
      renderPriority: Numeric determinant of the order in which the various stakeholders are rendered.
  2. asyncRender=false to ensure delayed prioritized render without any async fetch.
  3. renderStates service is used to maintain the render queue.
  4. set triggerOutOfOrder=true to immediately invoke the fetch and render.
      This will not affect the current app render state.
*/

/**
 * 
 * A composable container component that prioritizes and queues the data fetch and the rendering of its content with the necessary loading states
  
  Sample usage:

  ```handlebars
    {{#sequential-render
      renderPriority=1
      taskName='fetchPrimaryContent'
      getData=executePromise
      renderCallback=(action 'contentRenderCallback') as |renderHash|
    }}
      {{#renderHash.loader-state}}
        // Handle loading state if required
      {{/renderHash.loader-state}}
      {{#renderHash.render-content loaderClass="loader-fade"}}
        // Use renderHash.content to render the content
        // Use renderHash.isContentLoading to act based on the data loading state
      {{/renderHash.render-content}}
    {{/sequential-render}}
  ```
  @class sequential-render
  @public
  @yield {Hash} hash
  @yield {Any} hash.content The response from performing getData.
  @yield {boolean} hash.isContentLoading Flag to check the loading state of the data fetch.
  @yield {component} hash.render-content Block component used to render the content of the item.
        Accepts loaderClass as an argument. This class can be used to style the subsequent loading states for the item.  
  @yield {component} hash.loader-state Block component used to render the loading state of the item.
*/

import Component from '@ember/component';
import layout from '../templates/components/sequential-render';
import { reads, or } from '@ember/object/computed';
import { run } from '@ember/runloop';
import {
  computed,
  setProperties,
  get,
  set,
  getProperties
} from '@ember/object';
import { isNone, tryInvoke, isPresent } from '@ember/utils';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import {
  RENDER_PRIORITY,
  RENDER_STATE_CHANGE_EVENT
} from '../constants/render-states';

const { critical: criticalRender } = RENDER_PRIORITY;

export default Component.extend({
  renderStates: service(),
  layout,
  tagName: '',

  /**
    The unique name of the task.
    @argument taskName
    @type string
    @public
    @required
  */
  taskName: '',

  /**
   * Starts from 0, with 0 being a critical priority task that needs to be executed first. Priorities need not be sequential. 
   * So sequential-render blocks can be used conditionally with no extra effort.
   * renderPriority can be conditional. But we do not recommend modifying priority midway.

  * @argument renderPriority
  * @type number
  * @default 0
  * @public
  */
  renderPriority: criticalRender,

  /**
    Signifies that the rendering requires asynchronous content to be fetched.
    Set this to false if you only need the component to render the content.

    @argument asyncRender
    @deprecated presence of getData attribute implies async operation
    @type boolean
    @public
    @default true
  */
  asyncRender: true,

  /**
    The function that performs all the required asynchronous actions and returns a promise.

    @argument getData
    @type function
    @public
  */
  getData: null,

  /**
    ember-concurrency task that can be performed to fetch the required content.

    @argument fetchDataTask
    @deprecated use getData instead
    @type task
    @public
  */
  fetchDataTask: null,

  /**
    Queryparams required for fetching data. This is used as the first argument for fetchDataTask. 

    @argument queryParams
    @deprecated use getData instead
    @type object
    @public
  */
  queryParams: undefined,

  /**
    Additional options required for fetchDataTask. This is the second argument while performing it.

    @argument taskOptions
    @deprecated use getData instead
    @public
  */
  taskOptions: undefined,

  /**
    A callback function to be executed after rendering is complete.

    @argument renderCallback
    @type function
    @public
  */
  renderCallback: null,

  /**
    Set this to true whenever you need to to trigger the task immediately out of its specific priority/order in the queue.

    @argument triggerOutOfOrder
    @type boolean
    @public
    @default false
  */
  triggerOutOfOrder: false,

  /**
    Set this to true whenever you need to to render the content immediately without any data fetch.

    @argument renderImmediately
    @type boolean
    @public
    @default false
  */
  renderImmediately: false,

  appRenderState: reads('renderStates.renderState'),
  isContentLoading: reads('fetchDataInstance.isRunning'),
  showFadedState: or('isContentLoading', 'priorityStatus.priorityMisMatch'),
  quickRender: or('triggerOutOfOrder', 'renderImmediately'),
  content: reads('fetchData.last.value'),
  isFullFilled: computed('fetchDataInstance.isSuccessful', 'fetchData.performCount', function() {
    let dataFetchSuccessFull = get(this, 'fetchDataInstance.isSuccessful');
    return this.fetchData.performCount > 1 ? true : dataFetchSuccessFull;
  }),
  fetchDataInstance: computed('quickRender', {
    get() {
      return this.quickRender ? this.fetchData.perform() : this.fetchData.last;
    },
    set(key, value) {
      return value;
    }
  }),
  priorityStatus: computed('renderPriority', 'appRenderState', function() {
    let {
      renderPriority,
      appRenderState
    } = getProperties(this, 'renderPriority', 'appRenderState');

    return {
      priorityHit: renderPriority <= appRenderState,
      exactMatch: renderPriority === appRenderState,
      priorityMisMatch: renderPriority > appRenderState
    };
  }),

  init() {
    this._super(...arguments);
    this._addToQueue();
    this._renderStateChangeCallback = this._onRenderStateChange.bind(this);
    get(this, 'renderStates').on(RENDER_STATE_CHANGE_EVENT, this._renderStateChangeCallback);
  },

  didDestroyElement() {
    this._super(...arguments);

    let {
      renderStates,
      renderPriority,
      taskName
    } = getProperties(this, 'renderStates', 'renderPriority', 'taskName');
    renderStates.removeFromQueue(renderPriority, taskName);
    renderStates.off(RENDER_STATE_CHANGE_EVENT, this._renderStateChangeCallback);
  },

  _addToQueue() {
    this.renderStates.addAssignableToQueue(this.renderPriority, this.taskName);
  },

  _executeConditionalRender(isMatched) {
    let isPresentInQueue = this.renderStates.isPresentInQueue(this.renderPriority, this.taskName);
    if (isMatched && isPresentInQueue) {
      return this.fetchData.perform();
    }
  },

  _checkExecutionStatus() {
    if (this.isDestroyed || this.isDestroying) {
      return;
    }
    this._addToQueue();

    return this._executeConditionalRender(this.priorityStatus.priorityHit);
  },
  
  _onRenderStateChange(event) {
    if (this.isDestroyed || this.isDestroying) {
      return;
    }
    let fetchDataInstance = (event.renderState === criticalRender)
      ? this._checkExecutionStatus()
      : this._executeConditionalRender(this.priorityStatus.exactMatch);
    
    if (isPresent(fetchDataInstance)) {
      set(this, 'fetchDataInstance', fetchDataInstance);
    }
  },

  fetchData: task(function* () {
    let {
      queryParams,
      taskOptions,
      renderImmediately,
      asyncRender
    } = getProperties(this, 'queryParams', 'taskOptions', 'renderImmediately', 'asyncRender');
    let content;
    if (!renderImmediately) {
      try {
        content = (asyncRender && this.fetchDataTask)
          ? yield get(this, 'fetchDataTask').perform(queryParams, taskOptions)
          : yield tryInvoke(this, 'getData');
      } catch (error) {
        throw new Error(`Error occured when executing fetchData: ${error}`);
      }
    }

    let validState = renderImmediately || (!this.getData && !asyncRender)
      || !(isNone(content) && this.renderPriority === criticalRender)
    if (validState) {
      this.updateRenderStates();
    }
    return content || [];
  }).restartable(),

  reportRenderState() {
    if (!this.isDestroyed && !this.isDestroying) {
      let {
        renderPriority,
        taskName,
        quickRender,
        renderStates
      } = getProperties(this, 'renderPriority', 'taskName', 'quickRender', 'renderStates');

      
      renderStates.removeScheduledCall(taskName);
      tryInvoke(this, 'renderCallback', [this.content])

      if (quickRender) {
        setProperties(this, {
          renderImmediately: false,
          triggerOutOfOrder: false
        });
      } else {
        renderStates.removeFromQueueAndModifyRender(renderPriority, taskName);
      }

    }
  },

  updateRenderStates() {
    let runNext = run.next(() => {
      this.reportRenderState();
    });
    this.renderStates.addScheduledCall(this.taskName, runNext);
  }
});

