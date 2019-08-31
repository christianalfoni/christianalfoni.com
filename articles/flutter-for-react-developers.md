[Flutter](https://flutter.dev) is a relatively new framework from Google. It allows you to write one codebase which runs on both **iOS** and **Android**. There are other solutions for this. For example Microsofts [Xamarin Forms](https://docs.microsoft.com/en-us/xamarin/xamarin-forms/) or [React Native](https://facebook.github.io/react-native/). Both of these solutions has their own sets of benefits and drawbacks.

Coming from the world of web development Xamarin Forms is just way too foreign in terms of syntax and how you think about developing applications. React Native is much closer to how you think about developing apps as a web developer, but it has more technical issues related to architecture and performance.

Flutter is this framework in between the two. It takes direct inspiration from [React](https://reactjs.org/). It also takes inspiration from the styling primitives we have on the web. For example [flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/). In my opinion this is the best of both worlds. So let us just dive right into it!

## Thinking Widgets

Let us create a simple example. We are going to use React, but we are going to think widgets, which basically is components in Flutter.

If you were to define a header component in React it might looks something like this:

```tsx
function MyHeader({ children }) {
  return <h1 className="my-header">{children}</h1>;
}
```

There are three things we have to leave behind when thinking flutter widgets:

1. **JSX**: Flutter is written in [Dart](https://dart.dev/). It has no JSX syntax
2. **CSS**: Flutter has no CSS, you will style your widgets much like inline styles
3. **FUNCTIONS**: Flutter widgets are defined as a class, not a function
4. **PROPS**: Flutter widgets does not have props. Being classes they have constructor arguments

So let us now take this step by step. First let us leave **JSX** behind:

```tsx
function MyHeader({ children }) {
  return Text(children, { className="my-header" })
}
```

There are no semantics like *div*, *h1* etc. in Flutter, there are only widgets. So **Text** is a built in widget in Flutter. Now lets us move on and leave **CSS** behind:

```tsx
function MyHeader({ children }) {
  return Text(children, {
    style: TextStyle({
      fontSize: 22,
      fontWeight: FontWeight.bold
    })
  })
}
```

As there is no stylesheets in Flutter you will be inlining all your styles. What is important to remember is that we are no longer on the web. Stylesheets where created for the web, we do not need them in Flutter. And now let us properly define it in Dart code with a class:

```dart
class MyHeader extends StatelessWidget {
  String title;
  
  MyHeader(this.title);

  @override
  build(context) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 22.0,
        fontWeight: FontWeight.bold
      )
    )
  }
}
```

This is certainly more syntax than what we are used to on the web. That is our cue to start talking about the benefits.

## The benefits

Especially compared to React and JavaScript there has to be some major benefits to overcome this syntax:



If you have any experience with [Typescript](https://www.typescriptlang.org/), moving over to Dart will be a breeze. 