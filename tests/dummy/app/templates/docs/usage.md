# Usage Guide

## 1. Reset the app's render state during route transitions

In routes/application.js,
```
renderStates: service(),
actions: {
  didTransition() {
    get(this, 'renderStates').resetRenderState();
  }
}
```
OR
```
@service
renderStates;

@action
didTransition() {
  this.renderStates.resetRenderState();
}
```

## 2. Register _postRenderCallback if required

In routes/application.js,
```
renderStates: service(),
setupController(controller) {
  get(this, 'renderStates').registerPostRenderCallback(this._postRenderCallback.bind(this), FALLBACK_TIMEOUT);
}
```
OR
```
@service
renderStates;

setupController(controller) {
  this.renderStates.registerPostRenderCallback(this._postRenderCallback.bind(this), FALLBACK_TIMEOUT);
}
```

## 3. Figure out priority of the elements in a route

![Sample Route](/assets/sample_route.png) 

In this example, the critical or hero element is the content inside the left pane. So that'll be assigned a renderPriority of 0. Subsequently, the quick notes and the participants list will be assigned a renderPriority of 1.

## 4. Wrap the content in sequential-render instances and pass in a function that returns a promise

```
<div class="flex1 schoolroom__mainpanel">
  <h2 class="maintitle">Dumbledore's Army</h2>
  {{#sequential-render
    renderPriority=0
    taskName="getSpellWork"
    getData=getSpellWork as |spellHash|
  }}
    {{#spellHash.render-content}}
      {{#each spellWork as |spell|}}
        <div class="card">
          <div class="title">
            {{spell.name}}
          </div>
          <div class="subtext">
            {{spell.description}}
          </div>
        </div>
      {{/each}}
    {{/spellHash.render-content}}
    {{#spellHash.loader-state}}
      // ...Loader
    {{/spellHash.loader-state}}
  {{/sequential-render}}
</div>
```

OR

```
<div class="flex1 schoolroom__mainpanel">
  <h2 class="maintitle">Dumbledore's Army</h2>
  <sequential-render
    renderPriority={{0}}
    taskName="getSpellWork"
    getData={{getSpellWork}} as |spellHash|
  >
    <spellHash.render-content>
      {{#each spellWork as |spell|}}
        <div class="card">
          <div class="title">
            {{spell.name}}
          </div>
          <div class="subtext">
            {{spell.description}}
          </div>
        </div>
      {{/each}}
    </spellHash.render-content>
    <spellHash.loader-state>
     // ...Loader
    </spellHash.loader-state>
  </sequential-render>
</div>
```

## 5. Loading states

Add in skeleton loaders or other loading states as per your preference to avoid layout shifts when lower priority elements pop into place.
