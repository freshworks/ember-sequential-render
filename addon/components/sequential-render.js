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
      context=pageContext
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
  set,
  computed,
  setProperties,
  get,
  getProperties
} from '@ember/object';
import { isNone } from '@ember/utils';
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
    The primary context of the task, i.e., the dynamicSegment of the route.

    @argument context
    @public
  */
  context: null,

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

  isFullFilled: false,

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
  isContentLoading: reads('fetchData.isRunning'),
  showFadedState: or('isContentLoading', 'priorityStatus.priorityMisMatch'),
  quickRender: or('triggerOutOfOrder', 'renderImmediately'),
  priorityStatus: computed('renderPriority', 'appRenderState', function() {
    let {
      renderPriority,
      appRenderState
    } = getProperties(this, 'renderPriority', 'appRenderState');

    return {
      priorityHit: renderPriority === appRenderState,
      priorityMisMatch: renderPriority > appRenderState
    };
  }),

  init() {
    this._super(...arguments);
    let priorityChangeCallback = this._checkTaskPriority.bind(this);
    setProperties(this, {
      content: [],
      priorityChangeCallback
    });
    get(this, 'renderStates').on(RENDER_STATE_CHANGE_EVENT, priorityChangeCallback);
  },

  didReceiveAttrs() {
    this._checkTaskPriority();
  },

  didDestroyElement() {
    this._super(...arguments);

    let {
      renderStates,
      renderPriority,
      taskName
    } = getProperties(this, 'renderStates', 'renderPriority', 'taskName');
    renderStates.removeFromQueue(renderPriority, taskName);
    renderStates.off(RENDER_STATE_CHANGE_EVENT, this.priorityChangeCallback);
  },

  _checkTaskPriority() {
    if (this.isDestroyed || this.isDestroying) {
      return;
    }

    let {
      priorityStatus: { priorityHit },
      asyncRender,
      renderPriority,
      taskName,
      quickRender,
      renderImmediately
    } = getProperties(this,
      'asyncRender', 'priorityStatus', 'renderImmediately',
      'quickRender', 'renderPriority', 'taskName');

    get(this, 'renderStates').updateMaxRenderPriority(renderPriority);

    if (get(this, 'renderStates').isAssignableTask(renderPriority, taskName)
          && (priorityHit || quickRender)) {

      if (!quickRender) {
        get(this, 'renderStates').addToQueue(renderPriority, taskName);
      }

      if ((asyncRender || get(this, 'getData')) && !renderImmediately) {
        get(this, 'fetchData').perform();
      } else {
        this.updateRenderStates();
      }
    }
  },

  fetchData: task(function* () {
    let { queryParams, taskOptions } = getProperties(this, 'queryParams', 'taskOptions');
    let content;
    try {
      let promise = get(this, 'getData') ? get(this, 'getData')()
        :  get(this, 'fetchDataTask').perform(queryParams, taskOptions);
      content = yield promise;
    } catch (error) {
      throw new Error(`Error occured when executing fetchData: ${error}`);
    }

    set(this, 'content', content);
    if (!(isNone(content) && get(this, 'renderPriority') === criticalRender)) {
      this.updateRenderStates();
    }
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

      if (get(this, 'renderCallback')) {
        get(this, 'renderCallback')(get(this, 'content'));
      }

      if (!quickRender) {
        renderStates.removeFromQueueAndModifyRender(renderPriority, taskName);
      }

      setProperties(this, {
        renderImmediately: false,
        triggerOutOfOrder: false
      });
    }
  },

  updateRenderStates() {
    set(this, 'isFullFilled', true);

    let runNext = run.next(() => {
      this.reportRenderState();
    });
    get(this, 'renderStates').addScheduledCall(get(this, 'taskName'), runNext);
  }
});

