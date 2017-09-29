# Danny
A peer-to-peer interactive-media tool, inspired by HyperCard, for Beaker/Dat Web APIs

## What it is
Danny is a thing that creates stacks, the only real way to describe the genre of software started by [HyperCard](https://hypercard.org/). Stacks are made of cards, which can share one or more backgrounds. Put text and graphics on cards, plus interactive elements and fields. Fields in the background can have different values per card, making stacks potentially a bit databasey. A stack is a simple form of interactive media, and Danny is a simple tool for making stacks.

Danny is not a HyperCard clone; Danny does not read or import HyperCard stacks themselves, nor the file formats of other stack editors. Danny stacks are different in some important ways:

**No drawing tools.** When HyperCard was conceived in 1986, it took high-end, exotic technology to run two different applications at the same time on a good consumer OS. Now that it's more possible, the advantages of app specialization are such that it would be foolish not to do it. You'll just have to save web-format image files out of really good special-purpose image-creation tools, and drag them in to upload them. (You may find that most of your graphical needs, though, can be fulfilled by Elements, which may function as buttons, static text fields, fat or skinny boxes of solid color, or all of the above. They're the basic building block of Danny stacks.)

**No scripting.** Danny has a small but potentially quite productive set of assignable behaviors in a menu-driven system that isn't programming, but may remind you of it. We could have just let you write JavaScript, but A) that opens up trolling vectors, and B) if you can write JavaScript, well, you can already just write an app. There's no capacity for user JS code Danny can create that's *better* than just not using Danny and writing your own code.

**Made of Web parts.** For instance, it may be helpful to know some of the formats of common CSS expressions, such as `200px` and `1.6rem`, to get things looking the way you want (especially since resizing things with the mouse is still kinda janky). There is a stack stylesheet in which you can define classes and then put them on almost anything. Due to the security constraints of Dat websites, YouTube embeds and the like are not currently possible. But animated GIFs go a long way...

## TODO
Any kind of UI polish

Search (not a great look for a consumer database tool not to have this already, but doing it right is a good chunk of work and I wanted to get this out there. I'm not expecting that anyone will create anything with hundreds of cards for a while yet)

Multiuser (we're going to get stacks with cards sourced from multiple URLs to happen, but we need to do it carefully as well as usefully)

Further out, there'll be some objects that will enable more flexible layouts, and some ways to take in other external data sources. (Also better text editing, more field options, blah blah etc.)

## How to use
Maybe avoid it still? But you can fork from `dat://danny-misuba.hashbase.io/`. (The only web browser at the moment that supports the Dat protocol is [Beaker](https://beakerbrowser.com/). If that changes I will for sure let you know.) If you fire it up yourself, the Alt key is your friend: alt-left and right arrow keys move between cards, alt-enter brings up edit mode, and alt-click is a short cut to editing elements. There is a (barely) more extensive tutorial at `dat://danny-tutorial-misuba.hashbase.io/`.

## Danny?
Danny is named for [Danny Goodman](https://dannyg.com/), who set me on the path to doing this twice - the second time with his still-in-print *JavaScript Bible*. Thank you!

## License
MPL 2
