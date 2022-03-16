import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { setupOnerror } from '@ember/test-helpers';

const AFTER_RENDER = {
  first: 'First Task',
  second: 'Second Task',
  third: 'Third Task',
  fourth: 'Fourth Task',
  fifth: 'Fifth Task',
};

const CONTENT = {
  label: 'Test Content',
};

module(
  'Integration | Component | sequential-render | ComponentTest',
  function (hooks) {
    setupRenderingTest(hooks);
    hooks.beforeEach(async function (assert) {
      this.setProperties({
        afterTask1: () => assert.step(AFTER_RENDER.first),
        afterTask2: () => assert.step(AFTER_RENDER.second),
        afterTask3: () => assert.step(AFTER_RENDER.third),
        afterTask4: () => assert.step(AFTER_RENDER.fourth),
        afterTask5: () => assert.step(AFTER_RENDER.fifth),
        getData: () =>
          new Promise((resolve) => {
            setTimeout(resolve(CONTENT), 2000);
          }),
        getDataNoPromise: () => 'test',
        getDataNotFunction: 'test',
        getDataThrowsError: () => {
          throw new Error('myError');
        },
      });
    });
    hooks.afterEach(function () {
      setupOnerror();
    });

    test('Test renderCallback is triggered and content is rendered', async function (assert) {
      await render(hbs`
      <SequentialRender
        @taskName="task1"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask1}}
        as |seq1|
      >
        <seq1.contentTemplate @loaderClass="content--faded">
          <h1>Render first: 
            {{#unless seq1.isContentLoading}}
              <span data-test-id="seq1-content">{{seq1.content.label}}</span>
            {{/unless}}
          </h1>
        </seq1.contentTemplate>
      </SequentialRender>
      `);

      assert.verifySteps([AFTER_RENDER.first]);
      assert.dom('[data-test-id="seq1-content"]').containsText(CONTENT.label);
    });

    test('Check order of execution when no async task is present', async function (assert) {
      await render(hbs`
      <SequentialRender
        @renderPriority={{1}}
        @taskName="first"
        @renderCallback={{this.afterTask1}}
        as |firstComponent|
      >
        <firstComponent.contentTemplate>
          <h1>first</h1>
        </firstComponent.contentTemplate>
        <firstComponent.loaderTemplate>
          <h1>Loading...</h1>
        </firstComponent.loaderTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{0}}
        @taskName="second"
        @renderCallback={{this.afterTask2}}
        as |secondComponent|
      >
        <secondComponent.contentTemplate>
          <h1>Second</h1>
        </secondComponent.contentTemplate>
        <secondComponent.loaderTemplate>
          <h1>Loading...</h1>
        </secondComponent.loaderTemplate>
      </SequentialRender>
      `);
      assert.verifySteps([AFTER_RENDER.second, AFTER_RENDER.first]);
    });

    test('Check order of execution and content when an async task is present', async function (assert) {
      await render(hbs`
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @renderCallback={{this.afterTask1}}
        as |seq|
      >
        <seq.contentTemplate>
          <h1>Render Second</h1>
        </seq.contentTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task2"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask2}}
        as |seq1|
      >
        <seq1.contentTemplate>
          <h1>Render Second: 
            <span data-test-id="seq1-content">{{seq1.content.label}}</span>
          </h1>
        </seq1.contentTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task3"
        @renderCallback={{this.afterTask3}}
        as |seq1|
      >
        <seq1.contentTemplate>
          <h1>Render Second</h1>
        </seq1.contentTemplate>
      </SequentialRender>
      `);
      assert.verifySteps([
        AFTER_RENDER.first,
        AFTER_RENDER.third,
        AFTER_RENDER.second,
      ]);
      assert.dom('[data-test-id="seq1-content"]').containsText(CONTENT.label);
    });

    test('Check order of execution when priorities are skipped', async function (assert) {
      await render(hbs`
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @renderCallback={{this.afterTask1}}
        as |seq|
      >
        <seq.contentTemplate>
          <h1>Render Second</h1>
        </seq.contentTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{2}}
        @taskName="task2"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask2}}
        as |seq1|
      >
        <seq1.contentTemplate>
          <h1>Render Second</h1>
        </seq1.contentTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{4}}
        @taskName="task3"
        @renderCallback={{this.afterTask3}}
        as |seq1|
      >
      <seq1.contentTemplate>
        <h1>Render Second</h1>
      </seq1.contentTemplate>
      </SequentialRender>
      `);
      assert.verifySteps([
        AFTER_RENDER.first,
        AFTER_RENDER.second,
        AFTER_RENDER.third,
      ]);
    });

    test('Check order of execution when an getData returns non-promise', async function (assert) {
      await render(hbs`
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @renderCallback={{this.afterTask1}}
        as |seq|
      >
        <seq.contentTemplate>
          <h1>Render Second</h1>
        </seq.contentTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task2"
        @getData={{this.getDataNoPromise}}
        @renderCallback={{this.afterTask2}}
        as |seq1|
      >
      <seq1.contentTemplate>
        <h1>Render Second</h1>
      </seq1.contentTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="task3"
        @renderCallback={{this.afterTask3}}
        as |seq1|
      >
      <seq1.contentTemplate>
        <h1>Render Second</h1>
      </seq1.contentTemplate>
      </SequentialRender>
      `);
      assert.verifySteps([
        AFTER_RENDER.first,
        AFTER_RENDER.second,
        AFTER_RENDER.third,
      ]);
    });

    test('Check error caught when getData throws some error', async function (assert) {
      assert.expect(1);
      setupOnerror(function (err) {
        assert.equal(
          err.message,
          'Error occured when executing fetchData: Error: myError'
        );
      });
      await render(hbs`
      <SequentialRender
        @renderPriority={{0}}
        @taskName="task1"
        @getData={{this.getDataThrowsError}}
        as |seq1|
      >
      <seq1.contentTemplate>
        <h1>Render Second</h1>
      </seq1.contentTemplate>
      </SequentialRender>
      `);
    });

    test('Check order of renders when retry is used', async function (assert) {
      await render(hbs`
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @renderCallback={{this.afterTask1}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.contentTemplate>
          <h1>Render First</h1>
        </SequentialRenderItem.contentTemplate>
        <SequentialRenderItem.loaderTemplate>
          Loading...
        </SequentialRenderItem.loaderTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{2}}
        @taskName="Task2"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask2}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.contentTemplate>
          <h1>Render Third</h1>
        </SequentialRenderItem.contentTemplate>
        <SequentialRenderItem.loaderTemplate>
          Loading...
        </SequentialRenderItem.loaderTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="Task3"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask3}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.contentTemplate>
          <h1>Render First</h1>
          <button type='button' data-test-id='retry-button' {{on "click" (fn SequentialRenderItem.retry)}}>Retry</button>
        </SequentialRenderItem.contentTemplate>
        <SequentialRenderItem.loaderTemplate>
          Loading...
        </SequentialRenderItem.loaderTemplate>
      </SequentialRender>
      `);
      await click('[data-test-id="retry-button"]');
      assert.verifySteps([
        AFTER_RENDER.first,
        AFTER_RENDER.third,
        AFTER_RENDER.second,
        AFTER_RENDER.third,
      ]);
    });

    test('Test dynamically introduced higher priority elements', async function (assert) {
      await render(hbs`
      <SequentialRender
        @renderPriority={{0}}
        @taskName="Task1"
        @renderCallback={{this.afterTask1}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.contentTemplate>
          <h1>Render First</h1>
        </SequentialRenderItem.contentTemplate>
        <SequentialRenderItem.loaderTemplate>
          Loading...
        </SequentialRenderItem.loaderTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{2}}
        @taskName="Task2"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask2}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.contentTemplate>
          <h1>Render Third</h1>
          <SequentialRender
            @renderPriority={{3}}
            @taskName="Task4"
            @renderCallback={{this.afterTask4}} as |SequentialRenderItem|
          >
            <SequentialRenderItem.contentTemplate>
              <h1>Render fourth</h1>
            </SequentialRenderItem.contentTemplate>
            <SequentialRenderItem.loaderTemplate>
              Loading...
            </SequentialRenderItem.loaderTemplate>
          </SequentialRender>
          <SequentialRender
            @renderPriority={{1}}
            @taskName="Task5"
            @renderCallback={{this.afterTask5}} as |SequentialRenderItem|
          >
            <SequentialRenderItem.contentTemplate>
              <h1>Render fifth</h1>
            </SequentialRenderItem.contentTemplate>
            <SequentialRenderItem.loaderTemplate>
              Loading...
            </SequentialRenderItem.loaderTemplate>
          </SequentialRender>
        </SequentialRenderItem.contentTemplate>
        <SequentialRenderItem.loaderTemplate>
          Loading...
        </SequentialRenderItem.loaderTemplate>
      </SequentialRender>
      <SequentialRender
        @renderPriority={{1}}
        @taskName="Task3"
        @getData={{this.getData}}
        @renderCallback={{this.afterTask3}} as |SequentialRenderItem|
      >
        <SequentialRenderItem.contentTemplate>
          <h1>Render First</h1>
          <button type='button' data-test-id='retry-button' {{on "click" (fn SequentialRenderItem.retry)}}>Retry</button>
        </SequentialRenderItem.contentTemplate>
        <SequentialRenderItem.loaderTemplate>
          Loading...
        </SequentialRenderItem.loaderTemplate>
      </SequentialRender>
      `);
      assert.verifySteps([
        AFTER_RENDER.first,
        AFTER_RENDER.third,
        AFTER_RENDER.second,
        AFTER_RENDER.fifth,
        AFTER_RENDER.fourth,
      ]);
    });
  }
);
