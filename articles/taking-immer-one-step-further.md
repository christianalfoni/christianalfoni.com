[Redux](https://redux.js.org/) had a huge impact on the React ecosystem as it was trying to find its common ground on how to manage application state (global state). It followed the functional purity principles of React itself and despite its ceremonial syntax it was adopted broadly. As time passed other tools with different approaches started popping up. [Mobx](https://mobx.js.org/) is the most notable. It basically takes the same concept of observable values as [Vue](https://vuejs.org/), but in a more agnostic way. The funny thing is that when Mobx started hitting mainstream in the React community [Vuex](https://vuex.vuejs.org/) came out of the Vue team. Vuex basically tries to implement Redux into Vue. 

So here we are. Mobx being adopted for its impurity in an immutable world, and Redux being adopted for its purity in a mutable world. This seems very strange and I think [this presentation from Rich Harris](https://docs.google.com/presentation/d/1PUvpXMBEDS45rd0wHu6tF3j_8wmGC6cOLtOw2hzU-mw/edit) certainly touches on some of the reasons.

Personally **I do not really care** about immutable or mutable, I only care about the developer experience. I would never use a pure API that makes my code technically perfect, but constantly blocks my progress because I have to overthink or boilerplate simple things. On the other hand I would never use an impure API that seems super simple, but later gets me into problems. It is about what gets the job done and me feeling productive.

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

You can of course argue how to best express an intention. Some developers relate better to an imperative impure approach:

```ts
action.products.forEach(product => {
  draft[product.id] = product
})
```

This pure functional approach makes a lot more sense to others:

```ts
{
  ...state,
  ...action.products.reduce((obj, product) => ({
    ...obj,
    [product.id]: product
  }), {})
}
```

We can argue all day about "how the world works" and how to better express intention in code. At the end of the day we build applications in an impure imperative environment called **the browser** and **JavaScript**. Shoving pure principles on top of something inherently impure has consequences. Most noticeably boilerplating and complex APIs.

## Taking another step

Immer with over 2 million downloads a week certainly proves that we have become comfortable with expressing something impure to get a pure result. Let us now take it a step further. Redux is all about splitting **"Request change"** by dispatching actions to reducers which handles **"How to change"**. Although it promises some guarantees it is all very ceremonial. Just like Immer helps us better express our intention in reducers it can also eliminate the need for them completely. And with no reducer there is no need for action creators and dispatching.

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
2. *"We want to be able to track where a state change happened"*. Redux does not track thunks, but immer-store tracks actions. That means you know which actions cause what state changes
3. *"We are comfortable with using an impure approach to better express intention, but have to ensure a pure result"*. With Immer the state changes are actually changes to a draft which results in an immutable result

Moving on from here we are going to look at a **proof of concept** that shows how this API and keeping the guarantees is possible. I will write about how it works and why it works that way. At the end I hope to at least have made a point and maybe even give a fresh perspective on the tools you use. There will be quite a bit of code, so I hope you like code! I do summarize at the end so no worries if you skip them.

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
// This is the factory for creating actions. It wraps the action from the
// developer and injects state and effects. It also manages draft updates
function createAction(
  target: object,
  key: string,
  name: string,
  func: (...args) => any
) {
  target[key] = (payload) => {
    // We want to schedule an async update of the draft whenever
    // a mutation occurs. This just ensures that a new draft is ready
    // when the action continues running. We do not want to create
    // it multiple times though, so we keep a flag to ensure we only
    // trigger it once per cycle
    let isAsync = false

    // We also want a flag to indicate that the action is done running, this
    // ensure any async draft requests are prevented when there is no need
    // for one
    let hasExecuted = false

    // This function indicates that mutations may have been performed
    // and it is time to flush out mutations and create a new draft
    function next() {
      if (hasExecuted) {
        return
      }

      flushMutations(currentDraft)
      currentDraft = createDraft(currentState)
      isAsync = false
    }

    // Whenever a mutation is performed we trigger this function. We use
    // a mutation to indicate this as we might have multiple async steps
    // and only hook to know when a draft is due is to prepare creation
    // of the next draft when working on the current one
    function asyncNext() {
      if (isAsync) {
        return
      }

      isAsync = true
      Promise.resolve().then(next)
    }

    // This function is called when the action is done execution
    // Just flush out all mutations and prepare a new draft for
    // any next action being triggered
    function finish() {
      next()
      hasExecuted = true
    }

    // This is the proxy the manages the drafts
    function createDraftProxy(path: string[] = []) {
      // We proxy an empty object as proxying the draft itself will
      // cause revoke/invariant issues
      const proxy = new Proxy(
        {},
        {
          // Just a proxy trap needed to target draft state
          getOwnPropertyDescriptor(_, prop) {
            // We only keep track of the path in this proxy and then
            // use that path on the current draft to grab the current
            // draft state
            const target = getTarget(path, currentDraft)

            return Reflect.getOwnPropertyDescriptor(target, prop)
          },
          // Just a proxy trap needed to target draft state
          ownKeys() {
            const target = getTarget(path, currentDraft)

            return Reflect.ownKeys(target)
          },
          get(_, prop) {
            // Related to using computed in an action we rather want
            // to use the base immutable state. We do not want to
            // allow mutations inside a computed and the returned
            // result should not be mutated either
            if (prop === GET_BASE_STATE) {
              return currentState
            }

            const target = getTarget(path, currentDraft)

            // We do not need to handle symbols
            if (typeof prop === 'symbol') {
              return target[prop]
            }

            // We produce the new path
            const newPath = path.concat(prop as string)

            // If we point to a function we need to handle that
            // by returning a new function which manages a couple
            // of things
            if (typeof target[prop] === 'function') {
              return (...args) => {
                // If we are performing a mutation, which happens
                // to arrays, we want to handle that
                if (arrayMutations.has(prop.toString())) {
                  // First by preparing for a new async draft,
                  // as this is a mutation
                  asyncNext()
                  log(
                    LogType.MUTATION,
                    `${name} did a ${prop
                      .toString()
                      .toUpperCase()} on path "${path.join('.')}"`,
                    ...args
                  )
                }

                // Then we bind the call of the function to a
                // new draftProxy so that we keep proxying
                return target[prop].call(createDraftProxy(path), ...args)
              }
            }

            // If object, array or function we return it in
            // a wrapped proxy
            if (typeof target[prop] === 'object' && target[prop] !== null) {
              return createDraftProxy(newPath)
            }

            // Or we just return the value
            return target[prop]
          },
          // This is a proxy trap for assigning values,
          // where we want to perform the assignment on
          // the draft target and also prepare async draft
          set(_, prop, value) {
            const target = getTarget(path, currentDraft)

            asyncNext()
            log(
              LogType.MUTATION,
              `${name} did a SET on path "${path.join('.')}"`,
              value
            )
            return Reflect.set(target, prop, value)
          },
          // This is a proxy trap for deleting values,
          // same stuff
          deleteProperty(_, prop) {
            const target = getTarget(path, currentDraft)

            asyncNext()
            log(
              LogType.MUTATION,
              `${name} did a DELETE on path "${path.join('.')}"`
            )
            return Reflect.deleteProperty(target, prop)
          },
          // Just a trap we need to handle
          has(_, prop) {
            const target = getTarget(path, currentDraft)

            return Reflect.has(target, prop)
          },
        }
      )

      return proxy
    }

    // We call the defined function passing in the "context"
    const actionResult = func(
      {
        state: createDraftProxy(),
        // We also pass in the effects. We could also use a proxy here to
        // track execution of effects, useful for debugging
        effects: config.effects,
      },
      // And we pass whatever payload was passed to the original action
      payload
    )

    // If the action returns a promise (probably async) we wait for
    // it to finish. This indicates that it is time to flush out any
    // mutations and indiciate a stop of execution
    if (actionResult instanceof Promise) {
      actionResult
        .then(() => {
          finish()
        })
        .catch(() => console.log('error', name))
    } else {
      // If action stops synchronously we immediately finish up
      // as those mutations needs to be notified to components.
      // Basically handles inputs. A change to an input must run
      // completely synchronously. That means you can never change
      // the value of an input in your state store with async/await.
      // Not special for this library, just the way it is
      finish()
    }

    return actionResult
  }

  return target
}
```

In short what we did here:

1. We wrap the defined action from the developer
2. We have a global reference to an Immer draft that is accessible by the action. This draft might be updated several times through async execution inside the action and other actions
3. We create a Proxy which wraps the current global draft. This allows us to intercept access to the draft so that we can make sure we always have a new draft available for the next async change
4. We finalize the draft as soon as the action is done executing. If it returns a promise (async/await), we wait for that promise to resolve to stop creating any new drafts

This is pretty much it. In addition we are able to produce quite a bit of debugging data. First of all we know what action has been triggered and with the proxy we know exactly what kind of mutations you are performing to the draft.

But we can improve more code here.

## Skip mapping state into components

With an immutable approach you have to map what state a component needs. This is necessary so that whenever the store emits an update the component can check if any of the mapped state has changed. This is typically expressed as:

```tsx
function MyComponent() {
  const todos = useSelector(state => state.todos)
}
```

This is very straightforward and does not require any improvements in my opinion. But what if you want to extract multiple states?

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

Now we see the boilerplate emerging. Because the object returned from the **useSelector** callback is new every time, we need to pass a second argument to let it know how to figure out when the state has actually changed. Also we have duplicate destructuring, it is not ideal.

Since Immer tells us exactly what state has changed we can track what state components are looking at and match this data. We create a proxy which wraps the current state of the app and tracks whatever the component access. This allows us to express the selectors as:

```tsx
function MyComponent() {
  const { config, issues } = useAppState()
}
```

Whatever the component access will cause it to render if changed. But how is this actually implemented? Let us have a look at the code

```ts
// This proxy manages tracking what components are looking at
function createPathTracker(
  state,
  tracker: { paths: Set<string>; cache?: WeakMap<object, object> },
  path: string[] = []
) {
  // We can not proxy the state itself because that is already a proxy
  // that will be revoked, also causing this proxy to be revoked. Also
  // the state protects itself with "configurable: false" which
  // creates an invarient
  const proxyObject = {}
  const proxy = new Proxy(proxyObject, {
    // When a property descriptor is asked for we make our proxy object
    // look like the state target, preventing any invariant issues
    getOwnPropertyDescriptor(_, prop) {
      // We only track the current path in the proxy and we have access
      // to root state, by reducing the path we quickly get to the
      // property asked for. This is used throughout this proxy
      const target = getTarget(path, state)

      Object.defineProperty(
        proxyObject,
        prop,
        // @ts-ignore
        Object.getOwnPropertyDescriptor(target, prop)
      )

      return Reflect.getOwnPropertyDescriptor(target, prop)
    },
    // Just make sure we proxy the keys from the actual state
    ownKeys() {
      const target = getTarget(path, state)

      return Reflect.ownKeys(target)
    },
    get(_, prop) {
      const target = getTarget(path, state)

      // We do not track symbols
      if (typeof prop === 'symbol') {
        return target[prop]
      }

      const newPath = path.concat(prop as string)
      tracker.paths.add(newPath.join('.'))

      // If we are calling a function, for example "map" we bind
      // that to a new pathTracker so that we keep proxying the
      // iteration
      if (typeof target[prop] === 'function') {
        return target[prop].bind(createPathTracker(state, tracker, path))
      }

      // If we have an array, object or function we create a proxy
      // around it
      if (typeof target[prop] === 'object' && target[prop] !== null) {
        // We first check if this object already has a proxy, so
        // that we ensure the equality is kept. If not, we create
        // a new proxy and add it if we have a cache. We do not
        // use a cache on targeted state, as that only triggers
        // when the targeted state actually changes
        const cached = tracker.cache && tracker.cache.get(target[prop])

        if (cached) {
          return cached
        }

        const proxy = createPathTracker(state, tracker, newPath)

        if (tracker.cache) {
          tracker.cache.set(target[prop], proxy)
        }

        return proxy
      }

      // Any plain value we return as normal
      return target[prop]
    },
    // This trap must also be proxied to the target state
    has(_, prop) {
      const target = getTarget(path, state)

      return Reflect.has(target, prop)
    },
  })

  return proxy
}
```

This might seem magical to you, but it really is not. We are just intercepting any pointer into our state and updating a set of paths that the component accesses. The complicated bits are related to that Immer also creates proxies and configures properties to avoid mutation. This makes it impossible to just proxy the exact state, we have to proxy via a fake object that we can manipulate. If you think this is crazy, look into any framework. Everybody has code where you want to take a shower after just looking at it.

Let us just forget this part and rather look at how this proxy is used:

```ts
// For typing support we allow you to create a state hook
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

    // We grab the instance from the context
    const instance = React.useContext(context)

    // It might not be there, where we throw an error at the end
    if (instance) {
      // Since we deal with immutable values we can use a plain "useState"
      // from React to handle updates from the store
      const [state, updateState] = React.useState(instance.state)

      // Since our subscription ends async (useEffect) we have to
      // make sure we do not update the state during an unmount
      const mountedRef = React.useRef(true)

      // We set it to false when the component unmounts
      React.useEffect(
        () => () => {
          mountedRef.current = false
        },
        []
      )

      // We create a track which holds the current paths and also a
      // proxy cache. This cache ensures that same objects has the
      // same proxies, which is important for comparison in React
      const tracker = React.useRef({
        paths: new Set<string>(),
        cache: new WeakMap<object, object>(),
      })

      // We always clear out the paths before rendering, so that
      // we can collect new paths
      tracker.current.paths.clear()

      // If we are targeting state (nested tracking) that would be
      // a callback as first argument to our "useState" hook
      const targetState = arguments[0]

      // By default we expose the whole state, though if a callback
      // is received this targetPath will be replaced with whatever
      // path we tracked to expose a nested state value
      let targetPath: string[] = []

      // If we have a callback to nested state
      if (targetState) {
        // We create a new SET which will be populated with whatever
        // state we point to in the callback
        const targetPaths = new Set<string>()

        // By creating a pathTracker we can populate this SET
        targetState(createPathTracker(state, { paths: targetPaths }))

        // We only want the last path, as the is the complete path
        // to the value we return ex. useState(state => state.items[0]),
        // we track "items", "items.0". We only want "items.0"
        const lastTrackedPath = Array.from(targetPaths).pop()

        // Then we update our targetPath
        targetPath = lastTrackedPath ? lastTrackedPath.split('.') : []
      }

      React.useEffect(() => {
        // We subscribe to the accessed paths which causes a new render,
        // which again creates a new subscription
        return instance.subscribe(
          (update) => {
            log(
              LogType.COMPONENT_RENDER,
              `"${name}", tracking "${Array.from(tracker.current.paths).join(
                ', '
              )}"`
            )

            // We only update the state if it is actually mounted
            if (mountedRef.current) {
              updateState(update)
            }
          },
          tracker.current.paths,
          name
        )
      })

      // Lastly we return a pathTracker around the actual state
      // we expose to the component
      return targetPath.length
        ? createPathTracker(state, tracker.current, targetPath)
        : createPathTracker(state, tracker.current)
    }

    throwMissingStoreError()
  }

  return useState
}
```

There is certainly more going on here than in a [pure immutable approach](https://github.com/reduxjs/react-redux/blob/5.x/src/connect/selectorFactory.js), and you naturally start worrying about performance. It is incredibly difficult to compare performance of a tracking approach and a value comparison approach. Let us look at where the overhead and benefit is:

### Overhead
- **tracking overhead**: The overhead is in wrapping and accessing the state through a proxy
- **value comparison overhead**: The overhead is that every single component accessing state has to figure out if it should update on every state change

### Benefit
- **tracking benefit**: When a state change occurs an exact match can be made to a component. That means if `products[0].price` changes, only components actually looking at the price will update
- **value comparison benefit**: Almost no overhead exposing state to components

The results of any performance test here would vary depending on the application. But in reality it does not matter. What matters is the developer experience. I am **not** saying that there are no edge cases where you might need to think really hard about state and how it affects rendering. In my opinion you should not constantly be exposed to these low level implementation details.

So let us talk about real performance concerns.

## Handling performance

The most typical example of where performance becomes a concern is with lists, especially lists where each individual item in that list can change some property. Think a list of stocks where the value of a single stock changes. Ideally you only want to reconcile that single stock in the list, not even touching the component responsible for the list itself.

Let us see how this plays out with a traditional approach:

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

In this example we are not passing in the stock itself, we rather pass in the id of the stock. This allows the **Stock** component to track the stock itself. That means if any stock changes its value only the component looking at that specific value will reconcile. The list is not touched as it does not look at the value of any stocks. It will only reconcile if a stock is added or removed.

Maybe you are thinking that you can do the same with Redux, but you can`t. The reason is that the **StocksList** component, and all other components, will be notified when a stock changes. Due to immutability also the stock dictionary changes when a single stock change. Since our **StocksList** component is comparing changes to the stocks dictionary it will reconcile on any change to a stock.

Again, this is not a typical scenario, but it is a scenario where you actually should care about performance, and tracking has benefits in those scenarios. Please comment below if you have other scenarios where this statement is not true.

## Computing state

There is this other concept we also have to find a place for and that is computing state, or memoizing derived state. A very popular project in the Redux community, [reselect](https://github.com/reduxjs/reselect), does this by comparing arguments and figuring out if they have changed.

There are several benefits to this approach:

1. It is just value comparison
2. You can easily compose them together
3. They can be used globally in your app or each component can use them

Other libraries like [Mobx](https://mobx.js.org/) and [Overmind JS](https://overmindjs.org) also compute state and they do it by automatically tracking what state is being used in the computation. These are simpler APIs and their effectiveness is always optimal because you, as a developer, is not involved. It just tracks what you use. 

For the sake of this experiement, where we introduced tracking to optimally render components and simplify the API, I decided to rather go with **reselect** to compute state. Let's see if we can merge the two concepts.

The tricky thing though is that we want to use computed state in both actions and components, but the states exposed are different. In actions the state can be mutated, because the state exposed is a draft. We certainly do not want mutations to occur in a computed. In the components we are tracking state, though a computed might return a cached value, so the tracking would not work.

First let us solve the actions. If you remember from before the state we pass into actions is wrapped in a proxy we control. That means we can use it to extract the current immutable state when passed into computeds. It does require us to create our own **createComputed** function as a wrapper around **createSelector**. This is how it works:

```ts
export const createComputed: typeof createSelector = (...args: any[]) => {
  // @ts-ignore
  const selector = createSelector(...args)

  // GET_BASE_STATE is a symbol that only the action proxy handles.
  // It returns the current immutable state instead of the draft
  return (state) => selector(state[GET_BASE_STATE] || state)
}
```

And now we need to solve components. Since we have our own computed API we can also expose our own hook, **useComputed**. This hook does not track paths and subscribes to those paths, rather it does what Redux hooks does. It subscribes to all changes and verifies with the update if the computed has changed:

```ts
// This hook handles computed state, via reselect
// It subscribes globally (no paths) and will be
// notified about any update to state and calls the selector
// with that state. Since "React.useState" only triggers when
// the value actually changes, we do not have to handle that
export function createComputedHook<C extends Config<any, any, any>>() {
  return <T>(selector: (state: C['state']) => T): T => {
    const instance = React.useContext(context)

    if (instance) {
      const [state, updateState] = React.useState(selector(instance.state))

      // Since our subscription ends async (useEffect) we have to
      // make sure we do not update the state during an unmount
      const mountedRef = React.useRef(true)

      // We set it to false when the component unmounts
      React.useEffect(
        () => () => {
          mountedRef.current = false
        },
        []
      )

      React.useEffect(() => {
        // We subscribe to any update
        return instance.subscribe((update) => {
          if (mountedRef.current) {
            // Since React only renders when this state value
            // actually changed, this is enough
            updateState(selector(update))
          }
        })
      })

      return state
    }

    throwMissingStoreError()

    // @ts-ignore
    return
  }
}
```

And now we are able to optimize heavy computations at any level using an immutable approach.

## Caveats

React encourages immutability so that it can take advantage of **value comparison**. When we perform tracking in components we wrap all objects in a proxy. We have to make sure that the proxy reference stays the same for the underlying objects or the value comparison breaks in the component. This is taken care of by **immer-store** within a component, though some scenarios is considered caveats.

- When you extract a state object in two different components and compare them, by for example from a parent to a child, they will not be equal:

```tsx
function MyChildComponent({ object }) {
  const state = useAppState()

  state.object === object // This becomes false
}

function MyComponent() {
  const state = useAppState()

  return <MyChildComponent object={state.object} />
}
```

**Note!** React.memo works as normal

- If you are to memoize a react hook, you have to memoize the exact values:

```ts
function MyComponent() {
  const state = useAppState()

  React.useEffect(() => {
    // This will not work, you would have to memoize
    // "state.foo"
    return someSideEffect(state.foo)
  }, [state])

  return <div />
}
```

- Targeted state is a not a concept to expose specific state, but to **track** specific state:

```ts
function MyComponent({ id }) {
  // You alway point to a single value in the state
  const entity = useAppState((state) => state.entities[id])

  // If you just wanted to expose it and still track changes to "entities"
  // as well
  const entity2 = useAppState().entities[id]

  return <div />
}
```

Most solutions has some sort of caveats or at least confusing results using an API. Personally I do not consider these caveats a dealbreaker, but you might feel differently. If you do, please comment below.

## Summary

I hope you found this article interesting. If you want to play around with the experiment you can check out the following two sandboxes: 

### Complex Async Stuff
Here we see how immer-store handles async actions.
[https://codesandbox.io/s/immer-store-complex-async-ktb6m](https://codesandbox.io/s/immer-store-complex-async-ktb6m)

### TodoMVC
Here we see how immer-store handles computed state in an actual application, also using targeted state for optimal rendering of "completed" toggle. I spent an awful amount of time on the typing for immer-store, so here you see the fruits of that labor. Also look at the console to see what happens under the hood.
[https://codesandbox.io/s/immer-store-todomvc-ixyvx](https://codesandbox.io/s/immer-store-todomvc-ixyvx)

**As a conclusion I think this approach has merit**, but it depends on how you think about application development. If you do not want to use Immer because it feels impure, well, then you would certainly not want to take it a step further. If you do use Immer you have probably asked yourself why you spend so much time and effort boilerplating. This project does allow you to think even less about that.

Personally I am completely happy with controlled mutability, like [Overmind JS](https://overmindjs.org) and [Mobx](https://mobx.js.org/). I do not NEED immutability, it is not a feature, it just *allows* certain features and guarantees out of the box. For example time travel and inability to wrongly mutate. I have yet to work on a project where lack of immutability has prevented me from implementing the features I need, getting control of mutations and using excellent devtools to get insight into my application.

If you depend on immutability, but want to improve the developer experience please fork this project and make something out of it. I am unable to take on any new projects, but I'd love to help out if you have any questions or want input. Either way, I'm glad you get to the end here and hope it was useful in some sense :-)

Big shoutout to the people at [Frontity](https://frontity.org) for complex async challenges and motivating me to take the project beyond a "half working thing"... it actually seems to be a valid library already!

