A Solution: jjsml
=================
The solution that jjsml (jjsml = jjs module loader) proposes is to abstain 
from using plain, direct calls to `load()`.
Instead, the jjsml provides a global `define()` function that keeps track of the location 
of the currently loaded script.

The `define()` function handles loading using both absolute and relative paths. 
Relative paths are always resolved relative to the location of the script that calls `define()`;

In order to make this work, the `jjsml.js` script must be the only script that is run directly by jjs.
The jjsml.js script is located at src/jjsml/jjsml.js
Assuming the working directory is one of our example directories, we could run jjsml.js like this: 

    jjs -scripting ../../src/jjsml/jjsml.js
    
Obviously, this is not very useful since jjsml.js only creates a `define()` function. 

To actually run user code, jjsml.js must be aware of the entry point for user code - 
an intial, user-provided script that is loaded and which provides the actual functionality, 
possibly by loading other user-provided scripts.

Currently the only supported way to control the entry point is by passing it in via the
`jjsml.main.module` System property. So suppose we'd like to run myScript.js from example1 
with jjsml.js, we could do:

    jjs -scripting -Djjsml.main.module=myScript.js ../../src/jjsml/jjsml.js

This should work and return exactly the same output as we got when we initally ran example1:
    
    Hello, jjs!

Note that the relative path `myScript.js` is resolved against the current working directory.
So, if we again would move one directory up to the `examples` directory, we'd get:

    jjs -scripting -Djjsml.main.module=example1/myScript.js ../src/jjsml/jjsml.js

You might be disappointed to see that this still leads to an error:

file:/C:/roland/projects/jjsutils/examples/example1/myScript.js:1 
TypeError: Cannot load script from myOtherScript.js

However disappointing, this should not surprise us, since `example1/myScript.js` still uses
a plain call to `load()` to acquire `myOtherScript.js`. In order to actually benefit from
jjsml, we need to actually use the `define()` function to load `myOtherScript.js`.

So, rather than 

    load("myOtherScript.js");

the contents of `myScript.js` should really be:

    define("myOtherScript.js");
    
In the example2 directory contains a modified version of the script to reflect this change. 
So if we run the scripts from the example2 directory instead, like so:

    jjs -scripting -Djjsml.main.module=example2/myScript.js ../src/jjsml/jjsml.js

It should work exactly the way we want:

    Hello, jjs!

Pros and Cons of jjsml
======================
Obviously, the solution did not come for free: if we want to use jjsml we have to change 
1) the way we write our scripts, since we have to use `define()` instead of `load()`
2) the way we run our scripts command line, since we have to define a single entry point 
and pass that via a System property.

These design choices require some justification and some reflection.

First of all, we should realize that we could have taken an alternative approach - 
for example, we could simply have written a script that only "fixes" the built-in `load()` method. 
In that case, the only thing we then would have had to do was to make sure 
to always first pass our fix script to jss, before any user scripts:

    jjs -scripting /usr/bin/share/scripts/fixjjsload.js myScript.js
    
Such a solution would involved overwriting the global `load()` method with our own version.
While this is certainly a possibility, it would make it very hard to predict the behavior
of scripts that rely on the default, built-in implementation of `load()`.

All in all I felt that this was not the right appproach.

Instead I felt it would be more useful to provide a more general solution for loading code
and managing dependencies. To do that I was inspired by the javascript module pattern and 
module loading solutions such as CommonJS module loading and AMD modules.

jjsml's `define()` is more than a better `load()`
=================================================
While `define()` can be used as an alternative to `load()` (but, as was pointed out before, 
with support for true relative paths), it is actually a javascript module loader.

The recommended way to use jjsml and `define()` is to consistently employ the javascript module
pattern, and to use `define()` to actually define the module. A typical script would look like:

    (function(exports){
    
        ...private intialization code...
    
        return define(
          ...dependencies...,
          ...module definition callback...
        );
    
    })(this); 
    
So, the script itself is actually a single anonymous function, that is immediately called.
The purpose of this design is to establish a new scope that can be used to define any private 
variables and/or functions. 

The function gets passed the `this` value, which typically point to the global scope. 
To the function body, that is made available through the `exports` formal argument, 
and the module can use this to interact with the global scope. 
This is mainly useful in case the module wants to create new globals.
This should rarely be needed, but this is how it would be done.

The function should return a value (typically either an object or a function) that forms the 
interface to the functionality provided by the module.