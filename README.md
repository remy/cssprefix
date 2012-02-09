# CSS Prefix

Plan to build a service for developer to submit a site to that will:

1. Plug in the missing CSS vendor prefixes
2. Give a simple yes or no as to whether it's got all the appropriate fallback CSS properties
3. Provide a simple API for external tools to use

# Intended use

First as a red light/green light app with the ability to download updated CSS. For example:

> http://cssprefix.com/http://remysharp.com

This would return a simple page - with an indicator of whether they're not using an fallback CSS properties.

Also available for plugins to use - with the intention that a developer can use a simple plugin (for firebug, chrome extension, etc):

> http://cssprefix.com/check.json?http://remysharp.com

Returns:

```js
{ pass: true }
```

Or if fails:

```js
{ pass: false, detail: [ /* here be properties that fail */ ]}
```

Extension could then show a bleemin' great RED FAIL icon, or happy face green unicorn riding a tickmark (or something).

# Tasks

- Process the parsing of markup without blocking further requests (probably using cluster in Node)
- Parse HTML, CSS, @imports, etc to find all CSS embedded in document (note: [I've done this before](https://github.com/remy/inliner))
- Parse CSS to process properties used (either's Zakas' [CSS lint]() parser or  [Lea Verou's -prefix-free](http://leaverou.github.com/prefixfree/) might have this already)
- Have a converter library to go from CSS property to all fallbacks required. *Question* maybe this could also use a minimum browser support flag - such as supporting IE8 would require filters for opacity...maybe not worth it?


# Tool integration

Ideas how to get this baked in to developer's workflow:

1. TextMate commands
2. Other editor commands (I'm not a TextMate user - I know, weird, right!?)
3. Browser extensions (as mentioned above)
4. Others?



