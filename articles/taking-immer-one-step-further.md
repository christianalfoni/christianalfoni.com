[Redux](https://redux.js.org/) had a huge impact on the React ecosystem as it was trying to find its common ground on how to manage application state (global state). It followed the functional purity principles of React itself and despite its ceremonial syntax it was adopted broadly. As time passed other tools with different approaches started popping up. [Mobx](https://mobx.js.org/) is the most noticeable. It basically takes the same concept of observable values as [Vue](https://vuejs.org/), but in a more agnostic way. The funny thing is that when Mobx started hitting mainstream in the React community [Vuex](https://vuex.vuejs.org/) came out of the Vue team. Vuex basically tries to implement Redux into Vue. 

So here we are. Mobx being adopted for its impurity in an immutable world, and Redux being adopted for its purity in a mutable world. This seems very strange and I think [this presentation from Rich Harris](https://docs.google.com/presentation/d/1PUvpXMBEDS45rd0wHu6tF3j_8wmGC6cOLtOw2hzU-mw/edit) certainly touches on some of the reasons.

Personally **I do not really care** about immutable or mutable, I only care about the developer experience. I would never use a pure API that makes my code technically perfect, but constantly blocks my progress because I have to overthink or boilerplate simple things. On the other hand I would never use an impure API that seems super simple, but later I get into problems. It is about what gets the job done and me feeling productive.

Like many other things a middleground can often be a good solution. In this article we are going to continue on the work by [Michele Westrate](https://twitter.com/mweststrate) and his [Immer](https://github.com/immerjs/immer) library to see where such a middleground could take us.

## So what is Immer?

**Immer** is a library that merges the impure world with the pure world. Basically it allows you to express changes to a value using the native mutation API of JavaScript, but as a result create an immutable result. The reason this came about is the ceremony Redux sets us up for with its reducers:

```ts
const productsById = (state, action) => {
  switch (action.type) {
    case RECEIVE_PRODUCTS:
      return {
        ...state,
        ...action.products.reduce((obj, product) => ({
          ...obj,
          [product.id]: product
        }), {})
    }
    default:
      return state
  }
}
```

By adding Immer to the mix you are able to express the same piece of code with:

```ts
import produce from "immer"

const productsById = produce((draft, action) => {
  switch (action.type) {
    case RECEIVE_PRODUCTS:
      action.products.forEach(product => {
        draft[product.id] = product
      })
  }
})
```

We are not returning a new value anymore, we are mutating a **draft**. Immer tracks the mutations we perform on the draft and then transforms them into immutable operations on the source state. The funny thing is that the  result of this approach is even more pure than the initial example. Let me explain.

Even though the initial example produces a new value from a reducer using a combination of filters, reducers and spread operators, the returned result itself is **not** immutable. If you were to pass any of the returned state  to a third party library it could freely mutate it and cause havoc to your app. Even a simple **sort** on an array in one of your components changes the array inside the state store. With Immer you will get an error if such a thing would occur.

You can of course argue how to best express an intention. Many developers relates better to an imperative impure approach:

```ts
action.products.forEach(product => {
  draft[product.id] = product
})
```

Where this pure functional approach makes a lot more sense to others:

```ts
{
  ...state,
  ...action.products.reduce((obj, product) => ({
    ...obj,
    [product.id]: product
  }), {})
}
```

We can argue all day about "how the world works" and how to better express intention in code. At the end of the day we build applications in an impure imperative environment called **the browser** and **JavaScript**. Shoving pure principles on top of something inherently impure has consquences. Most noticeably boilerplating and complex APIs.

## Taking another step

Immer with over 2 million downloads a week certainly proves that we have become comfortable with expressing something impure to get a pure result. Let us now take it a step further. Redux is all about splitting **"Request change"** by dispatching actions to reducers which handles **"How to change"**. Although it promises some guarantess it is all very ceremonial. Just like Immer helps us better express our intention in reducers it can also eliminate the need for it completely. And with no reducer there is no need to action creators or dispatching.

Let us look at the products example using **Immer** again and this time include all the parts:

```ts
// action creator
const receiveProducts = (products) => ({
  "type": RECEIVE_PRODUCTS,
  products
})

// thunk
const getProducts = () => async (dispatch, getState, api) => {
  dispatch(receiveProducts(await api.getProducts()))
}

// reducer
const productsById = produce((draft, action) => {
  switch (action.type) {
    case RECEIVE_PRODUCTS:
      action.products.forEach(product => {
        draft[product.id] = product
      })
    return
  }
})
```

What if we could just express this as:

```ts
const getProducts = ({ state, effects }) => {
  const products = await effects.api.getProducts()
  
  products.forEach(product => {
    state.products[product.id] = product
  })
}
```

This has nothing to do with less lines of code. This is about expressing intention. We want to express the flow of asking for products, getting them and inserting them into our state. We can do that with three different concepts using a **dispatcher**, an **action creator** and a **reducer**. Or we can use one concept, an **action**. But what about our guarantees?

**Let us summarize what we want:**

1. *"We want to ensure where state changes can happen"*. They can only happen in an action
2. *"We want to be able to track where a state change happened"*. Redux does not track thunks, but immer-store tracks actions. That means you know what actions causes what state changes
3. *"We are comfortable with using an impure approach to better express intention, but have to ensure a pure result"*. With Immer the state changes are actually changes to a draft which results in an immutable result

Moving on from here we are going to look at a **proof of concept** that shows how this API and keeping the guarantees is possible. I will write about how it works and why it works that way. At the end I hope to at least have made a point and maybe even give a fresh perspective on the tools you use.

## Immer-store

The experiment is called **immer-store** and it is built as an exercise to explore this fascinating mix of mutable APIs for an immutable result.

Let us stay with our products to see how the API works, also including our side effect of grabbing the products themselves:

```ts
import { createStore } from 'immer-store'

const store = createStore({
  state: {
    products: {}
  },
  actions: {
    getProducts: async ({ state, effects }) => {
      const products = await effects.api.getProducts()
  
      products.forEach(product => {
        state.products[product.id] = product
      })  
    }
  },
  effects: {
    api: {
      getProducts: async () => {
        const result = await fetch('/api/products')

        return result.toJSON()
      }
    }
  }
})
```

This store is just like the redux store. It has state, you can subscribe to it and you can dispatch requests for changes. But instead of having to create action creators and dispatch to a reducer you just call an **action**.

Inside of **immer-store** we have this piece of code:

```ts
// We wrap the defined action from the developer
const wrappedAction = (payload) => {
  // Every action execution keeps a reference to its draft, just like a reducer.
  // Unlike a reducer this draft might be recreated as something async runs,
  // like fetching data from the server will require us to create a new draft
  // if we want to change some state after that
  let currentDraft

  // To keep track of async execution we can use a simple timeout. This timeout
  // will take any current draft and finalize it, unless we cleared the
  // timeout due to the action finishing its execution
  let timeout

  // This function prepares a new draft and a timeout to possibly
  // asynchronously finalize it
  function configureDraft() {
    if (!currentDraft) {
      currentDraft = createDraft(currentState)
    }
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      // "flushMutations" finalizes the draft, which updates the state
      // and also notifies subscribers to update
      flushMutations(currentDraft, name)
      currentDraft = null
    })
  }

  // We create the state that is being passed into the action. This
  // is a proxy that just ensures whenever we try to do anything with
  // the state object a draft is prepared and ready to rumble
  const state = new Proxy(
    {},
    {
      get(_, prop) {
        configureDraft()
        return currentDraft[prop]
      },
      deleteProperty(_, prop) {
        configureDraft()
        return Reflect.deleteProperty(currentDraft, prop)
      },
      set(_, prop, ...rest) {
        configureDraft()
        return Reflect.set(currentDraft, prop, ...rest)
      },
    }
  )

  // Now we run the action defined by the developer, passing
  // in the state as the first argument and optionally some
  // payload passed to the action
  const actionResult = action(state, payload)

  // If the action returns a promise (probably async function)
  // we wait for it to finish. This indicates that it is time
  // to finalize the draft, flusing out changes to components
  if (actionResult instanceof Promise) {
    actionResult
      .then(() => {
        clearTimeout(timeout)
        if (currentDraft) {
          flushMutations(currentDraft, name)
          currentDraft = null
        }
      })
      .catch((error) => {
        // CAVEAT: If you are to change state asynchronously
        // you have to point to the actual state object again,
        // this is to configure a new draft. This could be changed inside
        // Immer, allowing a draft to be updated with current state and
        // finalized multiple times
        if (error.message.indexOf('proxy that has been revoked') > 0) {
          const message = `You are asynchronously changing state in the action "${name}". Make sure you point to "state" again as the previous state draft has been disposed`

          throw new Error(message)
        }

        throw error
      })
  // If the action is done we can immediately finalize
  // the draft and flush out changes
  } else if (currentDraft) {
    clearTimeout(timeout)
    flushMutations(currentDraft, name)
    currentDraft = null
  } else {
    clearTimeout(timeout)
  }

  return actionResult
}
```

In short what we did here:

1. We wrap the defined action from the developer
2. We create an Immer draft that will be provided to the action. This draft might be updated several times through async execution inside the action
3. We create a Proxy which wraps the draft. This allows us to intercept access to the draft so that we can make sure we always have a new draft available for the next async change
4. We finalize the draft immediately when the action is done executing. If it returns a promise (async await), we wait for that promise to resolve to stop creating any new drafts

This is pretty much it. In addition we are able to produce quite a bit of debugging data. First of all we know what action has been triggered and Immer tells us what paths in our state is changing. That means we can show the developer exactly what action is triggered and what state changes it makes.

But we can improve more code here.

## Skip mapping state into components

With an immutable approach you have to map what state a component needs. This is necessary so that whenever the store emits an update the component can check if any of the mapped state has changed. This is typically expressed as:

```tsx
function MyComponent() {
  const todos = useSelector(state => state.todos)
}
```

This is very straight forward and does not require any improvements in my opinion. But what if you want to extract multiple states?

```tsx
function MyComponent() {
  const {
    config,
    issues
  } = useSelector(state => ({
    config: state.config,
    issues: state.issues
  }), shallowComparison)
}
```

Now we see the boilerplate emerging. Because the object returned from the **useSelector** callback is new every time, we need to pass a second argument to let it know how to figure out when the state has actually changed. Also we see a duplicate destructuring, it is not ideal.

Since Immer tells us exactly what state changes we can track what state components are looking at and match this data. We create a proxy which wraps the current state of the app and track whatever the component accesses. This allows us to express the selectors as:

```tsx
function MyComponent() {
  const { config, issues } = useAppState()
}
```

Whatever the component access will cause it to render if changed. But how is this actually implemented? Let us have a look at the code

```ts
// We lazyily recursively pass in what "state" to track. We also
// give it the current "path" for debugging purposes. The
// "paths" is a SET of actual paths accessed, used to subscribe
// to the store later. "attachProxy" is related to Immer also
// using proxies. We can only attach the object iself to the
// trackStateAccess proxy during operations like map, reduce etc.
// This last part is honestly not obvious to me
export function createTrackStateAccessProxy(
  state,
  path,
  paths,
  attachProxy = false
) {
  return new Proxy(attachProxy ? state : {}, {
    get(_, prop, receiver) {
      // These are special type of properties we do not want to
      // track. You might wonder why we do not track "length".
      // It is because it is used internally by JavaScript and
      // we do not want to indicate this tracking when
      // debugging. No worries, any added/removed items will
      // cause a pointer to "state.someArray.length" to update
      if (prop === 'length' || typeof prop === 'symbol' || prop === 'inspect') {
        return state[prop]
      }

      // If we try to grab a function, like to "map",
      // "filter" etc. we return that function and run it
      // in the context of a new "attached" proxy
      if (typeof state[prop] === 'function') {
        return (...args) => {
          return state[prop].call(
            createPathTracker(state, path, paths, true),
            ...args
          )
        }
      }

      // We update our current path
      const newPath = path.concat(prop)
      // And add the path to our tracking SET of paths
      paths.add(newPath.join('.'))

      // If we have an array or en object we create a
      // proxy around it
      if (typeof state[prop] === 'object' && state[prop] !== null) {
        return createTrackStateAccessProxy(state[prop], newPath, paths)
      }

      // If any other value we just return it
      return state[prop]
    },
  })
}
```

This might seem crazy magical to you, but it really is not. We are just intercepting any pointer into our state and updating a set of paths that the component accesses. The complicated bits is related to that Immer also creates proxies and configures properties to avoid mutation. This makes it impossible to just proxy the exact state, we have to proxy via a fake object that we can manipulate. If you think this is crazy, look into any framework. Everybody has some code where you want to take a shower after just looking at it.

Let us just forget this part and rather look at how this proxy is used:

```ts
// We create a tracker that holds our SET of paths and
// creates the proxy that does the tracking. It takes in
// the state and it also takes an initial "targetPath".
// This allows the tracker to start tracking at a nested
// position which we will see the benefit of soon
function createTracker(getState: () => any, targetPath: string[] = []) {
  const paths = new Set<string>()

  return {
    getState() {
      return createTrackStateAccessProxy(getState(), targetPath, paths)
    },
    getPaths() {
      return paths
    },
  }
}

// For typing support we allow you to create a state hook
// You can either grab all the state or use a callback to
// access nested state
export function createStateHook<C extends Config<any, any, any>>() {
  function useState<T>(cb: (state: C['state']) => T): T
  function useState(): C['state']
  function useState() {

    // So that we can access the name of the component during development
    const {
      ReactCurrentOwner,
    } = __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    const name =
      ReactCurrentOwner &&
      ReactCurrentOwner.current &&
      ReactCurrentOwner.current.elementType &&
      ReactCurrentOwner.current.elementType.name

    // To force update the componnet
    const [, updateState] = React.useState()
    const forceUpdate = React.useCallback(() => updateState({}), [])

    // Grab the store instance from the React context
    const store = React.useContext(context)

    if (store) {
      let tracker

      // If we receive a callback we will run the callback using a tracker
      // to figure out at what nested path we should start tracking, more
      // on this later
      const targetState = arguments[0]
      if (targetState) {
        const targetTracker = createTracker(() => store.state)
        targetState(targetTracker.getState())
        const targetPath = (
          Array.from(targetTracker.getPaths()).pop() || ''
        ).split('.')
        tracker = React.useRef(
          createTracker(
            () => targetPath.reduce((aggr, key) => aggr[key], store.state),
            targetPath
          )
        ).current
      // But typically we just create a tracker 
      } else {
        tracker = React.useRef(createTracker(() => store.state)).current
      }

      // We use a "layoutEffect" to subscribe and unsubscribe
      // at the exact points where the function is done running.
      // Using "useEffect" which is async could cause issues
      React.useLayoutEffect(() => {
        // We subscribe to the accessed paths which causes a
        // new render, which again creates a new subscription
        return store.subscribe(
          () => {
            log(
              LogType.COMPONENT_RENDER,
              `"${name}", tracking "${Array.from(tracker.getPaths()).join(
                ', '
              )}"`
            )
            forceUpdate()
          },
          tracker.getPaths(),
          name
        )
      })

      // We return the trackable state
      return tracker.getState()
    }

    throwMissingStoreError()
  }

  return useState
}
```

There is certainly more going on here than in a [pure immutable approach](https://github.com/reduxjs/react-redux/blob/5.x/src/connect/selectorFactory.js), and you naturally start worrying about performance. It is increadibly difficult to compare performance of a tracking approach and a value comparison approach. Let us look at where the overhead and benefit is:

### Overhead
- **tracking overhead**: The overhead is in warpping and accessing the state through a proxy
- **value comparison overhead**: The overhead is that every single component accessing state has to figure out if it should update on every state change

### Benefit
- **tracking benefit**: When a state change occurs an exact match can be made to a component. That means if `products[0].price` changes, only components actually looking at the price will update
- **value comparison benefit**: Almost no overhead exposing state to components

The results of any performance test here would vary depending on the application. But in reality it does not matter. What matters is the developer experience. I am not saying that there are edge cases where you might need to think really hard about how state is exposed and how it affects rendering, but in my opinion you should not constantly be exposed to these low level implementation details.

So let us talk about real performance concerns.

## Handling performance

The most typical example of where performance becomes a concern is with lists, especially lists where each item in that list can individually change some property. Think a list of stocks where the value of a single stock changes. Ideally you only want to reconcile that single stock in the list, not even touching the component responsible for the list itself.

Let us see how this plays out:

```tsx
const Stock = ({ stock }) => {
  return (
    <li>
      {stock.name}
      {stock.value}
    </li>
  )
}

const StocksList = () => {
  const stocks = useSelector(state => state.stocks)

  return (
    <ul>
      {Object.values(stocks).map((stock) => (
        <Stock key={stock.id} stock={stock} />
      ))}
    </ul>
  )
}
```

In this case we are passing the stock itself to a child component. The concern here is that any change to a stock forces React to reconcile the **StocksList** component and every **Stock** component as well. To avoid this we can use **React.memo**:


```tsx
const Stock = React.memo(({ stock }) => {
  return (
    <li>
      {stock.name}
      {stock.value}
    </li>
  )
})
```

This is what you do with components in lists. The **StocksList** component will still reconcile on any change to a stock, but we avoid reconciling all the other **Stock** components except the one that changed of course.

What we can do with **immer-store** though is to target nested state.

```tsx
const Stock = React.memo(({ id }) => {
  const stock = useAppState(state => state.stocks[id])

  return (
    <li>
      {stock.name}
      {stock.value}
    </li>
  )
})

const StocksList = () => {
  const state = useAppState()

  return (
    <ul>
      {Object.keys(state.stocks).map((stockId, index) => (
        <Stock key={stockId} id={stockId} />
      ))}
    </ul>
  )
}
```

In this example we are not passing in the stock itself, we rather pass in the id of the stock. This allows the **StocksList** component to track the stock itself. That means if any stock changes its value only the component looking at that specific value will reconcile. The list is not touched as it does not look at the value of any stocks. It will only reconcile if a stock is added or removed.

Maybe you are thinking that you can do the same with Redux, but you can`t. The reason is that the **StocksList** component, and all other components, will be notified when a stock changes. Due to immutability also the dictionary of stock changes when a single stock change. Since our **StocksList** component is looking for changes to the stocks it will reconcile.

Again, this is not a typicaly scenario, but it is a scenario where you actually should care about performance and tracking has benefits in those scenarios. Please comment below if you have other scenarios or scenarios where this statement is not true.

## Computing state

There is this other concept we also have to find a place for and that is computing state, or memoizing derived state. A very popular project in the Redux community, [reselect](https://github.com/reduxjs/reselect), does this by comparing arguments and figuring out if they have changed.

There are several benefits to this approach:

1. We have immutable data, so we can use it
2. You can easily compose them together
3. They can be used globally in your app or each component can use them

Other libraries like [Mobx](https://mobx.js.org/) and [Overmind JS](https://overmindjs.org) also computes state and they do it by automatically tracking what state is being used in the computation. These are simpler APIs as their effectiveness is not affected by what state you as a developer expose. They are always optimal due to tracking. 

For the sake of this experiement where we introduced tracking to optimally render components and simplify the API, I decided to rather go with **reselect** to compute state. See if we can merge the two concepts.

The tricky thing though is that we want to use computed state in both actions and components, but the state exposed are different. In actions the state can be mutated, because the state exposed is a draft. We certainly do not want mutations to occur in a computed. In the components we are tracking state, though a computed might return a cached value, so the tracking would not work.

First let us solve the action. If you remember from before the state we pass into actions is wrapped in a proxy we control. That means we can use it to extract the immutable current state when passed into computeds. It does require us to create our own **createComputed** function as a wrapper around **createSelector**. This is how it works:

And now we need to solve components. Since we have our own computed API we can also expose our own hook, **useComputed**. This hook does not track paths and subscribes to those paths, rather it does what Redux hooks does. It subscribes to all changes and verifies with the update if the computed has changed:

And now we are able to optimize heavy computations at any level using an immutable approach.

## Summary

I hope you found this article interesting. If you want to play around with the experiment you can check out the following two sandboxes: 

### Simple Async Stuff
Here we see how immer-store handles async actions.
[https://codesandbox.io/s/immer-store-async-c8syd](https://codesandbox.io/s/immer-store-async-c8syd)

### TodoMVC
Here we see how immer-store handles computed state in an actual application, also using targeted state for optimal rendering of "completed" toggle. I spent an awful amount of time on the typing for immer-store, so here you see the fruits of that labor. Also look at the console to see what happens under the hood.
[https://codesandbox.io/s/immer-store-todomvc-ixyvx](https://codesandbox.io/s/immer-store-todomvc-ixyvx)

As a conclusion I think this approach has merit, but it depends on how you think about application development. If you do not want use Immer because it feels impure, well, then you would certainly not want to take it a step further. If you do use Immer you have probably asked yourself why you spend so much time and effort boilerplating. This project does allow you to think even less about that.

Personally I am completely happy with controlled mutability, like [Overmind JS](https://overmindjs.org) and [Mobx](https://mobx.js.org/). I do not NEED immutability, it is not a feature, it *allows* certain features and guarantees out of the box. For example time travel and inabilty to wrongly mutate. I have yet to work on a project where lack of immutability has prevented me from implementing the features I need, get control of mutations and using excellent devtools to get insight into my application.

If you depend on immutability, but want to improve the developer experience please fork this project and make something out of it :) I am unable to take on any new projects, but love to help out if you have any questions or want input. No matter, glad you get to the end here and hope it was useful in some sense :-)

