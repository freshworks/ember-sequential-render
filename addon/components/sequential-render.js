/*
  1. Both 'renderPriority' and 'taskName' are mandatory.
      taskName: A unique idetifier, app wide, to maintain the render queue.
      renderPriority: Numeric determinant of the order in which the various stakeholders are rendered.
  2. renderStates service is used to maintain the render queue.
*/

/**
 * 
 * A composable container component that prioritizes and queues the data fetch and the rendering of its content with the necessary loading states
  
  Sample usage:

  ```handlebars
    <SequentialRender
      @renderPriority={{1}}
      @taskName='fetchPrimaryContent'
      @getData={{this.executePromise}}
      @renderCallback={{action 'contentRenderCallback'}} as |renderHash|
    >
      <renderHash.loader-state>
        // Handle loading state if required
      </renderHash.loader-state>
      <renderHash.render-content @loaderClass="loader-fade">
        // Use renderHash.content to render the content
        // Use renderHash.isContentLoading to act based on the data loading state
      {{/renderHash.render-content}}
    </SequentialRender>
  ```
  @class sequential-render
  @public
  @yield {Hash} hash
  @yield {Any} hash.content The response from performing getData.
  @yield {boolean} hash.isContentLoading Flag to check the loading state of the data fetch.
  @yield {component} hash.render-content Block component used to render the content of the item.
        Accepts loaderClass as an argument. This class can be used to style the subsequent loading states for the item.  
  @yield {component} hash.loader-state Block component used to render the loading state of the item.
  @yield {action} hash.retry Exposes an action which can be used to retry the data fetch + render process without affecting the queue / app render states..
*/

import Component from '@glimmer/component';
import { next } from '@ember/runloop';
import { isNone } from '@ember/utils';
import { inject as service } from '@ember/service';
import { restartableTask } from 'ember-concurrency';
import { RENDER_PRIORITY } from '../constants/render-states';
import { action } from '@ember/object';

const { critical: criticalRender } = RENDER_PRIORITY;

export default class SequentialRender extends Component {
  @service renderStates;

  content = null;

  /**
    The unique name of the task.
    @argument taskName
    @type string
    @public
    @required
  */

  /**
   * Starts from 0, with 0 being a critical priority task that needs to be executed first. Priorities need not be sequential. 
   * So sequential-render blocks can be used conditionally with no extra effort.
   * renderPriority can be conditional. But we do not recommend modifying priority midway.

  * @argument renderPriority
  * @type number
  * @default 0
  * @public
  */
  get renderPriority() {
    return this.args.renderPriority || criticalRender;
  }

  /**
    The function that performs all the required asynchronous actions and returns a promise.

    @argument getData
    @type function
    @public
  */

  /**
    A callback function to be executed after rendering is complete.

    @argument renderCallback
    @type function
    @public
  */

  get appRenderState() {
    return this.renderStates.renderState;
  }

  get isContentLoading() {
    return this.fetchDataInstance?.isRunning;
  }

  get showFadedState() {
    return this.isContentLoading || this.priorityStatus.priorityMisMatch;
  }

  get priorityStatus() {
    return {
      priorityHit: this.renderPriority <= this.appRenderState,
      exactMatch: this.renderPriority === this.appRenderState,
      priorityMisMatch: this.renderPriority > this.appRenderState,
    };
  }

  get fetchDataInstance() {
    let fetchDataInstance =
      this.appRenderState === criticalRender
        ? this._checkExecutionStatus()
        : this._executeConditionalRender(this.priorityStatus.exactMatch);
    return fetchDataInstance || this.fetchData?.last;
  }

  get isFullFilled() {
    return (
      this.fetchDataInstance?.isSuccessful || this.fetchData.performCount > 1
    );
  }

  constructor() {
    super(...arguments);
    this._checkExecutionStatus();
  }

  willDestroy() {
    super.willDestroy(...arguments);

    this.renderStates.removeFromQueue(this.renderPriority, this.args.taskName);
  }

  _executeConditionalRender(isMatched) {
    let isPresentInQueue = this.renderStates.isPresentInQueue(
      this.renderPriority,
      this.args.taskName
    );
    let isTaskScheduled = this.renderStates.isCallScheduled(this.args.taskName);
    if (isMatched && isPresentInQueue && !isTaskScheduled) {
      return this.fetchData.perform();
    }
  }

  _checkExecutionStatus() {
    if (
      this.isDestroyed ||
      this.isDestroying ||
      !this.renderStates.isAssignableTask(
        this.renderPriority,
        this.args.taskName
      )
    ) {
      return;
    }
    this.renderStates.addAssignableToQueue(
      this.renderPriority,
      this.args.taskName
    );

    return this._executeConditionalRender(this.priorityStatus.priorityHit);
  }

  @restartableTask *fetchData(options) {
    let { report = true } = options || {};
    try {
      this.content = yield this.args.getData?.();
    } catch (error) {
      throw new Error(`Error occured when executing fetchData: ${error}`);
    }

    let validState =
      !this.args.getData ||
      !(isNone(this.content) && this.renderPriority === criticalRender);
    if (validState) {
      this.updateRenderStates({ report });
    }
    return this.content || [];
  }

  reportRenderState({ report = true }) {
    if (!this.isDestroyed && !this.isDestroying) {
      this.renderStates.removeScheduledCall(this.args.taskName);
      this.args.renderCallback?.(this.content);
      if (report) {
        this.renderStates.removeFromQueueAndModifyRender(
          this.renderPriority,
          this.args.taskName
        );
      }
    }
  }

  updateRenderStates({ report = true }) {
    let runNext = next(() => {
      this.reportRenderState({ report });
    });
    this.renderStates.addScheduledCall(this.args.taskName, runNext);
  }

  @action
  retry() {
    return this.fetchData.perform({ report: false });
  }
}
