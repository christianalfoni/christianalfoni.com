[Redux](https://redux.js.org/) had a huge impact on the React ecosystem as it was trying to find its common ground on how to manage application state (global state). It followed the functional purity principles of React itself and despite its ceremonial syntax it was adopted broadly. As time passed other tools, with different approaches started popping up. [Mobx](https://mobx.js.org/) is the most noticeable, which basically takes the same principles as [Vue](https://vuejs.org/), but in a more agnostic way. The funny thing is that when Mobx started hitting mainstream in the React community [Vuex](https://vuex.vuejs.org/) came out of the Vue team. Vuex basically tries to implement Redux into Vue. 

So here we are. Mobx being adopted for its impurity in an immutable world, and Redux being adopted for its purity in a mutable world. This seems very strange and I think [this presentation from Rich Harris](https://docs.google.com/presentation/d/1PUvpXMBEDS45rd0wHu6tF3j_8wmGC6cOLtOw2hzU-mw/edit) certainly touches on some of the reasons.

Personally **I do not really care** about immutable or mutable, I only care about the developer experience. I would never use a pure API that makes my code "perfect", but constantly blocks my progress because I have to overthink or boilerplate simple things. It just breaks my flow. On the other hand I would never use an API that is "super easy" and later I hit a wall. Like many other things a middleground can often be a good solution. In this article we are going to continue on the work by [Michele Westrate](https://twitter.com/mweststrate) and his [Immer](https://github.com/immerjs/immer) library to see where such a middleground could take us.

## So what is Immer?

**Immer** is a library that merges the impure world with the pure world. Basically it allows you to express changes to a value using the native mutation API of JavaScript, but as a result create an immutable result. The reason this came about is the ceremony Redux sets us up for with its reducers:

```ts
const productsById = (state, action) => {
  switch (action.type) {
    case RECEIVE_PRODUCTS:
      return {
        ...state,
        ...action.products.reduce((obj, product) => {
          obj[product.id] = product
          return obj
        }, {})
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

Even though the initial example produces a new value from a reducer using a combination of filters, reducers and spread operators, the returned result itself is **not** immutable. If you were to pass any of the returned state  to a third party library it could freely mutate it and cause havoc to your app. With Immer you will get an error if such a thing would occur.

You can of course argue how to best express an intention. Many developer thinks this:

```ts
action.products.forEach(product => {
  draft[product.id] = product
})
```

better expresses updating a map of products than:

```ts
{
  ...state,
  ...action.products.reduce((obj, product) => {
    obj[product.id] = product
    return obj
  }, {})
}
```

At the end of the day it is subjective. What we can say objectively though is that JavaScript does not have an immutable API. Until it does, performing immutable operations will require some degree of boilerplate.

## Taking another step

Immer with over 2 million downloads a week certainly proves that we have become comfortable with expressing something impure to get a pure result. Let us now take it a step further. Redux is all about splitting **"Request change"** by dispatching actions to reducers which handles **"How to change"**. Although it promises some guarantess it is all very ceremonial. Dispatching, action creators and reducers. Just like Immer helps us better express our intention doing a state change it can also eliminate the need for these ceremonial concepts alltogether and still keep our guarantees.

Let us look at the products example again more completely:

```ts
// action creator
const receiveProducts = (products) => ({
  "type": RECEIVE_PRODUCTS,
  products
})

// thunk
const getProducts = () => async (dispatch) => {
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
const getProducts = (state, payload) => {
  const products = await api.getProducts()
  
  products.forEach(product => {
    state.products[product.id] = product
  })
}
```

This has nothing to do with less lines of code. This is about expressing intention. We want to express the flow of asking for products, getting them and inserting them into our state. But what about our guarantees?

**Let us summarize what we want:**

1. We want to ensure where state changes can happen
2. We want to be able to track where a state change happened
3. We are comfortable with using an impure approach to better express intention, but have to ensure a pure result

Moving on from here we are going to look at a **proof of concept** that shows how this API and keeping the guarantees is possible. I will write about how it works and why it works that way. At the end I hope to at least have made a point and maybe even give a fresh perspective on the tools you use.

## Immer-store

The project is just called **immer-store** and it is built as an exercise to explore this fascinating mix of mutable APIs for immutable result.

Let us first look at the traditional count example to see how the API looks:

```ts
import { createStore } from 'immer-store'

const store = createStore({
  state: {
    count: 0
  },
  actions: {
    increaseCount: (state) => {
      state.count++
    },
    decreaseCount: (state) => {
      state.count--
    }
  }
})
```

This store is just like the redux store. It has state, you can subscribe to it and you can dispatch requests for changes. But instead of having to create action creators and dispatch to a reducer you just call the actions.

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
2. We keep a reference to an Immer draft that might update during asynchronous execution
3. We create a Proxy which manages creating new drafts for us
4. We finalize the draft when the action is done running or whenever the state object has been accessed asynchronously during execution

This is pretty much it. In addition we are able to produce quite a bit of debugging data. First of all we know what action has been triggered and Immer tells us what paths in our state is changing. That means we can show the developer exactly what logic is triggered and what state changes it makes.

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

Now we see the boilerplate start emerging. Because the object returned from the **useSelector** callback is new every time, we need to pass a second argument to let it know how to figure out when the state has actually changed. Also we see a double destructure of the same state, it is just bloated.

Since we know exactly what state changes, due to Immer, we can actually track what state components are looking at as well. Now, this is part of Immer, but we can create our own **trackStateAccessProxy**. That means we can safely do:

```tsx
function MyComponent() {
  const { config, issues } = useAppState()
}
```

Whatever the component access will cause it to render if changed. So how does this work?

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

This might seem crazy magical to you, but it really is not. We are just intercepting any pointer into our state and updating a set of paths that the component accesses. So let us see how our hook uses this proxy:

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
- **tracking**: The overhead is in exposing and accessing the state
- **value comparison**: The overhead is that every single component accessing state has to figure out if it should update on every state change

### Benefit
- **tracking**: When a state change occurs the path of the change is matched with a list of subscribers (components) on that path
- **value comparison**: Almost no overhead exposing state to components

The results of any performance test here would vary depending on the application. But in reality it does not matter. What matters is the developer experience and how you handle edge cases where performance actually does matter.

## Handling performance scenarios

The most typical example of where performance becomes a concern is with lists, especially lists where each item in that list can possible change some property on itself. Ideally you only want to reconcile that single item in the list, not even touching the component responsible for the list itself.

Let us see how this plays out:

```tsx
const ListItem = ({ item }) => {
  return (
    <li>
      {item.title}
      {item.isAwesome}
    </li>
  )
}

const MyList = () => {
  const list = useSelector(state => state.list)

  return (
    <ul>
      list.map((item) => (
        <ListItem key={item.id} item={item} />
      ))
    </ul>
  )
}
```

In this case we are passing the item itself. To avoid having to reconcile every item in the list on any change to any item we must first use **React.memo**:


```tsx
const ListItem = React.memo(({ item }) => {
  return (
    <li>
      {item.title}
      {item.isAwesome}
    </li>
  )
})

const MyList = () => {
  const items = useSelector(state => state.items)

  return (
    <ul>
      {Object.values(items).map((item) => (
        <ListItem key={item.id} item={item} />
      ))}
    </ul>
  )
}
```

This is what you do with lists no matter. It just ensures that if the item has not changed, reconciling the **ListItem** component is avoided. But the **MyList** component will still have to reconcile on any change to any item and there is really no way to avoid this with a traditional approach. What we can do with **immer-store** though is to target nested state.

```tsx
const ListItem = React.memo(({ id }) => {
  const item = useAppState(state => state.items[id])

  return (
    <li>
      {item.title}
      {item.isAwesome}
    </li>
  )
})

const MyList = () => {
  const state = useAppState()

  return (
    <ul>
      {Object.keys(state.items).map((itemId, index) => (
        <ListItem key={item.id} id={itemId} />
      ))}
    </ul>
  )
}
```

In this example we are not passing in the **item** itself, we rather pass in the id of the item. This allows the **ListItem** component to track the item itself. That means if we were to for example change the **isAwesome** state of an item only a single **ListItem** component would render again. There would not be any need fo rthe **MyList** to reconcile as it is not specifically looking at this state, it only cares about adding/removing keys from the **items** state.

## Computing state


