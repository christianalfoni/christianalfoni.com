Popularized by [Redux](https://redux.js.org) and later becoming one of the [core hooks of React](https://reactjs.org/docs/hooks-reference.html#usereducer), the **reducer** is one of the "go to" tools for state management . It looks something like...

```ts
export const todos = (todos = [], action) => {
  switch (action.type) {
    case "ADD_TODO": {
      return todos.concat(action.todo);
    }
    case "REMOVE_TODO": {
      return todos.filter((todo) => todo.id !== action.id);
    }
  }

  return todos;
};
```

It effectively isolates state and how changes are made to that state. It also treats its current state as an immutable value, meaning that any changes results in a brand new state value. This is super helpful for React, as its reconciliation is based on value comparison.

We call the list of todos **state**, but we rarely express state as a single value. A typical reducer might look more like:

```ts
export const todos = (
  state = { data: [], isLoading: false, error: null },
  action
) => {
  switch (action.type) {
    case "FETCH_TODOS": {
      return {
        ...state,
        isLoading: true,
      };
    }
    case "FETCH_TODOS_SUCCESS": {
      return {
        ...state,
        isLoading: false,
        data: action.data,
      };
    }
    case "FETCH_TODOS_ERROR": {
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };
    }
    case "ADD_TODO": {
      return {
        ...state,
        data: state.data.concat(action.todo),
      };
    }
    case "REMOVE_TODO": {
      return {
        ...state,
        data: state.data.filter((todo) => todo.id !== action.id),
      };
    }
  }

  return todos;
};
```

Now the state is represented by multiple values. Values that are related to each other, but has no relationship.

## What does state mean?

When we use the term **state** we actually mean two different things. We use the term **state** when we talk about the values representing the state. In the example above `todos`, `isLoading` and `error` is all referred to as state. But we also talk about the state of the reducer, it being in a **loading** state, **error** state and even **not_loaded** and **loaded** state.

- `{ isLoading: true, ... }` is a **loading** state
- `{ isLoading: false, error: 'Some message', ... }` is an **error** state
- `{ isLoading: false, data: [], ... }` is a **not_loaded** state
- `{ isLoading: false, data: [...], ... }` is a **loaded** state, where the dots represent one or multiple todos

But when we express our state only through state values and not explicit states we create problems.

1. It is possible to express `{ isLoading: true, error: "some error" }` and whoever consumes these values has to decide which state it really represents

2. An empty todos array does not necessarily mean it has not been loaded. Maybe there are no todos in the storage

3. If we were to represent no todos as `{ data: null }` we would get into a different problem. You would always have to check if the value is `null` before consuming it

4. We are not guarding our action dispatches. In this example that means you would be able to set an error even after you have loaded the todos. It also means you would be able to add todos while it is loading, maybe resulting in your added todos being removed when the fetching resolves, as it replaces the data value

My point here is that the reducer never represents any of its states, it just has a bunch of values we call state.

## Replacing a term

To better talk about this we have to separate the term **state** from **state values**. I will use the term **state** and **context**.

A reducer can have multiple **states** where each **state** introduces a **context**. The **context** IS the state with its related values. This can best be expressed with typing:

```ts
type Context =
  | {
      state: "ERROR";
      error: string;
    }
  | {
      state: "NOT_LOADED";
    }
  | {
      state: "LOADING";
    }
  | {
      state: "LOADED";
      data: Todo[];
    };
```

The way we can talk about our reducer now is that it has four states. `ERROR`, `NOT_LOADED`, `LOADING` and `LOADED`. Two of these states has related values in their **context**. `ERROR` having an error message and `LOADED` having the list of todos.

## Implementing the context

There is not much we have to change:

```ts
export const todos = (context = { state: "NOT_LOADED" }, action) => {
  switch (action.type) {
    case "FETCH_TODOS": {
      return {
        state: "LOADING",
      };
    }
    case "FETCH_TODOS_SUCCESS": {
      return {
        state: "LOADED",
        data: action.data,
      };
    }
    case "FETCH_TODOS_ERROR": {
      return {
        state: "ERROR",
        error: action.error,
      };
    }
    case "ADD_TODO": {
      return {
        state: "LOADED",
        data: context.data.concat(action.todo),
      };
    }
    case "REMOVE_TODO": {
      return {
        state: "LOADED",
        data: context.data.filter((todo) => todo.id !== action.id),
      };
    }
  }

  return todos;
};
```

Now we are explicitly transitioning the reducer to a new state, with any accompanying values in the context it represents. With TypeScript by our side it is impossible to go wrong with this. In addition TypeScript will properly help us to understand what values are available in the different states.

```ts
if (todos.state === "LOADED") {
  // todos.data is now available
}
if (todos.state === "ERROR") {
  // todos.error is now available
}
```

## Guarding transitions

By default reducers allows an action to be handled no matter what the actual state of the reducer is. This can get us into problems in a variaty of ways. A specific example of this, which is not unlikely, is added todos suddenly disappearing.

Imagine you are implementing this reducer and fetching todos from a server. Since you are working in your local environment the todos are instantly fetched, meaning you never have a chance to add a todo before the fetching is resolved. Everything is working and you ship it to production.

Now somebody with a bad internet connection is opening the app and the fetching of the initial todos takes a long time. The user is able to add a todo in the meantime. As soon as the fetching of todos is resolved, the list of todos is replaced and the user sees their added todo disappear. This type of bug is very common and it is often difficult to spot.

Now, you could say that you would just disable the input for adding a new todo while it is loading. And yeah, that would indeed work. But now you have split your application logic between a reducer and an HTML attribute. That is fragile. Especially in larger teams where the person implementing the reducer might not be the same person implementing the UI. You could of course also just `concat` the fetched todos with the existing array. But bare with me here, this is just an example to show how mistakes are made.

Moving on... Guarding a transition basically means, "at certain states, only certain actions will be handled". Let us first see how this can be expressed:

```ts
export const todos = (context = { state: "NOT_LOADED" }, action) =>
  transition(context, action, {
    NOT_LOADED: {
      FETCH_TODOS: () => ({
        state: "LOADING",
      }),
    },
    LOADING: {
      FETCH_TODOS_SUCCESS: (_, { data }) => ({
        state: "LOADED",
        data,
      }),
      FETCH_TODOS_ERROR: (_, { error }) => ({
        state: "ERROR",
        error: error.message,
      }),
    },
    LOADED: {
      ADD_TODO: ({ state, data }, { todo }) => ({
        state,
        data: data.concat(todo),
      }),
      REMOVE_TODO: ({ state, data }, { id }) => ({
        state,
        data: data.filter((todo) => todo.id !== id),
      }),
    },
  });
```

With this declarative mapping of possible states, what events to deal with within each state and transitioning to new states, we guard our logic.

The implementation of `transition` is very straight forward. It basically maps an incoming action to the current state of the reducer to see if it should be handled:

```ts
const transition = (context, action, transitions) => {
  const transition = transitions[context.state][action.type];

  if (!transition) {
    return context;
  }

  return transition(context, action);
};
```

And here with typing:

```ts
const transition = <
  Context extends { state: string },
  Action extends { type: string },
  NewState extends Context["state"]
>(
  context: Context,
  action: Action,
  transitions: {
    [State in Context["state"]]: {
      [Type in Action["type"]]?: <R extends Context>(
        context: Context extends { state: State } ? Context : never,
        action: Action extends { type: Type } ? Action : never
      ) => Context extends { state: NewState } ? Context : never;
    };
  }
): Context => {
  // @ts-ignore
  const transition = transitions[context.state][action.type];

  if (!transition) {
    return context;
  }

  return transition(context, action);
};
```

If you have been reflecting on this you might want to point out something. We did not really fix the issue with our user adding a todo while fetching them from the server. Now nothing would happen at all if the user adds a todo while we are fetching. Well, that is way better, right? In the previous scenario the user would probably end up adding the todo a second time when it was removed. When they load the todos from the server again, at a later point, they will suddenly have two entries of the same todo.

Guarding transitions does not necessarily fix the user experience, it just makes implementing the user experience more predictable.

## Invalid transitions

As you might have noticed in our implementation, we gracefully just ignore any reducer updates when a transition is not valid. That means we are preventing invalid logic inside the reducer to run. Let us see how this helps us deal with logic outside of the reducer:

```ts
const TodosContainer = () => {
  const [context, dispatch] = useReducer(todosReducer, { state: "NOT_LOADED" });

  const fetchTodos = useCallback(async () => {
    dispatch({
      type: "FETCH_TODOS",
    });

    const response = await axios.get("/todos");

    if (response.ok) {
      dispatch({
        type: "FETCH_TODOS_SUCCESS",
        data: response.data,
      });
    } else {
      dispatch({
        type: "FETCH_TODOS_ERROR",
        error: response.data,
      });
    }
  }, []);


    return <Todos context={context} fetchTodos={fetchTodos} />>
};
```

**Without guarding our transitions** we would meet at least two potential bugs here:

1. Maybe the **fetchTodos** has been called twice. This could happen in an application where the todos are being loaded behind a tab. The user instantly switches away from the todos tab and then back again. In this scenario we would fetch and set the todos twice. This could for example cause glitches in the UI related to animations or similar

2. Related to the point above one of the requests might fail. That means you would have a list of todos, but also an error. That would be very confusing to the user, depending on how the UI is implemented

Again, these are exactly the kinds of bugs that are hard to spot and it happens typically due to developers having performant environments and users treating your app like Mr/Ms Potato Head. Luckily for us we have a guard in place for both these scenarios. Let us look at the logic again thinking explicit states:

```ts
// The todos is already being fetched, the reducer is in LOADING state
const fetchTodos = () => (dispatch, getState) => {
  // This dispatch is invalid, meaning absolutely nothing happens
  // in the reducer
  dispatch({
    type: "FETCH_TODOS",
  });

  // We will still do the second fetch, as this is out of
  // control of the reducer
  const response = await axios.get("/todos");

  // Both these dispatches will also be ignored as the reducer is
  // now MOST LIKELY in a LOADED state
  if (response.ok) {
    dispatch({
      type: "FETCH_TODOS_SUCCESS",
      data: response.data,
    });
  } else {
    // See above
    dispatch({
      type: "FETCH_TODOS_ERROR",
      error: response.data,
    });
  }
};
```

We have definitely improved the predictability of our application, but as you can see there is still a problem. If two fetches happens one after the other, we do not have any guarantee of them resolving in the right order. But we do not even want two fetches to happen, maybe we can do something about that?

## Transition effects

Instead of calling our logic imperatively, calling **fetchTodos** as a function, we can rather make it reactive. This way the whole application is controlled by explicit states and our logic outside of reducers are just reactions to those state changes. Let us see how this could look:

```ts
const TodosContainer = () => {
  const [context, dispatch] = useReducer(todosReducer, { state: "NOT_LOADED" });

  useTransitionEffect(context, "LOADING", () => {
    axios.get("/todos").then((response) => {
      if (response.ok) {
        dispatch({
          type: "FETCH_TODOS_SUCCESS",
          data: response.data,
        });
      } else {
        dispatch({
          type: "FETCH_TODOS_ERROR",
          error: response.data,
        });
      }
    });
  });

  return <Todos context={context} dispatch={dispatch} />;
};
```

We have made two improvements to our code:

1. There is no need to create a function to be called to fetch the todos. It has rather become an effect of moving our reducer into the `LOADING` state. That means a dispatch of `FETCH_TODOS` can happen as many times as you want, it will only trigger this effect once

2. We no longer have to pass an explicit function to our nested components. It is all dispatches

Before we start pushing scenarios on this approach, let see how it is implemented:

```ts
export const useTransitionEffect = (context, state, effect) => {
  React.useEffect(() => {
    if (context.state === state) {
      return effect(context);
    }
  }, [context]);
};
```

And with typing:

```ts
export const useTransitionEffect = <
  Context extends { state: string },
  State extends Context["state"]
>(
  context: Context,
  state: State,
  effect: (
    context: Context extends { state: State } ? Context : never
  ) => void | (() => void)
) => {
  React.useEffect(() => {
    if (context.state === state) {
      return effect(context as any);
    }
  }, [context]);
};
```

We basically just put a normal React effect behind a state check. That means you can also return a disposer from the transition effect.

With a few lines of code we were able to:

1. Make our application logic based on explicit states

2. Create a declarative abstraction of how our application moves between these states

3. Guard our application logic from running, when not intended to do so

4. Isolated our effects and made them reactive

5. Reduced the need for explicit imperative logic (calling functions). The application is driven by: `dispatch -> state -> effects -> dispatch`, meaning you pass the dispatcher around instead of callbacks

6. Created a TypeScript friendly abstraction which understands what values are available in what states

Here simplified even more:

```ts
export const transition = (context, action, transitions) =>
  transitions[context.current][action.type]
    ? transitions[context.current][action.type](context, action)
    : context;

export const useTransitionEffect = (context, state, effect) =>
  React.useEffect(
    () => (context.state === state ? effect(context) : undefined),
    [context]
  );
```

## Throwing scenarios at it

### 1. Aborting async logic

Since our **useTransitionEffect** is just an effect, it works the same way:

```ts
useTransitionEffect(context, "TIMER_RUNNING", () => {
  const id = setInterval(() => dispatch({ type: "TICK" }), 1000);

  return () => clearInterval(id);
});
```

### 2. Multiple async items

Imagine we wanted to also save each todo individually. We can not create a reducer for each item. Also we want a single effect to deal with this. Let us first look at the reducer:

```ts
export const todos = (context = { state: "IDLE" }, action) =>
  transition(context, action, {
    IDLE: {
      FETCH_TODOS: () => ({
        state: "PENDING",
      }),
    },
    PENDING: {
      FETCH_TODOS_SUCCESS: (_, { data }) => ({
        state: "READY",
        data,
      }),
      FETCH_TODOS_ERROR: (_, { error }) => ({
        state: "ERROR",
        error: error.message,
      }),
    },
    READY: {
      ADD_TODO: ({ state, data }, { todo }) => ({
        state,
        data: data.concat({
          ...todo,
          id: uuid.v4(),
          state: "NOT_SAVED",
        }),
      }),
      REMOVE_TODO: ({ state, data }, { id }) => ({
        state,
        data: data.filter((todo) => todo.id !== id),
      }),
      SAVE_TODO: ({ state, data }, { id }) => ({
        state,
        data: data.map((todo) =>
          todo.id === id ? { ...todo, state: "SAVING" } : todo
        ),
      }),
      SAVE_TODO_RESOLVED: ({ state, data }, { id, savedTodo }) => ({
        state,
        data: data.map((todo) =>
          todo.id === id ? { ...todo, id: savedTodo.id, state: "SAVED" } : todo
        ),
      }),
      SAVE_TODO_REJECTED: ({ state, data }, { id, error }) => ({
        state,
        data: data.map((todo) =>
          todo.id === id ? { ...todo, state: "ERROR", error } : todo
        ),
      }),
    },
  });
```

We added explicit states to each todo as well. Every time any of these actions are handled we return a new context, but with the same state, `READY`. That means any transition effect looking at `READY` will trigger again. Only thing we need to do is find the unsaved todo and start saving it:

```ts
useTransitionEffect(context, "READY", ({ data }) => {
  const notSavedTodo = data.find((todo) => todo.state === "NOT_SAVED");

  if (notSavedTodo) {
    dispatch({ type: "SAVE_TODO", id: notSavedTodo.id });
    axios
      .post(`/todos`, {
        title: notSavedTodo.title,
        completed: notSavedTodo.completed,
      })
      .then((response) => {
        if (response.ok) {
          dispatch({
            type: "SAVE_TODO_RESOLVED",
            id: notSavedTodo.id,
            savedTodo: response.data,
          });
        } else {
          dispatch({
            type: "SAVE_TODO_REJECTED",
            id: notSavedTodo.id,
            error: response.data,
          });
        }
      });
  }
});
```

You can imagine here having a second `READY` transition effect that would look at `DIRTY` todos, creating a `patch` request on that given todo. This would also introduce a new todo state of `SAVING_DIRTY`. This would happen if you change a todo while it is saving. When the saving is resolved it moves to `DIRTY` instead of `SAVED`, and the `DIRTY` effect will grab it and save it again.

Now, you might have an abstraction over this using some tool, but this example shows the insane complexity we actually should deal with and how we can deal with it using explicit states and transition effects.

### 3. Complex authentication

A typical authentication flow is that you either sign in, sign out or create an account. Maybe you use an auth provider. This shows the complexity of what you should deal with and how all the steps are now guarded.

```ts
export const auth = (context = { state: "UNAUTHENTICATED" }, action) =>
  transition(context, action, {
    UNAUTHENTICATED: {
      AUTHENTICATE: (_, { provider }) => ({
        state: "AUTHENTICATING",
        provider,
      }),
    },
    AUTHENTICATING: {
      REQUIRE_SIGN_UP: () => ({
        state: "SIGN_UP_REQUIRED",
      }),
      AUTHENTICATE_RESOLVED: ({ provider }, { user }) => ({
        state: "AUTHENTICATED",
        user,
        provider,
      }),
      AUTHENTICATE_REJECTED: (_, { error }) => ({
        state: "AUTHENTICATING_ERROR",
        error,
      }),
    },
    AUTHENTICATING_ERROR: {
      AUTHENTICATE: (_, { provider }) => ({
        state: "AUTHENTICATING",
        provider,
      }),
    },
    AUTHENTICATED: {
      UNAUTHENTICATE: ({ provider }) => ({
        state: "UNAUTHENTICATING",
        provider,
      }),
    },
    UNAUTHENTICATING: {
      UNAUTHENTICATE_RESOLVED: () => ({
        state: "UNAUTHENTICATED",
      }),
      UNAUTHENTICATE_REJECTED: (_, { error }) => ({
        state: "UNAUTHENTICATING_ERROR",
        error,
      }),
    },
    UNAUTHENTICATING_ERROR: {
      UNAUTHENTICATE: () => ({
        state: "UNAUTHENTICATING",
      }),
    },
    SIGN_UP_REQUIRED: {
      SIGN_UP: (_, { credentials, provider }) => ({
        state: "SIGNING_UP",
        credentials,
        provider,
      }),
    },
    SIGNING_UP: {
      SIGN_UP_RESOLVED: (_, { user }) => ({
        state: "AUTHENTICATED",
        user,
      }),
      SIGN_UP_REJECTED: (_, { error }) => ({
        state: "SIGNING_UP_ERROR",
        error,
      }),
    },
    SIGNING_UP_ERROR: {
      SIGN_UP: (_, { credentials }) => ({
        state: "SIGNING_UP",
        credentials,
      }),
    },
  });
```

The transition effects would be something like:

```ts
useTransitionEffect(context, "AUTHENTICATING", ({ provider }) => {
  if (provider === "google") {
    googleAuthProvider.authenticate().then((response) => {
      if (response.ok) {
        dispatch({
          type: "AUTHENTICATE_RESOLVED",
          user: response.user,
        });
      } else {
        dispatch({
          type: "AUTHENTICATE_REJECTED",
          error: response.error,
        });
      }
    });
  }
});

useTransitionEffect(context, "UNAUTHENTICATING", ({ provider }) => {
  if (provider === "google") {
    googleAuthProvider.signout().then((response) => {
      if (response.ok) {
        dispatch({
          type: "UNAUTHENTICATE_RESOLVED",
        });
      } else {
        dispatch({
          type: "UNAUTHENTICATE_REJECTED",
          error: response.error,
        });
      }
    });
  }
});

useTransitionEffect(context, "SIGNING_UP", ({ credentials, provider }) => {
  if (provider === "google") {
    googleAuthProvider.signup(credentials).then((response) => {
      if (response.ok) {
        dispatch({
          type: "SIGN_UP_RESOLVED",
          user: response.user,
        });
      } else {
        dispatch({
          type: "SIGN_UP_REJECTED",
          error: response.error,
        });
      }
    });
  }
});
```

We have all experienced broken authentication flows and it is because they are way more complex than we imagine. Explicit states and transition effects gives you tools to discover and manage that complexity. And all the way TypeScript helps us with what states we have and what values are available on each state.

## Using Immer

Another benefit of this approach is that it is easier to understand where [Immer](https://immerjs.github.io/immer/docs/introduction) helps you and where it does not. In this concept you can just ask yourself the question: "Do we transition to a new state?". If you are **NOT** transitioning to a new state, it means you are manipulating existing state, which means Immer is a good fit. Let us look at our todos reducer again using Immer:

```ts
export const todos = (context = { state: "IDLE" }, action) =>
  transition(context, action, {
    IDLE: {
      FETCH_TODOS: () => ({
        state: "PENDING",
      }),
    },
    PENDING: {
      FETCH_TODOS_SUCCESS: (_, { data }) => ({
        state: "READY",
        data,
      }),
      FETCH_TODOS_ERROR: (_, { error }) => ({
        state: "ERROR",
        error: error.message,
      }),
    },
    READY: {
      ADD_TODO: produce((draft, { todo }) => {
        draft.data.push({
          ...todo,
          id: uuid.v4(),
          state: "NOT_SAVED",
        });
      }),
      REMOVE_TODO: produce((draft, { id }) => {
        const index = draft.data.findIndex((todo) => todo.id === id);
        draft.data.splice(index, 1);
      }),
      SAVE_TODO: produce((draft, { id }) => {
        const todo = draft.data.find((todo) => todo.id === id);
        todo.state = "SAVING";
      }),
      SAVE_TODO_RESOLVED: produce((draft, { id, savedTodo }) => {
        const todo = draft.data.find((todo) => todo.id === id);
        todo.id = savedTodo.id;
        todo.state = "SAVED";
      }),
      SAVE_TODO_REJECTED: produce((draft, { id, error }) => {
        const todo = draft.data.find((todo) => todo.id === id);
        todo.state = "ERROR";
        todo.error = error;
      }),
    },
  });
```

## Conclusion

The point of this article is to, more than anything, make you aware of where bugs can occur. The combination of near synchronous behaviour of asynchronous code in our development environment and our users rarely follows our intended path, is in my experience the main reason for bugs in our apps.

The concept of explicit states and transitions helps us to a large degree avoid this. In addition it improves the typing experience of our applications by creating a typed context for each state. In addition the user is no longer in charge of driving the effects of our application, putting functions with logic directly on the points of interaction. Instead only a dispatch is allowed and our guarded reducer produces an explicit state, which our effects can react to. `dispatch -> explicit state -> effect -> dispatch`.

If you never use this concept I hope it has given you some insight and reflection :-) If you want to look at the running code, take a look at the [following sandbox](https://codesandbox.io/s/runtime-dust-41zxq?file=/src/features/Auth.tsx). It also contains another way to take advantage of these explicit states, rendering dynamic content!
