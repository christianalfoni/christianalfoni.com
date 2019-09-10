[Redux](https://redux.js.org/) had a huge impact on the React ecosystem as it was trying to find its common ground on how to manage application state (global state). It followed the functional purity principles of React itself and despite its ceremonial syntax it was adopted broadly. As time passed other tools started popping up, having a different approach to manage this application state. [Mobx]() is the most noticeable, which basically takes the same principles as [Vue](), but in a more agnostic way. The funny thing is that when Mobx started hitting mainstream in the React community [Vuex]() came out of the Vue team. Vuex basically tries to implement Redux into Vue. 

So here we are. Mobx being adopted for its mutability in a pure world, and Redux being adopted for its purity in a mutable world. This seems very strange. I think [this presentation from Rich Harris](https://docs.google.com/presentation/d/1PUvpXMBEDS45rd0wHu6tF3j_8wmGC6cOLtOw2hzU-mw/edit) actually nails the reason. This purity train React is riding, *UIs are a function of state*, is not real. It is a beautiful idea, but in reality it breaks down very quickly. As developers working in the browser environment we know this, but we so badly want what React is telling us to be true.

I love React. It is an amazing tool for two reasons:

1. I can express my UI as a plain function, using all the power of JavaScript
2. With Typescript I get superior typing support (cause it is just Javascript)

I need this and no other library provides it as elegantly as React. That said, I do not share this quest for purity in the React ecosystem. Why? It hurts my productivity and joy building stuff!

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

We are not returning a new value anymore. We are mutating a **draft**. This draft is managed by Immer which returns an immutable result from the reducer. But... we just did an impure thing, mutating the draft, to do something pure.

Actually, the result of this approach is even more pure than the example above. The reason being that even though you produce a new value from a reducer using a combination of filters, reducers and spread operators, the returned result itself is **not** immutable. If you were to pass a product to a third party library it could freely mutate it and cause havoc to your app. With Immer you will at least get an error if such a thing would occur.

Immer is such a freak of nature, it has become immensely popular despite its split personality. What does that tell us? I think Rich Harris is right. We just want to be productive and express our intentions the best possible way. You can of cause argue how to best express an intention, but at the end of the day it is subjective. Many developer things this:

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

In a world where Javascript actually had immutability Immer would probably not exist.

## Taking another step

Now that we as a community certainly has become comfortable with doing something impure to get a pure result we can actually take this a step further. Redux is all about splitting **"What happened"** by dispatching actions to reducers that knows **"How to change"**. But this is all ceremonial. Dispatching, action creators and reducers. Just like Immer helps us better express our intention doing a state change it can also eliminate the need for a dispatching, action creators and reducers alltogheter.

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

And this has nothing to do with less lines of code. This is about expressing intention. In the Redux example you would at least have to visit 2 different files, maybe three files, to get a complete picture of what is actually happening. "But woh... take a step back here, are we not giving up some guarantees here?".

**Let us summarize what we want here:**

1. We want to ensure where state changes can happen
2. We want to be able to track where a state change happened
3. We are comfortable with using an impure approach to better express intention, but have to ensure a pure result

The example you saw above has all these guarantees and it is actually very smart about it. Moving on from here we are going to look at a **proof of concept** that shows how this is possible. I will write about how it works and why it works that way. At the end I hope to at least have made a point and maybe even inspired you to take this project further.

## 