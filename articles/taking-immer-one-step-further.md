[Redux](https://redux.js.org/) had a huge impact on the React ecosystem as it was trying to find its common ground on how to manage application state (global state). It followed the functional purity principles of React itself and despite its ceremonial syntax it was adopted broadly. As time passed other tools started popping up, some with a different approach to manage application state. [Mobx]() is the most noticeable, which basically takes the same principles as [Vue](), but in a more agnostic way. The funny thing is that when Mobx started hitting mainstream in the React community [Vuex]() came out of the Vue team. Vuex basically tries to implement Redux into Vue. 

So here we are. Mobx being adopted for its impurity in an immutable world, and Redux being adopted for its purity in a mutable world. This seems very strange and I think [this presentation from Rich Harris](https://docs.google.com/presentation/d/1PUvpXMBEDS45rd0wHu6tF3j_8wmGC6cOLtOw2hzU-mw/edit) certainly touches on some of the reasons.

Personally **I do not really care** about immutable or mutable, I only care about the developer experience. I would never use a pure API that makes my code "perfect", but constantly blocks my progress because I have to overthink or boilerplate simple things. It just breaks my flow. On the other hand I would never use an API that is "super easy" and later I hit a wall. What makes this even a discussion is the environment we work in. The browser is inherently impure with its mutable DOM, imperative browser APIs and a ton of packages written in a mutable language.

Like many other things a middleground can often be a good solution. In this article we are going to continue on the work by [Michele Westrate]() and his [Immer]() library.

## So what is Immer?

[Immer]() is a library that merges the impure world with the pure world. Basically it allows you to express changes to a value using the native mutation API of JavaScript, but as a result create an immutable result. The reason this came about is the ceremony Redux sets us up for with its reducers:

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
    return
  }
})
```

We are not returning a new value anymore. We are mutating a **draft**. This draft is managed by Immer which returns an immutable result from the reducer. But... we just did an impure thing. We mutated the draft... or did we?

Actually, the result of this approach is even more pure than the initial example. Even though you produce a new value from a reducer using a combination of filters, reducers and spread operators, the returned result itself is **not** immutable. If you were to pass a product value to a third party library it could freely mutate it and cause havoc to your app. With Immer you will at least get an error if such a thing would occur.

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

At the end of the day it is subjective.

## Taking another step

Now that we as a community certainly has become comfortable with doing something impure to get a pure result we can actually take this a step further. Redux is all about splitting **"What happened"** by dispatching actions to reducers which handles **"How to change"**. Although it promises some guarantess it is all very ceremonial. Dispatching, action creators and reducers. Just like Immer helps us better express our intention doing a state change it can also eliminate the need for these ceremonial concepts alltogether and still keep our guarantees.

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
const getProducts = ({ state }, payload) => {
  const products = await api.getProducts()
  
  products.forEach(product => {
    state.products[product.id] = product
  })
}
```

This has nothing to do with less lines of code. This is about expressing intention.

**Let us summarize what we want here:**

1. We want to ensure where state changes can happen
2. We want to be able to track where a state change happened
3. We are comfortable with using an impure approach to better express intention, but have to ensure a pure result

The example you saw above has all these guarantees and it is actually very smart about it. Moving on from here we are going to look at a **proof of concept** that shows how this is possible. I will write about how it works and why it works that way. At the end I hope to at least have made a point and maybe even give a fresh perspective on the tools you use.

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

This store is just like the redux store. It has state, you can subscribe to it and you can dispatch requests for changes. But instead of having to create action creators and dispatch to a reducer you just call the actions. This looks totally wrong, it looks impure, but we have **Immer** running in the background. Lets dive in and see what it does.

Inside of **immer-store** we have this piece of code:

```ts
// We wrap the defined action from the developer
const wrappedAction = (payload) => {
  // Every action execution keeps a reference to its draft, just like a reducer.
  // Unlike a reducer this draft might be recreated as something async, like
  // fetching data from the server will require us to create a new draft
  // when it is done
  let currentDraft

  // To keep track of async execution we can use a simple timeout. This timeout
  // will take any current draft and finalize it, unless we cleared the
  // timeout due to the action finishing its execution
  let timeout

  // This function prepares a new draft and a timeout to possibly
  // asynchronously finalize it
  function configureUpdate() {
    if (!currentDraft) {
      currentDraft = createDraft(currentState)
    }
    clearTimeout(timeout)
    timeout = setTimeout(() => {
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
        configureUpdate()
        return currentDraft[prop]
      },
      deleteProperty(_, prop) {
        configureUpdate()
        return Reflect.deleteProperty(currentDraft, prop)
      },
      set(_, prop, ...rest) {
        configureUpdate()
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
        // this is to activate a new draft
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
